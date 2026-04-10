/**
 * Xero API integration for GymHub billing.
 *
 * Handles OAuth 2.0 token management, contact creation, and recurring invoice
 * template creation via the Xero API.
 *
 * Required environment variables:
 *   XERO_CLIENT_ID       – OAuth 2.0 client ID from Xero developer portal
 *   XERO_CLIENT_SECRET   – OAuth 2.0 client secret
 *   XERO_REDIRECT_URI    – Redirect URI registered in the Xero app (e.g. https://gymhub.club/api/xero/callback)
 *   XERO_TENANT_ID       – Xero organisation tenant ID (ICB Solutions Pty Ltd)
 *
 * Token storage (access / refresh) is kept in the XeroToken table so that any
 * server instance can read the current token without shared-memory.
 */

import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize'
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0'

function getXeroConfig() {
  const clientId = process.env.XERO_CLIENT_ID
  const clientSecret = process.env.XERO_CLIENT_SECRET
  const redirectUri = process.env.XERO_REDIRECT_URI
  const tenantId = process.env.XERO_TENANT_ID

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Xero configuration is incomplete. Set XERO_CLIENT_ID, XERO_CLIENT_SECRET and XERO_REDIRECT_URI.'
    )
  }
  return { clientId, clientSecret, redirectUri, tenantId: tenantId || '' }
}

function requireTenantId(): string {
  const tenantId = process.env.XERO_TENANT_ID
  if (!tenantId) {
    throw new Error(
      'XERO_TENANT_ID is not set. Complete the OAuth flow and call GET /api/xero/connections to find it.'
    )
  }
  return tenantId
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Build the Xero authorization URL that the admin user should be redirected to.
 */
export function getXeroAuthUrl(stateToken: string): string {
  const { clientId, redirectUri } = getXeroConfig()
  const scopes = [
    'openid',
    'profile',
    'email',
    'accounting.contacts',
    'accounting.transactions',
    'offline_access',
  ].join(' ')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: stateToken,
  })

  return `${XERO_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange an authorization code for an access + refresh token pair.
 */
export async function exchangeCodeForTokens(code: string) {
  const { clientId, clientSecret, redirectUri } = getXeroConfig()

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero token exchange failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  await storeTokens(data)
  return data
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
async function refreshAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getXeroConfig()

  const stored = await prisma.xeroToken.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!stored?.refreshToken) {
    throw new Error('No Xero refresh token stored. Please re-authorize via /api/xero/connect.')
  }

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero token refresh failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  await storeTokens(data)
  return data.access_token as string
}

/**
 * Persist tokens to the database.
 */
async function storeTokens(data: {
  access_token: string
  refresh_token: string
  expires_in: number
}) {
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  const existing = await prisma.xeroToken.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (existing) {
    await prisma.xeroToken.update({
      where: { id: existing.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      },
    })
  } else {
    await prisma.xeroToken.create({
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      },
    })
  }
}

/**
 * Get a valid access token, refreshing automatically if expired.
 */
async function getAccessToken(): Promise<string> {
  const stored = await prisma.xeroToken.findFirst({ orderBy: { updatedAt: 'desc' } })

  if (!stored) {
    throw new Error('Xero is not connected. Please authorize via /api/xero/connect.')
  }

  // Refresh if token expires within 2 minutes
  if (stored.expiresAt.getTime() - Date.now() < 2 * 60 * 1000) {
    return refreshAccessToken()
  }

  return stored.accessToken
}

/**
 * Check whether a valid Xero token exists.
 */
export async function isXeroConnected(): Promise<boolean> {
  try {
    const stored = await prisma.xeroToken.findFirst({ orderBy: { updatedAt: 'desc' } })
    return !!stored?.accessToken
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Xero API helpers
// ---------------------------------------------------------------------------

async function xeroRequest(path: string, method: string, body?: unknown) {
  const token = await getAccessToken()
  const tenantId = requireTenantId()

  const res = await fetch(`${XERO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero API ${method} ${path} failed (${res.status}): ${text}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Business operations
// ---------------------------------------------------------------------------

interface CreateContactParams {
  clubName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  abn?: string | null
  address?: string
  city?: string
  state?: string
  postalCode?: string
}

/**
 * Create a new Contact in Xero and return the Xero ContactID.
 */
export async function createXeroContact(params: CreateContactParams): Promise<string> {
  const nameParts = params.clubName
  const addresses = params.address
    ? [
        {
          AddressType: 'POBOX',
          AddressLine1: params.address,
          City: params.city || '',
          Region: params.state || '',
          PostalCode: params.postalCode || '',
          Country: 'Australia',
        },
      ]
    : []

  const contact: Record<string, unknown> = {
    Name: nameParts,
    FirstName: params.firstName,
    LastName: params.lastName,
    EmailAddress: params.email,
    Phones: [{ PhoneType: 'DEFAULT', PhoneNumber: params.phone }],
    Addresses: addresses,
  }

  if (params.abn) {
    contact.TaxNumber = params.abn
  }

  const data = await xeroRequest('/Contacts', 'POST', { Contacts: [contact] })
  const contactId = data?.Contacts?.[0]?.ContactID

  if (!contactId) {
    throw new Error('Xero contact creation did not return a ContactID')
  }

  return contactId as string
}

interface CreateRecurringInvoiceParams {
  xeroContactId: string
  clubName: string
  monthlyRateAud: number
  trialEndsAt: Date
}

/**
 * Create a DRAFT repeating invoice template in Xero.
 *
 * The first invoice will be scheduled for the day after the trial ends.
 * The account code is 210 (ICSCORE Income).
 */
export async function createXeroRecurringInvoice(
  params: CreateRecurringInvoiceParams
): Promise<string> {
  const startDate = new Date(params.trialEndsAt)
  startDate.setDate(startDate.getDate() + 1) // first invoice day after trial

  const repeatingInvoice = {
    Type: 'ACCREC', // Accounts Receivable
    Contact: { ContactID: params.xeroContactId },
    Schedule: {
      Period: 1,
      Unit: 'MONTHLY',
      DueDate: 20, // due 20 days after invoice date
      DueDateType: 'AFTERINVOICEDATE',
      StartDate: formatXeroDate(startDate),
    },
    LineItems: [
      {
        Description: `GymHub Monthly Subscription – ${params.clubName}`,
        Quantity: 1,
        UnitAmount: params.monthlyRateAud,
        AccountCode: '210',
        TaxType: 'OUTPUT', // GST-inclusive
      },
    ],
    Status: 'DRAFT',
    Reference: `GYMHUB-${params.clubName.replace(/\s+/g, '-').toUpperCase().slice(0, 30)}`,
  }

  const data = await xeroRequest('/RepeatingInvoices', 'PUT', {
    RepeatingInvoices: [repeatingInvoice],
  })

  const invoiceId = data?.RepeatingInvoices?.[0]?.RepeatingInvoiceID

  if (!invoiceId) {
    throw new Error('Xero repeating invoice creation did not return an ID')
  }

  return invoiceId as string
}

function formatXeroDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
