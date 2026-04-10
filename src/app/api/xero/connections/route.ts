import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/apiAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/xero/connections
 *
 * Temporary endpoint to discover your Xero Tenant ID.
 * After completing the OAuth flow, this calls Xero's /connections
 * endpoint and returns all connected organisations with their tenant IDs.
 *
 * Remove this endpoint once you've recorded your XERO_TENANT_ID.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    // Get stored token
    const stored = await prisma.xeroToken.findFirst({ orderBy: { updatedAt: 'desc' } })
    if (!stored?.accessToken) {
      return NextResponse.json(
        {
          error: 'No Xero token found. Complete the OAuth flow first.',
          steps: [
            '1. GET /api/xero/connect — returns an authUrl',
            '2. Open that authUrl in your browser and authorize',
            '3. After redirect, come back here to GET /api/xero/connections',
          ],
        },
        { status: 400 }
      )
    }

    const res = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${stored.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: `Xero connections API failed (${res.status})`, details: text },
        { status: 502 }
      )
    }

    const connections = await res.json()

    return NextResponse.json({
      message: 'Copy the tenantId for your organisation and set it as XERO_TENANT_ID in your environment variables.',
      connections,
    })
  } catch (error: any) {
    console.error('Xero connections error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
