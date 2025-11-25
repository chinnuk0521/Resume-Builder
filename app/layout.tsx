import type { Metadata } from 'next'
import './globals.css'
import 'react-quill/dist/quill.snow.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Resume Rewriter - ATS Optimizer',
  description: 'Transform your resume into an ATS-friendly format',
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
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

