import { PDFDocument, rgb, StandardFonts, PDFName } from 'pdf-lib'

// A4 dimensions in points (at 72 DPI)
// A4: 210mm x 297mm = 595.3 x 841.9 points
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN = 72 // 25mm = ~1 inch margins on all sides
const CONTENT_WIDTH = A4_WIDTH - (2 * MARGIN) // 451.28 points

// Helper function to extract URLs from contact string
function extractUrls(contactLine: string): { linkedin?: string, github?: string, portfolio?: string } {
  const urls: { linkedin?: string, github?: string, portfolio?: string } = {}
  
  // Extract LinkedIn
  const linkedinMatch = contactLine.match(/(?:linkedin\.com\/in\/|linkedin\.com\/)[^\s|]+/i)
  if (linkedinMatch) {
    let url = linkedinMatch[0]
    if (!url.startsWith('http')) url = 'https://' + url
    urls.linkedin = url
  }
  
  // Extract GitHub
  const githubMatch = contactLine.match(/(?:github\.com\/)[^\s|]+/i)
  if (githubMatch) {
    let url = githubMatch[0]
    if (!url.startsWith('http')) url = 'https://' + url
    urls.github = url
  }
  
  // Extract Portfolio
  const portfolioMatch = contactLine.match(/(?:portfolio\.|www\.)?[a-zA-Z0-9.-]+\.(?:com|net|org|io|dev)[^\s|]*/i)
  if (portfolioMatch && !portfolioMatch[0].includes('linkedin') && !portfolioMatch[0].includes('github')) {
    let url = portfolioMatch[0]
    if (!url.startsWith('http')) url = 'https://' + url
    urls.portfolio = url
  }
  
  return urls
}

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
    const annotations: Array<{ x: number, y: number, width: number, height: number, url: string }> = []

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
        annotations.length = 0 // Clear annotations for new page
      }

      // Check if it's the name (first substantial line, all caps, not contact info)
      if (i === 0 && line.length > 3 && line.length < 50 && 
          !line.includes('@') && !line.includes('|') && 
          !line.match(/\d{10,}/) &&
          !line.match(/^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS|WORK EXPERIENCE|TECHNICAL SKILLS)$/)) {
        yPosition -= 4
        // Center the name with font size 25
        const nameText = line.toUpperCase()
        const nameSize = 25
        const nameWidth = boldFont.widthOfTextAtSize(nameText, nameSize)
        const nameX = (A4_WIDTH - nameWidth) / 2 // Center horizontally
        currentPage.drawText(nameText, {
          x: nameX,
          y: yPosition,
          size: nameSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= 30 // Increased spacing for larger font
        i++
        continue
      }

      // Check if it's contact info (contains email, phone, or separators)
      if (line.includes('@') || line.includes('|') || line.match(/linkedin|github|portfolio/i)) {
        // Parse URLs from special format if present (||URLS:LinkedIn::url||GitHub::url)
        const urlMatch = line.match(/\|\|URLS:(.+)$/)
        const urlMap: { [key: string]: string } = {}
        let displayLine = line
        
        if (urlMatch) {
          displayLine = line.replace(/\|\|URLS:.*$/, '')
          const urlPairs = urlMatch[1].split('||')
          urlPairs.forEach(pair => {
            const [label, url] = pair.split('::')
            if (label && url) {
              urlMap[label] = url
            }
          })
        } else {
          // Fallback: extract URLs from text
          const urls = extractUrls(line)
          if (urls.linkedin) urlMap['LinkedIn'] = urls.linkedin
          if (urls.github) urlMap['GitHub'] = urls.github
          if (urls.portfolio) urlMap['Portfolio'] = urls.portfolio
        }
        
        // Split contact line by | to handle individual links
        const parts = displayLine.split('|').map(p => p.trim())
        
        // Calculate total width to center the entire line
        let totalWidth = 0
        for (let p = 0; p < parts.length; p++) {
          totalWidth += font.widthOfTextAtSize(parts[p], fontSize)
          if (p < parts.length - 1) {
            totalWidth += font.widthOfTextAtSize(' | ', fontSize)
          }
        }
        
        let currentX = (A4_WIDTH - totalWidth) / 2 // Center the entire contact line
        
        // Draw contact info with hyperlinks
        for (let partIdx = 0; partIdx < parts.length; partIdx++) {
          const part = parts[partIdx]
          const partWidth = font.widthOfTextAtSize(part, fontSize)
          
          // Check if this part has a URL mapping (LinkedIn, GitHub, Portfolio)
          const isLink = urlMap[part] !== undefined
          const linkUrl = urlMap[part]
          
          // Draw the text (blue for links, black for others)
          currentPage.drawText(part, {
            x: currentX,
            y: yPosition,
            size: fontSize,
            font: font,
            color: isLink ? rgb(0, 0, 0.8) : rgb(0, 0, 0), // Blue for links
          })
          
          // Store annotation info for links
          if (isLink && linkUrl) {
            annotations.push({
              x: currentX,
              y: yPosition - 2,
              width: partWidth,
              height: fontSize + 4,
              url: linkUrl
            })
          }
          
          currentX += partWidth
          
          // Add separator if not last part
          if (partIdx < parts.length - 1) {
            const separatorWidth = font.widthOfTextAtSize(' | ', fontSize)
            currentPage.drawText(' | ', {
              x: currentX,
              y: yPosition,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            })
            currentX += separatorWidth
          }
        }
        
        // Add hyperlink annotations to the page
        if (annotations.length > 0) {
          const pageAnnots = []
          for (const annot of annotations) {
            const linkAnnotation = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Link',
              Rect: [annot.x, annot.y, annot.x + annot.width, annot.y + annot.height],
              Border: [0, 0, 0],
              A: {
                Type: 'Action',
                S: 'URI',
                URI: pdfDoc.context.obj(annot.url),
              },
            })
            pageAnnots.push(pdfDoc.context.register(linkAnnotation))
          }
          currentPage.node.set(PDFName.of('Annots'), pdfDoc.context.obj(pageAnnots))
          annotations.length = 0 // Clear after adding
        }
        
        yPosition -= lineHeight + 12 // Increased spacing
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
