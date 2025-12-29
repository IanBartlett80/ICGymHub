import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IC GymHub - Gymnastics Club Management Platform',
  description: 'Complete management solutions for Australian gymnastics clubs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
