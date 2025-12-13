'use client'

import { useState } from 'react'
import { generatePDF, downloadPDF, previewPDF } from '@/utils/pdfGenerator'

export default function TestPDFPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState('')

  // Sample resume data matching ATS-friendly format
  const testResumeText = `YOUR FULL NAME

Phone | Email | LinkedIn | Portfolio

SUMMARY

Software engineer with 2+ years of experience in full-stack development, data analytics, and blockchain technologies. Skilled in building scalable web applications, RESTful APIs, and interactive dashboards.

SKILLS

• Programming: React, Python, JavaScript, TypeScript
• Tools: Power BI, SQL, Git, Docker
• Databases: PostgreSQL, MongoDB, MySQL
• Cloud: AWS, Azure, GCP

EXPERIENCE

Project Associate — 2025 – 2025
INDIAN INSTITUTE OF TECHNOLOGY, MADRAS
• Lead research on Blockchain Technology and Distributed Ledger Technologies (DLTs)
• Developed a proof-of-concept decentralized e-voting application using WebAssembly and WIDL
• Design and deploy Smart Contracts for enterprise use cases with a focus on security and efficiency
• Collaborate with cross-functional teams to develop innovative blockchain solutions
• Mentored 4 interns working on blockchain research projects and implementation

EDUCATION

Bachelor of Technology in Computer Science & Engineering — 2019 – 2023
Yogi Vemana University
Proddatur, India
`

  const handleGenerate = async () => {
    setIsGenerating(true)
    setStatus('Generating PDF...')
    
    try {
      await generatePDF(testResumeText)
      setStatus('✅ PDF generated successfully!')
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
      console.error('PDF Generation Error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreview = async () => {
    setIsGenerating(true)
    setStatus('Generating PDF preview...')
    
    try {
      await previewPDF(testResumeText)
      setStatus('✅ PDF preview opened!')
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
      console.error('PDF Preview Error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    setIsGenerating(true)
    setStatus('Generating and downloading PDF...')
    
    try {
      await downloadPDF(testResumeText)
      setStatus('✅ PDF downloaded successfully!')
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`)
      console.error('PDF Download Error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">PDF Generation Test</h1>
          <p className="text-gray-600 mb-6">
            This page tests the PDF generation with sample data matching your resume format.
          </p>

          {status && (
            <div className={`mb-4 p-3 rounded-lg ${
              status.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {status}
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <button
              onClick={handlePreview}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isGenerating ? 'Generating...' : 'Preview PDF'}
            </button>
            
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Sample Resume Text:</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm text-gray-800 max-h-96">
              {testResumeText}
            </pre>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">ATS-Friendly Format Specifications:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Name: Centered, 19pt, uppercase, bold</li>
              <li>Contact: Centered with pipes, 10.5pt</li>
              <li>Section Headers: Left-aligned, 11.5pt, bold, ALL CAPS</li>
              <li>Experience: Job Title — Start – End (dates right-aligned)</li>
              <li>Company Names: Uppercase, bold, on next line</li>
              <li>Education: Degree — Start – End (dates right-aligned)</li>
              <li>Bullet points: 5mm indent, proper hanging indent</li>
              <li>Margins: 18mm top/bottom, 15mm left/right</li>
              <li>Line spacing: 1.1 (10.5pt font = 11.55pt line height)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

