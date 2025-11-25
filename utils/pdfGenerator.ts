import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// A4 dimensions in points (at 72 DPI)
// A4: 210mm x 297mm = 595.3 x 841.9 points
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN = 72 // 25mm = ~1 inch margins on all sides
const CONTENT_WIDTH = A4_WIDTH - (2 * MARGIN) // 451.28 points

export async function generatePDF(textContent: string) {
  // Input validation
  if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
    throw new Error('Invalid text content for PDF generation')
  }

  // Limit content size to prevent memory issues
  const MAX_CONTENT_LENGTH = 50000
  const safeContent = textContent.length > MAX_CONTENT_LENGTH 
    ? textContent.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated...]'
    : textContent

  try {
    // Create a new PDF document with A4 size
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    const maxWidth = CONTENT_WIDTH
    let yPosition = A4_HEIGHT - MARGIN
    let currentPage = page

    // Parse the text content
    const lines = safeContent.split('\n').map(line => line.trim())
  
    // Typography settings matching the template
    const fontSize = 10
    const lineHeight = 12
    const sectionHeaderSize = 11
    const sectionSpacing = 20 // Space before section header
    const paragraphSpacing = 6 // Space between paragraphs
    const bulletIndent = 12
    const minBottomMargin = 72 // Minimum space at bottom before new page

    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      
      if (!line) {
        i++
        continue
      }

      // Check if we need a new page
      if (yPosition < MARGIN + minBottomMargin) {
        const newPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
        currentPage = newPage
        yPosition = A4_HEIGHT - MARGIN
      }

      // Check if it's the name (first substantial line, all caps, not contact info)
      if (i === 0 && line.length > 3 && line.length < 50 && 
          !line.includes('@') && !line.includes('|') && 
          !line.match(/\d{10,}/) &&
          !line.match(/^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS|WORK EXPERIENCE|TECHNICAL SKILLS)$/)) {
        yPosition -= 4
        // Name in bold, larger size
        currentPage.drawText(line.toUpperCase(), {
          x: MARGIN,
          y: yPosition,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= 22
        i++
        continue
      }

      // Check if it's contact info (contains email, phone, or separators)
      if (line.includes('@') || line.includes('|') || line.match(/linkedin|github|portfolio/i)) {
        currentPage.drawText(line, {
          x: MARGIN,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight + 8
        i++
        continue
      }

      // Check if it's a section header (all caps, matches known sections)
      const sectionHeaders = [
        'PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EXPERIENCE', 
        'EDUCATION', 'TECHNICAL SKILLS', 'SKILLS', 
        'ACHIEVEMENTS', 'PROJECTS', 'CERTIFICATIONS', 'LINKS'
      ]
      if (line === line.toUpperCase() && sectionHeaders.includes(line)) {
        yPosition -= sectionSpacing
        currentPage.drawText(line, {
          x: MARGIN,
          y: yPosition,
          size: sectionHeaderSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight + 8
        i++
        continue
      }

      // Check if it's a company name (bold, followed by job title on next line)
      // Pattern: "COMPANY NAME" or "COMPANY NAME — Job Title"
      if (line.includes('—') || line.includes('–')) {
        const parts = line.split(/[—–]/).map(p => p.trim())
        if (parts.length >= 2) {
          // Company name in bold
          currentPage.drawText(parts[0], {
            x: MARGIN,
            y: yPosition,
            size: fontSize + 1,
            font: boldFont,
            color: rgb(0, 0, 0),
          })
          yPosition -= lineHeight + 2
          
          // Job title on next line
          if (parts[1]) {
            if (yPosition < MARGIN + minBottomMargin) {
              const newPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
              currentPage = newPage
              yPosition = A4_HEIGHT - MARGIN
            }
            currentPage.drawText(parts[1], {
              x: MARGIN,
              y: yPosition,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            })
            yPosition -= lineHeight + 2
          }
        } else {
          // Single part - just draw it
          currentPage.drawText(line, {
            x: MARGIN,
            y: yPosition,
            size: fontSize + 1,
            font: boldFont,
            color: rgb(0, 0, 0),
          })
          yPosition -= lineHeight + 2
        }
        i++
        continue
      }

      // Check if it's a date range (format: "Jan 2025 - Sept 2025" or "Aug 2019 - May 2023")
      if (line.match(/\w+\s+\d{4}\s*[-–—]\s*(\w+\s+\d{4}|present|current)/i) || 
          line.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i)) {
        currentPage.drawText(line, {
          x: MARGIN,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight + paragraphSpacing
        i++
        continue
      }

      // Check if it's a bullet point
      if (line.startsWith('•')) {
        const bulletText = line.substring(1).trim()
        if (bulletText) {
          // Draw bullet
          currentPage.drawText('•', {
            x: MARGIN,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
          
          // Draw text with word wrapping
          const words = bulletText.split(' ')
          let currentLine = ''
          let xOffset = MARGIN + bulletIndent
          let currentY = yPosition
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const textWidth = font.widthOfTextAtSize(testLine, fontSize)
            
            if (textWidth > maxWidth - bulletIndent && currentLine) {
              // Draw current line and start new one
              currentPage.drawText(currentLine, {
                x: xOffset,
                y: currentY,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
              })
              currentY -= lineHeight
              currentLine = word
              
              if (currentY < MARGIN + minBottomMargin) {
                const newPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
                currentPage = newPage
                currentY = A4_HEIGHT - MARGIN
                xOffset = MARGIN + bulletIndent
                // Redraw bullet on new page
                currentPage.drawText('•', {
                  x: MARGIN,
                  y: currentY,
                  size: fontSize,
                  font: font,
                  color: rgb(0, 0, 0),
                })
              }
            } else {
              currentLine = testLine
            }
          }
          
          if (currentLine) {
            currentPage.drawText(currentLine, {
              x: xOffset,
              y: currentY,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            })
          }
          
          yPosition = currentY - lineHeight - paragraphSpacing
        } else {
          yPosition -= lineHeight / 2
        }
        i++
        continue
      }

      // Regular text - wrap if needed (for summary paragraphs)
      if (line) {
        const words = line.split(' ')
        let currentLine = ''
        let currentY = yPosition
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const textWidth = font.widthOfTextAtSize(testLine, fontSize)
          
          if (textWidth > maxWidth && currentLine) {
            // Draw current line and start new one
            currentPage.drawText(currentLine, {
              x: MARGIN,
              y: currentY,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            })
            currentY -= lineHeight
            currentLine = word
            
            if (currentY < MARGIN + minBottomMargin) {
              const newPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
              currentPage = newPage
              currentY = A4_HEIGHT - MARGIN
            }
          } else {
            currentLine = testLine
          }
        }
        
        if (currentLine) {
          currentPage.drawText(currentLine, {
            x: MARGIN,
            y: currentY,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
        }
        
        yPosition = currentY - lineHeight - paragraphSpacing
      }

      i++
    }

    // Save the PDF
    const pdfBytes = await pdfDoc.save()
    
    // Validate PDF was created
    if (!pdfBytes || pdfBytes.length === 0) {
      throw new Error('Failed to generate PDF content')
    }
    
    // Create blob and download
    const arrayBuffer = pdfBytes.buffer instanceof ArrayBuffer 
      ? pdfBytes.buffer 
      : new Uint8Array(pdfBytes).buffer
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    
    // Validate blob
    if (blob.size === 0) {
      throw new Error('Generated PDF is empty')
    }
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'resume-ats-optimized.pdf'
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 100)
    
  } catch (error: any) {
    console.error('[PDF Generator] Error:', error.message)
    throw new Error(`PDF generation failed: ${error.message || 'Unknown error'}`)
  }
}
