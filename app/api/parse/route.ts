import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import { parsePDFText } from '@/utils/pdfParser'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const PARSE_TIMEOUT = 15000 // 15 seconds
const MAX_RESUME_LENGTH = 50000 // 50KB of text

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse form data with error handling
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error: any) {
      console.error('[Parse API] FormData error:', error.message)
      return NextResponse.json(
        { error: 'Invalid request format. Please try again.' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a PDF file.' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed. Please upload a PDF resume.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'The uploaded file is empty. Please upload a valid PDF file.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` },
        { status: 400 }
      )
    }

    // Convert File to Buffer with timeout protection
    let arrayBuffer: ArrayBuffer
    let buffer: Buffer
    
    try {
      arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch (error: any) {
      console.error('[Parse API] Buffer conversion error:', error.message)
      return NextResponse.json(
        { error: 'Failed to read file. Please ensure the file is not corrupted.' },
        { status: 400 }
      )
    }

    // Extract text from PDF with timeout
    let pdfData: any
    let resumeText: string
    
    try {
      // Validate buffer before parsing
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid PDF buffer')
      }

      const parsePromise = pdfParse(buffer, {
        max: 0, // Parse all pages
      }).catch((err: any) => {
        console.error('[Parse API] pdf-parse library error:', err.message)
        throw new Error(`PDF parsing failed: ${err.message || 'Unknown error'}`)
      })
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('PDF parsing timeout')), PARSE_TIMEOUT)
      )
      
      pdfData = await Promise.race([parsePromise, timeoutPromise])
      
      // Validate parsed data
      if (!pdfData) {
        throw new Error('PDF parsing returned no data')
      }
      
      resumeText = pdfData?.text || ''
      
      // Additional validation
      if (typeof resumeText !== 'string') {
        throw new Error('PDF parsing returned invalid text format')
      }
      
    } catch (parseError: any) {
      console.error('[Parse API] PDF parsing error:', {
        message: parseError.message,
        name: parseError.name,
        stack: parseError.stack?.substring(0, 200)
      })
      
      // Provide specific error messages
      if (parseError.message?.includes('timeout') || parseError.name === 'TimeoutError') {
        return NextResponse.json(
          { error: 'PDF parsing took too long. Please try a smaller or simpler PDF file.' },
          { status: 408 }
        )
      }
      
      if (parseError.message?.includes('password') || parseError.message?.includes('encrypted')) {
        return NextResponse.json(
          { error: 'This PDF appears to be password-protected. Please remove the password and try again.' },
          { status: 400 }
        )
      }
      
      if (parseError.message?.includes('corrupt') || parseError.message?.includes('invalid')) {
        return NextResponse.json(
          { error: 'The PDF file appears to be corrupted or invalid. Please try a different PDF file.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The file may be corrupted, password-protected, or contain only images. Please try a different PDF file or ensure your PDF has selectable text.' },
        { status: 400 }
      )
    }

    // Validate extracted text
    if (!resumeText || typeof resumeText !== 'string') {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The PDF may contain only images or be unreadable.' },
        { status: 400 }
      )
    }

    const trimmedText = resumeText.trim()
    
    if (trimmedText.length === 0) {
      return NextResponse.json(
        { error: 'No text found in PDF. The PDF may contain only images. Please use a PDF with selectable text.' },
        { status: 400 }
      )
    }

    if (trimmedText.length < 50) {
      return NextResponse.json(
        { error: 'Very little text extracted from PDF. Please ensure your resume has readable text content.' },
        { status: 400 }
      )
    }

    // Limit text size to prevent memory issues
    const maxTextLength = MAX_RESUME_LENGTH
    const finalText = trimmedText.length > maxTextLength 
      ? trimmedText.substring(0, maxTextLength) 
      : trimmedText

    // Parse the text into structured data
    let parsedData
    try {
      parsedData = parsePDFText(finalText)
      console.log(`[Parse API] Successfully parsed resume data`)
    } catch (parseError: any) {
      console.error('[Parse API] Error parsing resume text:', parseError.message)
      // Return raw text as fallback if parsing fails
      return NextResponse.json({
        error: 'Failed to parse resume structure. The PDF may have an unusual format.',
        resumeText: finalText,
        fallback: true
      }, { status: 200 })
    }

    const processingTime = Date.now() - startTime
    console.log(`[Parse API] Success - File size: ${file.size} bytes, Text length: ${finalText.length}, Parsed data: ${JSON.stringify(parsedData).length} bytes, Time: ${processingTime}ms`)

    return NextResponse.json({ 
      success: true,
      data: parsedData,
      resumeText: finalText, // Keep raw text for fallback
      processingTime: processingTime
    })
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error('[Parse API] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      processingTime,
      errorName: error.name,
      errorType: error.constructor?.name
    })
    
    // Provide more specific error messages based on error type
    let userMessage = 'We encountered an issue processing your PDF. Please ensure the file is a valid PDF with readable text and try again.'
    
    if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
      userMessage = 'PDF processing took too long. Please try a smaller or simpler PDF file.'
    } else if (error.message?.includes('memory') || error.message?.includes('allocation')) {
      userMessage = 'PDF file is too large or complex. Please try a smaller PDF file.'
    } else if (error.message?.includes('corrupt') || error.message?.includes('invalid')) {
      userMessage = 'The PDF file appears to be corrupted or invalid. Please try a different PDF file.'
    }
    
    // Always return a user-friendly error, never expose internal errors
    return NextResponse.json(
      { 
        error: userMessage,
        fallback: true
      },
      { status: 200 } // Return 200 so user can see the error message
    )
  }
}

