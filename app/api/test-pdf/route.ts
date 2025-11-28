import { NextRequest, NextResponse } from 'next/server'
import { generatePDF } from '@/utils/pdfGenerator'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * Test API route to generate a PDF with sample data
 * Access: GET /api/test-pdf
 */
export async function GET(request: NextRequest) {
  try {
    // Sample resume data matching the exact format from the PDF
    const testResumeText = `CHANDU KALLURU

chandu.kalluru@outlook.com | +918179299096 | LinkedIn | Portfolio | GitHub

PROFESSIONAL SUMMARY

Software engineer with 2+ years of experience in full-stack development, data analytics, and blockchain technologies. Skilled in building scalable web applications, RESTful APIs, and interactive dashboards. Experienced in React, Python, SQL, and Power BI, with proven success in designing ETL pipelines, delivering analytics solutions, and implementing smart contracts. Adept at collaborating with cross-functional teams, applying Agile and Test-Driven Development (TDD) practices, and driving projects from concept to deployment. Passionate about leveraging modern technologies to deliver high-impact software solutions for businesses.

EDUCATION

| Yogi Vemana University | Proddatur, India |
2019–2023
Bachelor of Technology in Computer Science & Engineering

WORK EXPERIENCE

| Project Associate | 2025–2025
INDIAN INSTITUTE OF TECHNOLOGY, MADRAS
• Lead research on Blockchain Technology and Distributed Ledger Technologies (DLTs)
• Developed a proof-of-concept decentralized e-voting application using WebAssembly and WIDL
• Design and deploy Smart Contracts for enterprise use cases with a focus on security and efficiency
• Collaborate with cross-functional teams to develop innovative blockchain solutions
• Mentored 4 interns working on blockchain research projects and implementation
`

    console.log('[Test PDF] Generating PDF with sample data...')
    const blob = await generatePDF(testResumeText)
    
    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log('[Test PDF] PDF generated successfully, size:', buffer.length, 'bytes')
    
    // Return PDF as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test-resume-format.pdf"',
        'Content-Length': buffer.length.toString(),
      },
    })
    
  } catch (error: any) {
    console.error('[Test PDF] Error:', error.message)
    console.error('[Test PDF] Stack:', error.stack)
    
    return NextResponse.json(
      { 
        error: 'Failed to generate test PDF',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

