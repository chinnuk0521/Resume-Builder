import { PDFDocument, rgb, StandardFonts, PDFName } from 'pdf-lib'

// A4 dimensions in points (at 72 DPI)
// A4: 210mm x 297mm = 595.3 x 841.9 points
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN = 54 // Reduced margins for more space (0.75 inch)
const CONTENT_WIDTH = A4_WIDTH - (2 * MARGIN) // 487.28 points
const MIN_BOTTOM_MARGIN = 36 // Minimum space at bottom (0.5 inch)

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
  
    // Typography settings - optimized for single page
    const fontSize = 9 // Reduced from 10
    const lineHeight = 10.5 // Reduced from 12
    const sectionHeaderSize = 10 // Reduced from 11
    const sectionSpacing = 12 // Reduced from 20 - Space before section header
    const paragraphSpacing = 4 // Reduced from 6 - Space between paragraphs
    const bulletIndent = 10 // Reduced from 12
    const nameSize = 20 // Reduced from 25
    const nameSpacing = 20 // Reduced from 30

    // Track context for right-alignment
    let currentSection = ''
    let waitingForDateAfterCompany = false
    let waitingForDateAfterUniversity = false

    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      
      if (!line) {
        i++
        continue
      }

      // Check if we're running out of space - truncate content instead of new page
      if (yPosition < MARGIN + MIN_BOTTOM_MARGIN) {
        // Stop processing - we've reached the bottom of the page
        break
      }

      // Check if it's the name (first substantial line, all caps, not contact info)
      if (i === 0 && line.length > 3 && line.length < 50 && 
          !line.includes('@') && !line.includes('|') && 
          !line.match(/\d{10,}/) &&
          !line.match(/^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS|WORK EXPERIENCE|TECHNICAL SKILLS)$/)) {
        yPosition -= 2
        // Center the name
        const nameText = line.toUpperCase()
        const nameWidth = boldFont.widthOfTextAtSize(nameText, nameSize)
        const nameX = (A4_WIDTH - nameWidth) / 2 // Center horizontally
        currentPage.drawText(nameText, {
          x: nameX,
          y: yPosition,
          size: nameSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= nameSpacing
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
        
        yPosition -= lineHeight + 8 // Reduced spacing
        i++
        continue
      }

      // Check if it's a Markdown section header (## Education, ## Work Experience)
      if (line.startsWith('## ')) {
        const sectionName = line.substring(3).trim().toUpperCase()
        const sectionHeaders = [
          'PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EXPERIENCE', 
          'EDUCATION', 'TECHNICAL SKILLS', 'SKILLS', 
          'ACHIEVEMENTS', 'PROJECTS', 'CERTIFICATIONS', 'LINKS'
        ]
        // Map Markdown headers to section names
        if (sectionName === 'EDUCATION' || sectionName === 'WORK EXPERIENCE') {
          currentSection = sectionName
          waitingForDateAfterCompany = false
          waitingForDateAfterUniversity = false
          yPosition -= sectionSpacing
          currentPage.drawText(sectionName, {
            x: MARGIN,
            y: yPosition,
            size: sectionHeaderSize,
            font: boldFont,
            color: rgb(0, 0, 0),
          })
          yPosition -= lineHeight + 6
          i++
          continue
        }
      }

      // Check if it's a section header (all caps, matches known sections)
      const sectionHeaders = [
        'PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EXPERIENCE', 
        'EDUCATION', 'TECHNICAL SKILLS', 'SKILLS', 
        'ACHIEVEMENTS', 'PROJECTS', 'CERTIFICATIONS', 'LINKS'
      ]
      if (line === line.toUpperCase() && sectionHeaders.includes(line)) {
        currentSection = line
        waitingForDateAfterCompany = false
        waitingForDateAfterUniversity = false
        yPosition -= sectionSpacing
        currentPage.drawText(line, {
          x: MARGIN,
          y: yPosition,
          size: sectionHeaderSize,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight + 6
        i++
        continue
      }

      // Check if it's a Markdown table row (| Left | Right |)
      if (line.startsWith('| ') && line.endsWith(' |') && line.includes(' | ')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0)
        if (cells.length >= 2) {
          const leftCell = cells[0]
          const rightCell = cells[1]
          
          // Parse right cell for location and dates (format: "Location — StartYear–EndYear")
          const dateMatch = rightCell.match(/(.+?)\s*—\s*(.+)/)
          let location = ''
          let dateRange = ''
          
          if (dateMatch) {
            location = dateMatch[1].trim()
            dateRange = dateMatch[2].trim()
          } else {
            // Check if it's just a date range or just location
            if (rightCell.match(/\d{4}[-–—]/)) {
              dateRange = rightCell
            } else {
              location = rightCell
            }
          }
          
          // In Education section: left = school, right = location + dates, next line = course
          if (currentSection === 'EDUCATION') {
            // Use minimal margin for table rows - left content starts from leftmost edge
            // Using 18 points (0.25 inch) for maximum edge-to-edge alignment
            const tableLeftMargin = 18
            const tableRightMargin = 18
            
            // Draw school name on left (bold) - start from absolute leftmost position
            currentPage.drawText(leftCell, {
              x: tableLeftMargin,
              y: yPosition,
              size: fontSize + 1,
              font: boldFont,
              color: rgb(0, 0, 0),
            })
            
            // Draw location and dates on right - align to absolute rightmost position
            if (rightCell) {
              const rightWidth = font.widthOfTextAtSize(rightCell, fontSize)
              const rightX = A4_WIDTH - tableRightMargin - rightWidth
              currentPage.drawText(rightCell, {
                x: rightX,
                y: yPosition,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
              })
            }
            
            yPosition -= lineHeight + 1
            waitingForDateAfterUniversity = true
            i++
            continue
          }
          
          // In Work Experience section: left = job title, right = location + dates, next line = company
          if (currentSection === 'WORK EXPERIENCE' || currentSection === 'EXPERIENCE') {
            // Use minimal margin for table rows - left content starts from leftmost edge
            // Using 18 points (0.25 inch) for maximum edge-to-edge alignment
            const tableLeftMargin = 18
            const tableRightMargin = 18
            
            // Draw job title on left - start from absolute leftmost position
            currentPage.drawText(leftCell, {
              x: tableLeftMargin,
              y: yPosition,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            })
            
            // Draw location and dates on right - align to absolute rightmost position
            if (rightCell) {
              const rightWidth = font.widthOfTextAtSize(rightCell, fontSize)
              const rightX = A4_WIDTH - tableRightMargin - rightWidth
              currentPage.drawText(rightCell, {
                x: rightX,
                y: yPosition,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
              })
            }
            
            yPosition -= lineHeight + 1
            waitingForDateAfterCompany = true
            i++
            continue
          }
        }
      }

      // Check if it's a company name (in WORK EXPERIENCE section)
      // Company name is the first non-empty line after WORK EXPERIENCE header
      if ((currentSection === 'WORK EXPERIENCE' || currentSection === 'EXPERIENCE') && 
          !line.includes('—') && !line.includes('–') && 
          !line.startsWith('•') && 
          !line.match(/\w+\s+\d{4}\s*[-–—]/) &&
          !line.match(/\d{4}\s*[-–—]/) &&
          !line.includes('||DATE:') &&
          !waitingForDateAfterCompany &&
          i > 0 && 
          (lines[i-1] === '' || sectionHeaders.includes(lines[i-1]))) {
        // This is likely a company name
        waitingForDateAfterCompany = true
        waitingForDateAfterUniversity = false
        
        // Look ahead for dates - check next few lines
        let foundDate = false
        let dateLine = ''
        let dateIdx = i + 1
        
        // Skip empty lines and job title to find date
        while (dateIdx < lines.length && dateIdx < i + 5) {
          const testLine = lines[dateIdx].trim()
          if (!testLine) {
            dateIdx++
            continue
          }
          // Check if it's a date
          if (testLine.match(/\w+\s+\d{4}\s*[-–—]\s*(\w+\s+\d{4}|present|current)/i) ||
              testLine.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i)) {
            foundDate = true
            dateLine = testLine
            break
          }
          // If we hit a bullet or section, stop looking
          if (testLine.startsWith('•') || sectionHeaders.includes(testLine)) {
            break
          }
          dateIdx++
        }
        
        if (foundDate) {
          // Draw company name on left
          currentPage.drawText(line, {
            x: MARGIN,
            y: yPosition,
            size: fontSize + 1,
            font: boldFont,
            color: rgb(0, 0, 0),
          })
          
          // Draw date on right, same line
          const dateWidth = font.widthOfTextAtSize(dateLine, fontSize)
          const dateX = A4_WIDTH - MARGIN - dateWidth
          currentPage.drawText(dateLine, {
            x: dateX,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
          
          // Skip to after the date line
          i = dateIdx + 1
          waitingForDateAfterCompany = false
        } else {
          // Just draw company name
          currentPage.drawText(line, {
            x: MARGIN,
            y: yPosition,
            size: fontSize + 1,
            font: boldFont,
            color: rgb(0, 0, 0),
          })
          i++
        }
        yPosition -= lineHeight + 1
        continue
      }

      // Check if it's a university name (in EDUCATION section)
      // University name is the first non-empty line after EDUCATION header
      if (currentSection === 'EDUCATION' && 
          !line.includes('—') && !line.includes('–') && 
          !line.startsWith('•') && 
          !line.match(/\w+\s+\d{4}\s*[-–—]/) &&
          !line.match(/\d{4}\s*[-–—]/) &&
          !line.includes('||DATE:') &&
          !waitingForDateAfterUniversity &&
          i > 0 && 
          (lines[i-1] === '' || sectionHeaders.includes(lines[i-1]))) {
        // This is likely a university name
        waitingForDateAfterUniversity = true
        waitingForDateAfterCompany = false
        
        // Look ahead for date/location - check after degree
        let foundDateLocation = false
        let dateLocationLine = ''
        let dateIdx = i + 1
        
        // Skip empty lines and degree to find date/location
        while (dateIdx < lines.length && dateIdx < i + 5) {
          const testLine = lines[dateIdx].trim()
          if (!testLine) {
            dateIdx++
            continue
          }
          // Check if it's a date/location (has | and numbers, or date pattern)
          if ((testLine.includes('|') && testLine.match(/\d{4}/)) ||
              testLine.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i)) {
            foundDateLocation = true
            dateLocationLine = testLine
            break
          }
          // If we hit a bullet or section, stop looking
          if (testLine.startsWith('•') || sectionHeaders.includes(testLine)) {
            break
          }
          dateIdx++
        }
        
        if (foundDateLocation) {
          // Draw university name on left
          currentPage.drawText(line, {
            x: MARGIN,
            y: yPosition,
            size: fontSize + 1,
            font: boldFont,
            color: rgb(0, 0, 0),
          })
          
          // Draw date/location on right, same line
          const dateWidth = font.widthOfTextAtSize(dateLocationLine, fontSize)
          const dateX = A4_WIDTH - MARGIN - dateWidth
          currentPage.drawText(dateLocationLine, {
            x: dateX,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
          
          // Skip to after the date/location line
          i = dateIdx + 1
          waitingForDateAfterUniversity = false
        } else {
          // Just draw university name
          currentPage.drawText(line, {
            x: MARGIN,
            y: yPosition,
            size: fontSize + 1,
            font: boldFont,
            color: rgb(0, 0, 0),
          })
          i++
        }
        yPosition -= lineHeight + 1
        continue
      }

      // Check if it's a company name with em dash (old format) - skip this, use new format
      // Job title or degree - regular text, don't reset the waiting flag
      if (line.includes('—') || line.includes('–')) {
        const parts = line.split(/[—–]/).map(p => p.trim())
        if (parts.length >= 2) {
          // Company name in bold
          waitingForDateAfterCompany = true
          waitingForDateAfterUniversity = false
          currentPage.drawText(parts[0], {
            x: MARGIN,
            y: yPosition,
            size: fontSize + 1,
            font: boldFont,
            color: rgb(0, 0, 0),
          })
          yPosition -= lineHeight + 1
          
          // Job title on next line - keep waiting flag
          if (parts[1]) {
            if (yPosition < MARGIN + MIN_BOTTOM_MARGIN) {
              break // Stop if out of space
            }
            // Don't reset waitingForDateAfterCompany - dates should still be right-aligned
            currentPage.drawText(parts[1], {
              x: MARGIN,
              y: yPosition,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            })
            yPosition -= lineHeight + 1
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
          yPosition -= lineHeight + 1
        }
        i++
        continue
      }
      
      // Check for special format: "Job Title||DATE:Jan 2025 – Sept 2025" or "Degree||DATE:2019 - 2023 | Location"
      if (line.includes('||DATE:')) {
        const parts = line.split('||DATE:')
        if (parts.length === 2) {
          const leftText = parts[0].trim() // Job title or degree
          const rightText = parts[1].trim() // Dates or location/years
          
          // Draw left text (job title or degree)
          currentPage.drawText(leftText, {
            x: MARGIN,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
          
          // Draw right text (dates or location/years) - right-aligned
          const rightWidth = font.widthOfTextAtSize(rightText, fontSize)
          const rightX = A4_WIDTH - MARGIN - rightWidth
          currentPage.drawText(rightText, {
            x: rightX,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
          
          yPosition -= lineHeight + 1
          waitingForDateAfterCompany = false
          waitingForDateAfterUniversity = false
          i++
          continue
        }
      }

      // Job title or degree - regular text after company/university
      if ((waitingForDateAfterCompany || waitingForDateAfterUniversity) &&
          !line.startsWith('•') &&
          !line.match(/\w+\s+\d{4}\s*[-–—]/) &&
          !line.match(/\d{4}\s*[-–—]/) &&
          !line.includes('|')) {
        // This is likely a job title or degree (or course/company after table row)
        // Use smaller margin to match table row alignment
        const tableLeftMargin = 18
        currentPage.drawText(line, {
          x: tableLeftMargin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        yPosition -= lineHeight + 1
        i++
        continue
      }

      // Check if it's a date range (format: "Jan 2025 - Sept 2025" or "Aug 2019 - May 2023")
      // Or location/years (format: "2019 - 2023 | Location" or "Location | 2019 - 2023")
      if (line.match(/\w+\s+\d{4}\s*[-–—]\s*(\w+\s+\d{4}|present|current)/i) || 
          line.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i) ||
          (line.includes('|') && (line.match(/\d{4}/) || line.match(/present|current/i)))) {
        // Right-align if we're waiting for a date after company or university
        if (waitingForDateAfterCompany || waitingForDateAfterUniversity) {
          const textWidth = font.widthOfTextAtSize(line, fontSize)
          const rightX = A4_WIDTH - MARGIN - textWidth
          currentPage.drawText(line, {
            x: rightX,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
          // Reset flags after drawing the date
          waitingForDateAfterCompany = false
          waitingForDateAfterUniversity = false
        } else {
          // Left-align for other cases
          currentPage.drawText(line, {
            x: MARGIN,
            y: yPosition,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          })
        }
        yPosition -= lineHeight + (paragraphSpacing - 1) // Slightly reduced spacing
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
              
              if (currentY < MARGIN + MIN_BOTTOM_MARGIN) {
                break // Stop if out of space
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

      // Regular text - wrap if needed with justification (for summary paragraphs)
      if (line) {
        const words = line.split(' ').filter(w => w.length > 0)
        let currentLineWords: string[] = []
        let currentY = yPosition
        const isSummaryParagraph = currentSection === 'PROFESSIONAL SUMMARY'
        
        for (const word of words) {
          const testLine = currentLineWords.length > 0 
            ? currentLineWords.join(' ') + ' ' + word 
            : word
          const textWidth = font.widthOfTextAtSize(testLine, fontSize)
          
          if (textWidth > maxWidth && currentLineWords.length > 0) {
            // Draw current line with justification if it's a summary paragraph
            if (isSummaryParagraph && currentLineWords.length > 1) {
              // Justify text by calculating space between words
              const lineText = currentLineWords.join(' ')
              const lineWidth = font.widthOfTextAtSize(lineText, fontSize)
              const totalSpaces = currentLineWords.length - 1
              const extraSpace = (maxWidth - lineWidth) / totalSpaces
              
              let xPos = MARGIN
              for (let wIdx = 0; wIdx < currentLineWords.length; wIdx++) {
                const word = currentLineWords[wIdx]
                currentPage.drawText(word, {
                  x: xPos,
                  y: currentY,
                  size: fontSize,
                  font: font,
                  color: rgb(0, 0, 0),
                })
                xPos += font.widthOfTextAtSize(word, fontSize)
                if (wIdx < currentLineWords.length - 1) {
                  // Add space plus extra space for justification
                  const spaceWidth = font.widthOfTextAtSize(' ', fontSize) + extraSpace
                  xPos += spaceWidth
                }
              }
            } else {
              // Left-align for non-summary text
              currentPage.drawText(currentLineWords.join(' '), {
                x: MARGIN,
                y: currentY,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
              })
            }
            
            currentY -= lineHeight
            currentLineWords = [word]
            
            if (currentY < MARGIN + MIN_BOTTOM_MARGIN) {
              break // Stop if out of space
            }
          } else {
            currentLineWords.push(word)
          }
        }
        
        // Draw remaining line
        if (currentLineWords.length > 0) {
          if (isSummaryParagraph && currentLineWords.length > 1) {
            // Justify last line too if it's summary
            const lineText = currentLineWords.join(' ')
            const lineWidth = font.widthOfTextAtSize(lineText, fontSize)
            const totalSpaces = currentLineWords.length - 1
            const extraSpace = totalSpaces > 0 ? (maxWidth - lineWidth) / totalSpaces : 0
            
            let xPos = MARGIN
            for (let wIdx = 0; wIdx < currentLineWords.length; wIdx++) {
              const word = currentLineWords[wIdx]
              currentPage.drawText(word, {
                x: xPos,
                y: currentY,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
              })
              xPos += font.widthOfTextAtSize(word, fontSize)
              if (wIdx < currentLineWords.length - 1) {
                const spaceWidth = font.widthOfTextAtSize(' ', fontSize) + extraSpace
                xPos += spaceWidth
              }
            }
          } else {
            // Left-align for non-summary text
            currentPage.drawText(currentLineWords.join(' '), {
              x: MARGIN,
              y: currentY,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            })
          }
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
    
    // Create blob
    const arrayBuffer = pdfBytes.buffer instanceof ArrayBuffer 
      ? pdfBytes.buffer 
      : new Uint8Array(pdfBytes).buffer
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    
    // Validate blob
    if (blob.size === 0) {
      throw new Error('Generated PDF is empty')
    }
    
    return blob
    
  } catch (error: any) {
    console.error('[PDF Generator] Error:', error.message)
    throw new Error(`PDF generation failed: ${error.message || 'Unknown error'}`)
  }
}

// Helper function to download PDF
export async function downloadPDF(textContent: string) {
  const blob = await generatePDF(textContent)
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
}

// Helper function to preview PDF
export async function previewPDF(textContent: string) {
  const blob = await generatePDF(textContent)
  const url = URL.createObjectURL(blob)
  // Open PDF in new window
  const newWindow = window.open(url, '_blank')
  if (!newWindow) {
    alert('Please allow popups to preview the PDF')
    URL.revokeObjectURL(url)
  } else {
    // Cleanup URL after window closes (best effort)
    newWindow.addEventListener('beforeunload', () => {
      URL.revokeObjectURL(url)
    })
  }
}
