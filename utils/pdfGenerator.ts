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
  getMinY,
  getRightAlignedX,
  validateTemplate
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
 * Generate PDF using ATS-friendly template configuration
 * Simple text format - no tables, no complex layouts
 * This is completely generic - works for ALL users with their own data
 */
export async function generatePDF(textContent: string) {
  // Input validation
  if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
    throw new Error('Invalid text content for PDF generation')
  }

  // Validate template configuration
  if (!validateTemplate()) {
    throw new Error('Invalid template configuration')
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
    let isFirstLine = true

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

      // ===== NAME (First substantial line, centered, uppercase, bold) =====
      if (isFirstLine && line.length > 3 && line.length < 50 && 
          !line.includes('@') && !line.includes('|') && 
          !line.match(/\d{10,}/) &&
          !line.match(/^(SUMMARY|SKILLS|EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|WORK EXPERIENCE|PROFESSIONAL SUMMARY)$/)) {
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
        isFirstLine = false
        i++
        continue
      }

      // ===== CONTACT INFO (Centered, with separators) =====
      if (line.includes('@') || line.includes('|') || line.match(/linkedin|github|portfolio|phone/i)) {
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
        isFirstLine = false
        i++
        continue
      }

      // ===== SECTION HEADERS (All caps, bold, left-aligned) =====
      const sectionHeaders = [
        'SUMMARY', 'PROFESSIONAL SUMMARY', 'SKILLS', 'TECHNICAL SKILLS',
        'EXPERIENCE', 'WORK EXPERIENCE', 'EDUCATION', 
        'PROJECTS', 'CERTIFICATIONS', 'ACHIEVEMENTS'
      ]
      
      if (line === line.toUpperCase() && sectionHeaders.includes(line)) {
        // Add spacing between sections (only if not first section)
        if (currentSection && currentSection !== '') {
          yPosition -= SPACING.betweenSections
        } else {
          yPosition -= SPACING.beforeSection
        }
        
        currentSection = line
        isFirstLine = false
        
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

      // ===== EXPERIENCE FORMAT: "Job Title — Start – End" (dates right-aligned) =====
      if ((currentSection === 'EXPERIENCE' || currentSection === 'WORK EXPERIENCE') &&
          !line.startsWith('•') &&
          (line.includes(' — ') || line.includes(' —') || line.match(/[A-Za-z].*[—–-].*\d{4}/)) && 
          (line.match(/\d{4}/) || line.toLowerCase().includes('present'))) {
        
        // Parse: "Job Title — Start – End" or "Job Title — Start – Present"
        // Support em dash (—), en dash (–), and regular dash (-) for separator
        let separator = ' — '
        if (!line.includes(' — ')) {
          if (line.includes(' —')) separator = ' —'
          else if (line.includes(' – ')) separator = ' – '
          else if (line.includes(' –')) separator = ' –'
          else if (line.match(/[A-Za-z].*[—–-]/)) {
            const match = line.match(/(.*?)([—–-])(.*)/)
            if (match) {
              separator = match[2]
            }
          }
        }
        
        const parts = line.split(separator)
        if (parts.length === 2) {
          const jobTitle = parts[0].trim()
          const dateRange = parts[1].trim()
          
          // Draw job title on left
          page.drawText(jobTitle, {
            x: PAGE_CONFIG.margin.left,
            y: yPosition,
            size: TYPOGRAPHY.jobTitle.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          // Draw dates on right (right-aligned)
          const dateX = getRightAlignedX(dateRange, TYPOGRAPHY.dates.size, font)
          page.drawText(dateRange, {
            x: dateX,
            y: yPosition,
            size: TYPOGRAPHY.dates.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          yPosition -= TYPOGRAPHY.body.lineHeight + 1
          i++
          continue
        }
      }

      // ===== COMPANY NAME (in EXPERIENCE section, next line after job title) =====
      if ((currentSection === 'EXPERIENCE' || currentSection === 'WORK EXPERIENCE') &&
          !line.startsWith('•') &&
          !line.includes(' — ') &&
          !line.includes(' —') &&
          !line.includes(' – ') &&
          !line.match(/\d{4}[-–—]/) &&
          i > 0 &&
          !lines[i-1].startsWith('•') &&
          (lines[i-1].includes(' — ') || lines[i-1].includes(' —') || lines[i-1].includes(' – ') || 
           lines[i-1].match(/^(EXPERIENCE|WORK EXPERIENCE)$/))) {
        
        // Draw company name (bold, uppercase)
        const companyText = line.toUpperCase()
        page.drawText(companyText, {
          x: PAGE_CONFIG.margin.left,
          y: yPosition,
          size: TYPOGRAPHY.company.size,
          font: boldFont,
          color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
        })
        
        yPosition -= TYPOGRAPHY.body.lineHeight + SPACING.betweenEntries
        i++
        continue
      }

      // ===== EDUCATION FORMAT: "Degree — Start – End" (dates right-aligned) =====
      if (currentSection === 'EDUCATION' &&
          !line.startsWith('•') &&
          (line.includes(' — ') || line.includes(' —') || line.match(/[A-Za-z].*[—–-].*\d{4}/)) &&
          (line.match(/\d{4}/) || line.toLowerCase().includes('present'))) {
        
        // Parse: "Degree — Start – End"
        // Support em dash (—), en dash (–), and regular dash (-) for separator
        let separator = ' — '
        if (!line.includes(' — ')) {
          if (line.includes(' —')) separator = ' —'
          else if (line.includes(' – ')) separator = ' – '
          else if (line.includes(' –')) separator = ' –'
          else if (line.match(/[A-Za-z].*[—–-]/)) {
            const match = line.match(/(.*?)([—–-])(.*)/)
            if (match) {
              separator = match[2]
            }
          }
        }
        
        const parts = line.split(separator)
        if (parts.length === 2) {
          const degree = parts[0].trim()
          const dateRange = parts[1].trim()
          
          // Draw degree on left
          page.drawText(degree, {
            x: PAGE_CONFIG.margin.left,
            y: yPosition,
            size: TYPOGRAPHY.jobTitle.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          // Draw dates on right (right-aligned)
          const dateX = getRightAlignedX(dateRange, TYPOGRAPHY.dates.size, font)
          page.drawText(dateRange, {
            x: dateX,
            y: yPosition,
            size: TYPOGRAPHY.dates.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          yPosition -= TYPOGRAPHY.body.lineHeight + 1
          i++
          continue
        }
      }

      // ===== UNIVERSITY NAME (in EDUCATION section, next line after degree) =====
      if (currentSection === 'EDUCATION' &&
          !line.startsWith('•') &&
          !line.includes(' — ') &&
          !line.includes(' —') &&
          !line.includes(' – ') &&
          !line.match(/\d{4}[-–—]/) &&
          i > 0 &&
          (lines[i-1].includes(' — ') || lines[i-1].includes(' —') || lines[i-1].includes(' – '))) {
        
        // Draw university name (bold)
        page.drawText(line, {
          x: PAGE_CONFIG.margin.left,
          y: yPosition,
          size: TYPOGRAPHY.company.size,
          font: boldFont,
          color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
        })
        
        yPosition -= TYPOGRAPHY.body.lineHeight + SPACING.betweenEntries
        i++
        continue
      }

      // ===== BULLET POINTS (with proper indentation) =====
      if (line.startsWith('•')) {
        const bulletText = line.substring(1).trim()
        if (bulletText) {
          // Draw bullet character at left indent position
          const bulletX = PAGE_CONFIG.margin.left + SPACING.bulletLeftIndent - font.widthOfTextAtSize('•', TYPOGRAPHY.bullet.size)
          page.drawText(FORMATTING.bulletStyle.character, {
            x: bulletX,
            y: yPosition,
            size: TYPOGRAPHY.bullet.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
          
          // Draw text with word wrapping and hanging indent
          const words = bulletText.split(' ')
          let currentLine = ''
          let xOffset = PAGE_CONFIG.margin.left + SPACING.bulletLeftIndent
          let currentY = yPosition
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const textWidth = font.widthOfTextAtSize(testLine, TYPOGRAPHY.bullet.size)
            
            if (textWidth > maxWidth - SPACING.bulletLeftIndent && currentLine) {
              // Draw current line and start new one
              page.drawText(currentLine, {
                x: xOffset,
                y: currentY,
                size: TYPOGRAPHY.bullet.size,
                font: font,
                color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
              })
              currentY -= TYPOGRAPHY.bullet.size * 1.1 // Line spacing 1.1
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
          
          yPosition = currentY - TYPOGRAPHY.bullet.size * 1.1 - SPACING.betweenBullets
        } else {
          yPosition -= TYPOGRAPHY.body.lineHeight / 2
        }
        i++
        continue
      }

      // ===== REGULAR TEXT (with word wrapping) =====
      if (line) {
        const words = line.split(' ').filter(w => w.length > 0)
        let currentLineWords: string[] = []
        let currentY = yPosition
        
        for (const word of words) {
          const testLine = currentLineWords.length > 0 
            ? currentLineWords.join(' ') + ' ' + word 
            : word
          const textWidth = font.widthOfTextAtSize(testLine, TYPOGRAPHY.body.size)
          
          if (textWidth > maxWidth && currentLineWords.length > 0) {
            // Draw current line
            page.drawText(currentLineWords.join(' '), {
              x: PAGE_CONFIG.margin.left,
              y: currentY,
              size: TYPOGRAPHY.body.size,
              font: font,
              color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
            })
            
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
          page.drawText(currentLineWords.join(' '), {
            x: PAGE_CONFIG.margin.left,
            y: currentY,
            size: TYPOGRAPHY.body.size,
            font: font,
            color: rgb(COLORS.text.r, COLORS.text.g, COLORS.text.b),
          })
        }
        
        yPosition = currentY - TYPOGRAPHY.body.lineHeight - SPACING.paragraphSpacing
        isFirstLine = false
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

