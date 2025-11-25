'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { generatePDF } from '@/utils/pdfGenerator'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface ResumeEditorProps {
  content: string
  onUpdate: (text: string) => void
  isProcessing: boolean
}

export default function ResumeEditor({ content, onUpdate, isProcessing }: ResumeEditorProps) {
  const [editorContent, setEditorContent] = useState(content)

  useEffect(() => {
    setEditorContent(content)
  }, [content])

  const handleChange = (value: string) => {
    setEditorContent(value)
    onUpdate(value)
  }

  const stripHtml = (html: string): string => {
    // Create a temporary div element
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    
    // Convert HTML to plain text, preserving line breaks
    let text = tmp.textContent || tmp.innerText || ''
    
    // Replace multiple spaces with single space
    text = text.replace(/\s+/g, ' ')
    
    // Replace HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    
    // Split by line breaks and clean up
    const lines = text.split(/\n|\r/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    return lines.join('\n')
  }

  const handleDownload = async () => {
    if (!editorContent.trim()) {
      alert('Please wait for the resume to be generated or add some content')
      return
    }

    try {
      // Convert HTML to plain text
      const plainText = stripHtml(editorContent)
      
      // Validate text length
      if (plainText.length < 50) {
        alert('Resume content is too short. Please ensure you have sufficient content.')
        return
      }
      
      // Add timeout for PDF generation (30 seconds)
      const pdfPromise = generatePDF(plainText)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF generation timeout')), 30000)
      )
      
      await Promise.race([pdfPromise, timeoutPromise])
    } catch (error: any) {
      console.error('[ResumeEditor] PDF generation error:', error)
      const errorMessage = error.message?.includes('timeout') 
        ? 'PDF generation took too long. Please try again or reduce the resume content.'
        : 'Failed to generate PDF. Please try again.'
      alert(errorMessage)
    }
  }

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ],
  }

  return (
    <div className="border-2 border-gray-300 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Edited Resume</h2>
        <button
          onClick={handleDownload}
          disabled={!editorContent.trim() || isProcessing}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed outline-none"
        >
          Download PDF
        </button>
      </div>
      
      {isProcessing ? (
        <div className="h-96 flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
          <p className="text-gray-600">Processing resume...</p>
        </div>
      ) : editorContent ? (
        <ReactQuill
          theme="snow"
          value={editorContent}
          onChange={handleChange}
          modules={modules}
          className="bg-white"
          style={{ height: '500px' }}
        />
      ) : (
        <div className="h-96 flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
          <p className="text-gray-600">Upload a resume and provide a job description to get started</p>
        </div>
      )}
    </div>
  )
}

