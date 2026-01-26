import { NextRequest, NextResponse } from 'next/server'
import { testEmailConnection } from '@/lib/email'

export async function GET(_req: NextRequest) {
  try {
    const result = await testEmailConnection()
    return NextResponse.json(
      {
        success: true,
        message: `Email configuration successful! Using ${result.provider === 'graph' ? 'Microsoft Graph API (Entra ID)' : 'SMTP'}.`,
        provider: result.provider,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Email test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Email connection failed',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
