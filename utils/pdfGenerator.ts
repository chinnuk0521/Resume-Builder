import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

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
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792]) // US Letter size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    const margin = 50
    const maxWidth = page.getWidth() - 2 * margin
    let yPosition = page.getHeight() - margin
    let currentPage = page

    // Parse the text content
    const lines = safeContent.split('\n').map(line => line.trim())
  
  const fontSize = 10
  const lineHeight = 12
  const sectionSpacing = 16
  const paragraphSpacing = 8
  const bulletIndent = 15

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    if (!line) {
      i++
      continue
    }

    // Check if we need a new page
    if (yPosition < margin + 80) {
      const newPage = pdfDoc.addPage([612, 792])
      currentPage = newPage
      yPosition = newPage.getHeight() - margin
    }

    // Check if it's the name (first substantial line that's not contact info or section header)
    if (i === 0 && line.length > 3 && line.length < 50 && 
        !line.includes('@') && !line.includes('|') && 
        !line.match(/\d{10,}/) &&
        !line.match(/^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS)$/)) {
      yPosition -= 8
      currentPage.drawText(line.toUpperCase(), {
        x: margin,
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
      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight + 4
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
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      })
      yPosition -= lineHeight + 4
      i++
      continue
    }

    // Check if it's a job title or company (contains — or —)
    if (line.includes('—') || line.includes('–')) {
      const parts = line.split(/[—–]/).map(p => p.trim())
      if (parts.length === 2) {
        // Job title and company
        currentPage.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize + 1,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight + 2
        i++
        continue
      }
    }

    // Check if it's a date range
    if (line.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i)) {
      currentPage.drawText(line, {
        x: margin,
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
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        
        // Draw text with word wrapping
        const words = bulletText.split(' ')
        let currentLine = ''
        let xOffset = margin + bulletIndent
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
            
            if (currentY < margin + 50) {
              const newPage = pdfDoc.addPage([612, 792])
              currentPage = newPage
              currentY = newPage.getHeight() - margin
              xOffset = margin + bulletIndent
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
            x: margin,
            y: currentY,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
          currentY -= lineHeight
          currentLine = word
          
          if (currentY < margin + 50) {
            const newPage = pdfDoc.addPage([612, 792])
            currentPage = newPage
            currentY = newPage.getHeight() - margin
          }
        } else {
          currentLine = testLine
        }
      }
      
      if (currentLine) {
        currentPage.drawText(currentLine, {
          x: margin,
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
