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
  
    const fontSize = 10
    const lineHeight = 12
    const sectionSpacing = 16
    const paragraphSpacing = 8
    const bulletIndent = 15
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

      // Check if it's the name (first substantial line that's not contact info or section header)
      if (i === 0 && line.length > 3 && line.length < 50 && 
          !line.includes('@') && !line.includes('|') && 
          !line.match(/\d{10,}/) &&
          !line.match(/^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS)$/)) {
        yPosition -= 8
        // Center the name or align left
        const nameWidth = boldFont.widthOfTextAtSize(line.toUpperCase(), 16)
        const nameX = MARGIN // Left aligned
        currentPage.drawText(line.toUpperCase(), {
          x: nameX,
          y: yPosition,
          size: 16,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= 20
        i++
        continue
      }

      // Check if it's contact info (contains email, phone, or separators)
      if (line.includes('@') || line.includes('|') || line.match(/linkedin|github|portfolio/i)) {
        // Wrap contact info if too long
        const words = line.split(' ')
        let currentLine = ''
        let currentY = yPosition
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const textWidth = font.widthOfTextAtSize(testLine, fontSize)
          
          if (textWidth > maxWidth && currentLine) {
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
          yPosition = currentY - lineHeight - 4
        }
        i++
        continue
      }

      // Check if it's a section header (all caps, short, no bullets)
      if (line === line.toUpperCase() && 
          line.length > 3 && 
          line.length < 50 && 
          !line.startsWith('•') &&
          !line.match(/^[a-z]/) &&
          (line.match(/^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS)$/) ||
           (i > 0 && lines[i - 1] === ''))) {
        yPosition -= sectionSpacing
        currentPage.drawText(line, {
          x: MARGIN,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight + 4
        i++
        continue
      }

      // Check if it's a job title or company (contains — or –)
      if (line.includes('—') || line.includes('–')) {
        const parts = line.split(/[—–]/).map(p => p.trim())
        if (parts.length === 2) {
          // Wrap if too long
          const textWidth = boldFont.widthOfTextAtSize(line, fontSize + 1)
          if (textWidth > maxWidth) {
            // Split into two lines
            currentPage.drawText(parts[0], {
              x: MARGIN,
              y: yPosition,
              size: fontSize + 1,
              font: boldFont,
              color: rgb(0, 0, 0),
            })
            yPosition -= lineHeight
            if (yPosition < MARGIN + minBottomMargin) {
              const newPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
              currentPage = newPage
              yPosition = A4_HEIGHT - MARGIN
            }
            currentPage.drawText(parts[1], {
              x: MARGIN,
              y: yPosition,
              size: fontSize + 1,
              font: boldFont,
              color: rgb(0, 0, 0),
            })
          } else {
            currentPage.drawText(line, {
              x: MARGIN,
              y: yPosition,
              size: fontSize + 1,
              font: boldFont,
              color: rgb(0, 0, 0),
            })
          }
          yPosition -= lineHeight + 2
          i++
          continue
        }
      }

      // Check if it's a date range
      if (line.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i)) {
        currentPage.drawText(line, {
          x: MARGIN,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight + 2
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
          
          yPosition = currentY - lineHeight - 2
        } else {
          yPosition -= lineHeight / 2
        }
        i++
        continue
      }

      // Regular text - wrap if needed
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
        
        yPosition = currentY - lineHeight
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
