import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { ConfirmProvider } from '@/components/ConfirmProvider'
import { AuthProvider } from '@/components/AuthProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'GymHub - Gymnastics Club Management Platform',
  description: 'Complete management solutions for Australian gymnastics clubs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ConfirmProvider>
            {children}
            <Toaster
              position="top-right"
              gutter={8}
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  maxWidth: '420px',
                },
                success: {
                  duration: 3000,
                  iconTheme: { primary: '#16a34a', secondary: '#ffffff' },
                  style: { borderLeft: '4px solid #16a34a' },
                },
                error: {
                  duration: 4000,
                  iconTheme: { primary: '#dc2626', secondary: '#ffffff' },
                  style: { borderLeft: '4px solid #dc2626' },
                },
                loading: {
                  style: { borderLeft: '4px solid #2563eb' },
                },
              }}
            />
          </ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
