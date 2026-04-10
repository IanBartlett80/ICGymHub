import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/apiAuth'
import { getXeroAuthUrl, isXeroConnected } from '@/lib/xero'
import crypto from 'crypto'

/**
 * GET /api/xero/connect
 *
 * Initiates the Xero OAuth 2.0 flow. Only accessible to ADMIN users.
 * Returns the authorization URL that the frontend should redirect to.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (auth.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can connect Xero' }, { status: 403 })
    }

    const connected = await isXeroConnected()

    // Generate a CSRF state token
    const stateToken = crypto.randomBytes(24).toString('hex')

    const authUrl = getXeroAuthUrl(stateToken)

    return NextResponse.json({
      authUrl,
      state: stateToken,
      alreadyConnected: connected,
    })
  } catch (error: any) {
    console.error('Xero connect error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Xero connection' },
      { status: 500 }
    )
  }
}
