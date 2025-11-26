import type { Metadata } from 'next'
import './globals.css'
import 'react-quill/dist/quill.snow.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Resume Builder - Professional ATS-Optimized Resumes',
  description: 'Build professional, ATS-optimized resumes that get you noticed',
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

