import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/apiAuth'
import { isXeroConnected } from '@/lib/xero'

/**
 * GET /api/xero/status
 *
 * Returns whether Xero is currently connected (has valid tokens).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req)
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connected = await isXeroConnected()
    return NextResponse.json({ connected })
  } catch (error: any) {
    console.error('Xero status error:', error)
    return NextResponse.json({ connected: false })
  }
}
