import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/xero'

/**
 * GET /api/xero/callback
 *
 * Xero OAuth 2.0 callback handler. Xero redirects here after the admin
 * authorizes the application. Exchanges the code for tokens and stores them.
 */
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const error = req.nextUrl.searchParams.get('error')

    if (error) {
      console.error('Xero OAuth error:', error)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      return NextResponse.redirect(
        `${appUrl}/dashboard/admin-config?xero=error&message=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 })
    }

    await exchangeCodeForTokens(code)

    // If XERO_TENANT_ID is not yet set, redirect to connections discovery page
    const tenantId = process.env.XERO_TENANT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    if (!tenantId) {
      return NextResponse.redirect(`${appUrl}/dashboard/admin-config?xero=connected&setup=tenant`)
    }
    return NextResponse.redirect(`${appUrl}/dashboard/admin-config?xero=connected`)
  } catch (error: any) {
    console.error('Xero callback error:', error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    return NextResponse.redirect(
      `${appUrl}/dashboard/admin-config?xero=error&message=${encodeURIComponent(error.message || 'Token exchange failed')}`
    )
  }
}
