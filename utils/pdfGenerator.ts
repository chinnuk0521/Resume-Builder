import { PDFDocument, rgb, StandardFonts, PDFName } from 'pdf-lib'
import {
  PAGE_CONFIG,
  TYPOGRAPHY,
  SPACING,
  ALIGNMENT,
  FORMATTING,
  COLORS,
  getContentWidth,
  getStartY,
  getMinY
} from './resumeTemplate'

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

/**
 * Generate PDF using EXACT template configuration
 * This is completely generic - works for ALL users with their own data
 */
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
    // Create PDF document with exact A4 size
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([PAGE_CONFIG.width, PAGE_CONFIG.height])
    
    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    // Get exact measurements from template
    const contentWidth = getContentWidth()
    const maxWidth = contentWidth
    let yPosition = getStartY()
    const minY = getMinY()
    
    const annotations: Array<{ x: number, y: number, width: number, height: number, url: string }> = []

    // Parse the text content
    const lines = safeContent.split('\n').map(line => line.trim())
  
    // Track context for formatting
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

      // Check if we're running out of space
      if (yPosition < minY) {
        break
      }

      // ===== NAME (First line, centered, uppercase, bold) =====
      if (i === 0 && line.length > 3 && line.length < 50 && 
          !line.includes('@') && !line.includes('|') && 
          !line.match(/\d{10,}/) &&
          !line.match(/^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS|WORK EXPERIENCE|TECHNICAL SKILLS)$/)) {
        const nameText = TYPOGRAPHY.name.transform === 'uppercase' ? line.toUpperCase() : line
        const nameWidth = boldFont.widthOfTextAtSize(nameText, TYPOGRAPHY.name.size)
        const nameX = (PAGE_CONFIG.width - nameWidth) / 2 // Center horizontally
        
        page.drawText(nameText, {
          x: nameX,
          y: yPosition,
          size: TYPOGRAPHY.name.size,
          font: boldFont,
          color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
        })
        
        yPosition -= TYPOGRAPHY.name.size + SPACING.afterName
        i++
        continue
      }

      // ===== CONTACT INFO (Centered, with separators) =====
      if (line.includes('@') || line.includes('|') || line.match(/linkedin|github|portfolio/i)) {
        // Parse URLs from special format if present
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
        
        // Split contact line by separator
        const parts = displayLine.split('|').map(p => p.trim())
        
        // Calculate total width to center the entire line
        let totalWidth = 0
        for (let p = 0; p < parts.length; p++) {
          totalWidth += font.widthOfTextAtSize(parts[p], TYPOGRAPHY.contact.size)
          if (p < parts.length - 1) {
            totalWidth += font.widthOfTextAtSize(FORMATTING.contactSeparator, TYPOGRAPHY.contact.size)
          }
        }
        
        let currentX = (PAGE_CONFIG.width - totalWidth) / 2 // Center the entire contact line
        
        // Draw contact info with hyperlinks
        for (let partIdx = 0; partIdx < parts.length; partIdx++) {
          const part = parts[partIdx]
          const partWidth = font.widthOfTextAtSize(part, TYPOGRAPHY.contact.size)
          
          // Check if this part has a URL mapping
          const isLink = urlMap[part] !== undefined
          const linkUrl = urlMap[part]
          
          // Draw the text
          page.drawText(part, {
            x: currentX,
            y: yPosition,
            size: TYPOGRAPHY.contact.size,
            font: font,
            color: isLink ? rgb(COLORS.links.r, COLORS.links.g, COLORS.links.b) : rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          // Store annotation info for links
          if (isLink && linkUrl) {
            annotations.push({
              x: currentX,
              y: yPosition - 2,
              width: partWidth,
              height: TYPOGRAPHY.contact.size + 4,
              url: linkUrl
            })
          }
          
          currentX += partWidth
          
          // Add separator if not last part
          if (partIdx < parts.length - 1) {
            const separatorWidth = font.widthOfTextAtSize(FORMATTING.contactSeparator, TYPOGRAPHY.contact.size)
            page.drawText(FORMATTING.contactSeparator, {
              x: currentX,
              y: yPosition,
              size: TYPOGRAPHY.contact.size,
              font: font,
              color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
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
          page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(pageAnnots))
          annotations.length = 0 // Clear after adding
        }
        
        yPosition -= TYPOGRAPHY.contact.lineHeight + SPACING.afterContact
        i++
        continue
      }

      // ===== SECTION HEADERS (Markdown format: ## Section Name) =====
      if (line.startsWith('## ')) {
        const sectionName = line.substring(3).trim().toUpperCase()
        const sectionHeaders = [
          'PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EXPERIENCE', 
          'EDUCATION', 'TECHNICAL SKILLS', 'SKILLS', 
          'ACHIEVEMENTS', 'PROJECTS', 'CERTIFICATIONS', 'LINKS'
        ]
        
        if (sectionHeaders.includes(sectionName)) {
          currentSection = sectionName
          waitingForDateAfterCompany = false
          waitingForDateAfterUniversity = false
          
          yPosition -= SPACING.beforeSection
          
          page.drawText(sectionName, {
            x: PAGE_CONFIG.margin.left,
            y: yPosition,
            size: TYPOGRAPHY.sectionHeader.size,
            font: boldFont,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          yPosition -= TYPOGRAPHY.sectionHeader.size + SPACING.afterSectionHeader
          i++
          continue
        }
      }

      // ===== SECTION HEADERS (Plain format: PROFESSIONAL SUMMARY) =====
      const sectionHeaders = [
        'PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EXPERIENCE', 
        'EDUCATION', 'TECHNICAL SKILLS', 'SKILLS', 
        'ACHIEVEMENTS', 'PROJECTS', 'CERTIFICATIONS', 'LINKS'
      ]
      if (line === line.toUpperCase() && sectionHeaders.includes(line)) {
        currentSection = line
        waitingForDateAfterCompany = false
        waitingForDateAfterUniversity = false
        
        yPosition -= SPACING.beforeSection
        
        page.drawText(line, {
          x: PAGE_CONFIG.margin.left,
          y: yPosition,
          size: TYPOGRAPHY.sectionHeader.size,
          font: boldFont,
          color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
        })
        
        yPosition -= TYPOGRAPHY.sectionHeader.size + SPACING.afterSectionHeader
        i++
        continue
      }

      // ===== TABLE ROWS (Markdown format: | Left | Middle | Right |) =====
      if (line.startsWith('| ') && line.endsWith(' |') && line.includes(' | ')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0)
        if (cells.length >= 2) {
          const leftCell = cells[0]
          const middleCell = cells[1] || ''
          const rightCell = cells[2] || '' // Dates for right alignment
          
          // In Education section: | University | Location | dates |
          if (currentSection === 'EDUCATION') {
            // Draw university name on left (bold) with pipe format
            const universityText = `| ${leftCell} |`
            page.drawText(universityText, {
              x: SPACING.tableLeftMargin,
              y: yPosition,
              size: TYPOGRAPHY.company.size,
              font: boldFont,
              color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
            })
            
            // Draw location in middle if present
            let currentX = SPACING.tableLeftMargin + boldFont.widthOfTextAtSize(universityText, TYPOGRAPHY.company.size) + 8
            if (middleCell && !middleCell.match(/\d{4}[-–—]/)) {
              // Location (not dates)
              const locationText = `${middleCell} |`
              page.drawText(locationText, {
                x: currentX,
                y: yPosition,
                size: TYPOGRAPHY.body.size,
                font: font,
                color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
              })
              currentX += font.widthOfTextAtSize(locationText, TYPOGRAPHY.body.size) + 8
            }
            
            // Draw dates on right (right-aligned) - could be in middleCell or rightCell
            const dateText = rightCell || (middleCell.match(/\d{4}[-–—]/) ? middleCell : '')
            if (dateText) {
              const dateWidth = font.widthOfTextAtSize(dateText, TYPOGRAPHY.body.size)
              const dateX = PAGE_CONFIG.width - SPACING.tableRightMargin - dateWidth
              page.drawText(dateText, {
                x: dateX,
                y: yPosition,
                size: TYPOGRAPHY.body.size,
                font: font,
                color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
              })
            }
            
            // Check if next line is a date (right-aligned on same line)
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim()
              if (nextLine.match(/\d{4}[-–—]\s*(\d{4}|present|current)/i)) {
                // Draw date on right, same Y position as university line
                const dateWidth = font.widthOfTextAtSize(nextLine, TYPOGRAPHY.body.size)
                const dateX = PAGE_CONFIG.width - SPACING.tableRightMargin - dateWidth
                page.drawText(nextLine, {
                  x: dateX,
                  y: yPosition, // Same Y as university line
                  size: TYPOGRAPHY.body.size,
                  font: font,
                  color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
                })
                i += 2 // Skip both table row and date line
              } else {
                i++
              }
            } else {
              i++
            }
            
            yPosition -= TYPOGRAPHY.body.lineHeight + 0.5
            waitingForDateAfterUniversity = true
            continue
          }
          
          // In Work Experience section: | Job Title | dates |
          if (currentSection === 'WORK EXPERIENCE' || currentSection === 'EXPERIENCE') {
            // Draw job title on left with pipe format
            const jobTitleText = `| ${leftCell} |`
            page.drawText(jobTitleText, {
              x: SPACING.tableLeftMargin,
              y: yPosition,
              size: TYPOGRAPHY.jobTitle.size,
              font: font,
              color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
            })
            
            // Draw dates on right (right-aligned) - could be in middleCell or rightCell
            const dateText = rightCell || middleCell
            if (dateText && dateText.match(/\d{4}[-–—]/)) {
              const dateWidth = font.widthOfTextAtSize(dateText, TYPOGRAPHY.body.size)
              const dateX = PAGE_CONFIG.width - SPACING.tableRightMargin - dateWidth
              page.drawText(dateText, {
                x: dateX,
                y: yPosition,
                size: TYPOGRAPHY.body.size,
                font: font,
                color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
              })
            }
            
            yPosition -= TYPOGRAPHY.body.lineHeight + 0.5
            waitingForDateAfterCompany = true
            i++
            continue
          }
        }
      }

      // ===== COMPANY NAME (in WORK EXPERIENCE section) - should be uppercase and bold =====
      if ((currentSection === 'WORK EXPERIENCE' || currentSection === 'EXPERIENCE') && 
          !line.includes('—') && !line.includes('–') && 
          !line.startsWith('•') && 
          !line.startsWith('|') &&
          !line.match(/\w+\s+\d{4}\s*[-–—]/) &&
          !line.match(/\d{4}\s*[-–—]/) &&
          !line.includes('||DATE:') &&
          waitingForDateAfterCompany &&
          i > 0) {
        
        // Draw company name on left (uppercase and bold) - dates are already in table row
        const companyText = line.toUpperCase()
        page.drawText(companyText, {
          x: PAGE_CONFIG.margin.left,
          y: yPosition,
          size: TYPOGRAPHY.company.size,
          font: boldFont,
          color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
        })
        i++
        waitingForDateAfterCompany = false
        yPosition -= TYPOGRAPHY.body.lineHeight + 0.5
        continue
      }

      // ===== UNIVERSITY NAME (in EDUCATION section) =====
      if (currentSection === 'EDUCATION' && 
          !line.includes('—') && !line.includes('–') && 
          !line.startsWith('•') && 
          !line.match(/\w+\s+\d{4}\s*[-–—]/) &&
          !line.match(/\d{4}\s*[-–—]/) &&
          !line.includes('||DATE:') &&
          !waitingForDateAfterUniversity &&
          i > 0 && 
          (lines[i-1] === '' || sectionHeaders.includes(lines[i-1]))) {
        
        waitingForDateAfterUniversity = true
        waitingForDateAfterCompany = false
        
        // Look ahead for date/location
        let foundDateLocation = false
        let dateLocationLine = ''
        let dateIdx = i + 1
        
        while (dateIdx < lines.length && dateIdx < i + 5) {
          const testLine = lines[dateIdx].trim()
          if (!testLine) {
            dateIdx++
            continue
          }
          if ((testLine.includes('|') && testLine.match(/\d{4}/)) ||
              testLine.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i)) {
            foundDateLocation = true
            dateLocationLine = testLine
            break
          }
          if (testLine.startsWith('•') || sectionHeaders.includes(testLine)) {
            break
          }
          dateIdx++
        }
        
        if (foundDateLocation) {
          // Draw university name on left (bold)
          page.drawText(line, {
            x: PAGE_CONFIG.margin.left,
            y: yPosition,
            size: TYPOGRAPHY.company.size,
            font: boldFont,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          // Draw date/location on right, same line
          const dateWidth = font.widthOfTextAtSize(dateLocationLine, TYPOGRAPHY.body.size)
          const dateX = PAGE_CONFIG.width - PAGE_CONFIG.margin.right - dateWidth
          page.drawText(dateLocationLine, {
            x: dateX,
            y: yPosition,
            size: TYPOGRAPHY.body.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          i = dateIdx + 1
          waitingForDateAfterUniversity = false
        } else {
          // Just draw university name
          page.drawText(line, {
            x: PAGE_CONFIG.margin.left,
            y: yPosition,
            size: TYPOGRAPHY.company.size,
            font: boldFont,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          i++
        }
        yPosition -= TYPOGRAPHY.body.lineHeight + 0.5
        continue
      }

      // ===== JOB TITLE OR DEGREE (after company/university) =====
      if ((waitingForDateAfterCompany || waitingForDateAfterUniversity) &&
          !line.startsWith('•') &&
          !line.match(/\w+\s+\d{4}\s*[-–—]/) &&
          !line.match(/\d{4}\s*[-–—]/) &&
          !line.includes('|')) {
        // Use table margin to match table row alignment
        page.drawText(line, {
          x: SPACING.tableLeftMargin,
          y: yPosition,
          size: TYPOGRAPHY.jobTitle.size,
          font: font,
          color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
        })
        yPosition -= TYPOGRAPHY.body.lineHeight + 0.5
        i++
        continue
      }

      // ===== DATE RANGES (Right-aligned when after company/university) =====
      if (line.match(/\w+\s+\d{4}\s*[-–—]\s*(\w+\s+\d{4}|present|current)/i) || 
          line.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i) ||
          (line.includes('|') && (line.match(/\d{4}/) || line.match(/present|current/i)))) {
        
        if (waitingForDateAfterCompany || waitingForDateAfterUniversity) {
          // Right-align dates
          const textWidth = font.widthOfTextAtSize(line, TYPOGRAPHY.body.size)
          const rightX = PAGE_CONFIG.width - PAGE_CONFIG.margin.right - textWidth
          page.drawText(line, {
            x: rightX,
            y: yPosition,
            size: TYPOGRAPHY.body.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          waitingForDateAfterCompany = false
          waitingForDateAfterUniversity = false
        } else {
          // Left-align for other cases
          page.drawText(line, {
            x: PAGE_CONFIG.margin.left,
            y: yPosition,
            size: TYPOGRAPHY.body.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
        }
        yPosition -= TYPOGRAPHY.body.lineHeight + SPACING.paragraphSpacing
        i++
        continue
      }

      // ===== BULLET POINTS =====
      if (line.startsWith('•')) {
        const bulletText = line.substring(1).trim()
        if (bulletText) {
          // Draw bullet character
          page.drawText(FORMATTING.bulletStyle.character, {
            x: PAGE_CONFIG.margin.left,
            y: yPosition,
            size: TYPOGRAPHY.bullet.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          // Draw text with word wrapping
          const words = bulletText.split(' ')
          let currentLine = ''
          let xOffset = PAGE_CONFIG.margin.left + SPACING.bulletIndent
          let currentY = yPosition
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const textWidth = font.widthOfTextAtSize(testLine, TYPOGRAPHY.bullet.size)
            
            if (textWidth > maxWidth - SPACING.bulletIndent && currentLine) {
              // Draw current line and start new one
              page.drawText(currentLine, {
                x: xOffset,
                y: currentY,
                size: TYPOGRAPHY.bullet.size,
                font: font,
                color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
              })
              currentY -= TYPOGRAPHY.bullet.size + 2
              currentLine = word
              
              if (currentY < minY) {
                break
              }
            } else {
              currentLine = testLine
            }
          }
          
          if (currentLine) {
            page.drawText(currentLine, {
              x: xOffset,
              y: currentY,
              size: TYPOGRAPHY.bullet.size,
              font: font,
              color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
            })
          }
          
          yPosition = currentY - TYPOGRAPHY.bullet.size - SPACING.betweenBullets - 1
        } else {
          yPosition -= TYPOGRAPHY.body.lineHeight / 2
        }
        i++
        continue
      }

      // ===== REGULAR TEXT (with word wrapping and justification for summary) =====
      if (line) {
        const words = line.split(' ').filter(w => w.length > 0)
        let currentLineWords: string[] = []
        let currentY = yPosition
        const isSummaryParagraph = currentSection === 'PROFESSIONAL SUMMARY'
        
        for (const word of words) {
          const testLine = currentLineWords.length > 0 
            ? currentLineWords.join(' ') + ' ' + word 
            : word
          const textWidth = font.widthOfTextAtSize(testLine, TYPOGRAPHY.body.size)
          
          if (textWidth > maxWidth && currentLineWords.length > 0) {
            // Draw current line
            if (isSummaryParagraph && currentLineWords.length > 1) {
              // Justify text for summary paragraphs
              const lineText = currentLineWords.join(' ')
              const lineWidth = font.widthOfTextAtSize(lineText, TYPOGRAPHY.body.size)
              const totalSpaces = currentLineWords.length - 1
              const extraSpace = (maxWidth - lineWidth) / totalSpaces
              
              let xPos = PAGE_CONFIG.margin.left
              for (let wIdx = 0; wIdx < currentLineWords.length; wIdx++) {
                const word = currentLineWords[wIdx]
                page.drawText(word, {
                  x: xPos,
                  y: currentY,
                  size: TYPOGRAPHY.body.size,
                  font: font,
                  color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
                })
                xPos += font.widthOfTextAtSize(word, TYPOGRAPHY.body.size)
                if (wIdx < currentLineWords.length - 1) {
                  const spaceWidth = font.widthOfTextAtSize(' ', TYPOGRAPHY.body.size) + extraSpace
                  xPos += spaceWidth
                }
              }
            } else {
              // Left-align for non-summary text
              page.drawText(currentLineWords.join(' '), {
                x: PAGE_CONFIG.margin.left,
                y: currentY,
                size: TYPOGRAPHY.body.size,
                font: font,
                color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
              })
            }
            
            currentY -= TYPOGRAPHY.body.lineHeight
            currentLineWords = [word]
            
            if (currentY < minY) {
              break
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
            const lineWidth = font.widthOfTextAtSize(lineText, TYPOGRAPHY.body.size)
            const totalSpaces = currentLineWords.length - 1
            const extraSpace = totalSpaces > 0 ? (maxWidth - lineWidth) / totalSpaces : 0
            
            let xPos = PAGE_CONFIG.margin.left
            for (let wIdx = 0; wIdx < currentLineWords.length; wIdx++) {
              const word = currentLineWords[wIdx]
              page.drawText(word, {
                x: xPos,
                y: currentY,
                size: TYPOGRAPHY.body.size,
                font: font,
                color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
              })
              xPos += font.widthOfTextAtSize(word, TYPOGRAPHY.body.size)
              if (wIdx < currentLineWords.length - 1) {
                const spaceWidth = font.widthOfTextAtSize(' ', TYPOGRAPHY.body.size) + extraSpace
                xPos += spaceWidth
              }
            }
          } else {
            // Left-align for non-summary text
            page.drawText(currentLineWords.join(' '), {
              x: PAGE_CONFIG.margin.left,
              y: currentY,
              size: TYPOGRAPHY.body.size,
              font: font,
              color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
            })
          }
        }
        
        yPosition = currentY - TYPOGRAPHY.body.lineHeight - SPACING.paragraphSpacing
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
  link.download = 'resume.pdf'
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
