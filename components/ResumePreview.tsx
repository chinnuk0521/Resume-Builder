'use client'

import { downloadPDF, previewPDF } from '@/utils/pdfGenerator'
import { HiOutlineArrowDownTray, HiOutlineEye, HiOutlinePrinter, HiOutlineDocumentArrowDown } from 'react-icons/hi2'
import { useState } from 'react'

interface ResumePreviewProps {
  profileData?: any
  optimizedResume?: string
  liveData?: any // For real-time preview updates
}

// A4 dimensions for preview (maintaining aspect ratio)
// A4: 210mm x 297mm = 595.3 x 841.9 points
// For preview, we'll use a scaled version that fits the screen
const A4_ASPECT_RATIO = 297 / 210 // Height / Width = 1.414

export default function ResumePreview({ profileData, optimizedResume, liveData }: ResumePreviewProps) {
  // Use liveData if available, otherwise fall back to profileData
  const dataToUse = liveData || profileData

  const formatResume = () => {
    if (optimizedResume) {
      return optimizedResume
    }

    if (!dataToUse) {
      return 'Start building your resume to see the preview here...'
    }

    let resume = ''

    // Name - combine first, middle, and last name
    const firstName = dataToUse.profile?.first_name || ''
    const middleName = dataToUse.profile?.middle_name || ''
    const lastName = dataToUse.profile?.last_name || ''
    const fullName = [firstName, middleName, lastName].filter(n => n && n.trim()).join(' ') || 
                      dataToUse.profile?.name || // Fallback to old 'name' field
                      'Your Name'
    resume += `${fullName.toUpperCase()}\n\n`

    // Contact - format with labels for links
    const contactParts: string[] = []
    if (dataToUse.profile?.email) contactParts.push(dataToUse.profile.email)
    if (dataToUse.profile?.phone) contactParts.push(dataToUse.profile.phone)
    
    // Store URLs separately for hyperlinks, but show labels in text
    const contactInfo: { text: string, url?: string }[] = []
    if (dataToUse.profile?.email) contactInfo.push({ text: dataToUse.profile.email })
    if (dataToUse.profile?.phone) contactInfo.push({ text: dataToUse.profile.phone })
    if (dataToUse.profile?.linkedin) {
      const linkedinUrl = dataToUse.profile.linkedin.includes('http') 
        ? dataToUse.profile.linkedin 
        : `https://${dataToUse.profile.linkedin}`
      contactInfo.push({ text: 'LinkedIn', url: linkedinUrl })
    }
    if (dataToUse.profile?.portfolio) {
      const portfolioUrl = dataToUse.profile.portfolio.includes('http') 
        ? dataToUse.profile.portfolio 
        : `https://${dataToUse.profile.portfolio}`
      contactInfo.push({ text: 'Portfolio', url: portfolioUrl })
    }
    if (dataToUse.profile?.github) {
      const githubUrl = dataToUse.profile.github.includes('http') 
        ? dataToUse.profile.github 
        : `https://${dataToUse.profile.github}`
      contactInfo.push({ text: 'GitHub', url: githubUrl })
    }

    if (contactInfo.length > 0) {
      // Format: email | phone | LinkedIn | Portfolio | GitHub
      // Store URLs in a special format for PDF generator to parse
      const contactText = contactInfo.map(ci => ci.text).join(' | ')
      const contactUrls = contactInfo.filter(ci => ci.url).map(ci => `${ci.text}::${ci.url}`).join('||')
      resume += `${contactText}${contactUrls ? `||URLS:${contactUrls}` : ''}\n\n`
    }

    // Professional Summary
    if (dataToUse.profile?.professional_summary) {
      resume += `PROFESSIONAL SUMMARY\n\n${dataToUse.profile.professional_summary}\n\n`
    }

    // Education - Markdown table format
    if (dataToUse.education && dataToUse.education.length > 0) {
      resume += `## Education\n\n`
      dataToUse.education.forEach((edu: any) => {
        // Map fields (support both old and new format)
        const school = edu.school || edu.university || 'University'
        const location = edu.location || ''
        const startYear = edu.start_year || (edu.years ? edu.years.split('-')[0].trim() : '')
        const endYear = edu.end_year || (edu.years ? edu.years.split('-')[1]?.trim() || 'Present' : 'Present')
        const course = edu.course || edu.degree || 'Degree'
        
        // Format: 2-column table with school on left, location and dates on right
        const dateRange = endYear && endYear !== 'Present' ? `${startYear}–${endYear}` : 
                         startYear ? `${startYear}–Present` : ''
        const rightCell = location && dateRange ? `${location} — ${dateRange}` :
                         location ? location :
                         dateRange ? dateRange : ''
        
        resume += `| ${school} | ${rightCell} |\n`
        resume += `${course}\n\n`
      })
    }

    // Work Experience - Markdown table format
    if (dataToUse.experiences && dataToUse.experiences.length > 0) {
      resume += `## Work Experience\n\n`
      dataToUse.experiences.forEach((exp: any) => {
        // Map fields (support both old and new format)
        const jobTitle = exp.job_title || 'Job Title'
        const location = exp.location || ''
        const startYear = exp.start_year || (exp.start_date ? new Date(exp.start_date).getFullYear().toString() : '')
        const endYear = exp.end_year || (exp.end_date ? (exp.end_date === 'Present' ? 'Present' : new Date(exp.end_date).getFullYear().toString()) : 'Present')
        const company = exp.company || 'Company'
        const achievements = exp.achievements || exp.bullets || []
        
        // Format: 2-column table with job title on left, location and dates on right
        const dateRange = endYear && endYear !== 'Present' ? `${startYear}–${endYear}` : 
                         startYear ? `${startYear}–Present` : ''
        const rightCell = location && dateRange ? `${location} — ${dateRange}` :
                         location ? location :
                         dateRange ? dateRange : ''
        
        resume += `| ${jobTitle} | ${rightCell} |\n`
        resume += `${company}\n`
        
        // Bullet list of achievements/responsibilities
        if (Array.isArray(achievements) && achievements.length > 0) {
          achievements.forEach((achievement: string) => {
            if (achievement && achievement.trim()) {
              resume += `• ${achievement.trim()}\n`
            }
          })
        }
        resume += `\n`
      })
    }

    // Skills (matching image structure: TECHNICAL SKILLS with categories)
    if (dataToUse.skills && dataToUse.skills.length > 0) {
      resume += `TECHNICAL SKILLS\n\n`
      const skillsByCategory: { [key: string]: string[] } = {}
      dataToUse.skills.forEach((skill: any) => {
        const cat = skill.category || 'others'
        // Map category names to match image format
        const categoryMap: { [key: string]: string } = {
          'programming': 'Programming',
          'tools': 'Tools',
          'databases': 'Databases',
          'cloud': 'Cloud',
          'others': 'Others'
        }
        const displayCategory = categoryMap[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)
        if (!skillsByCategory[displayCategory]) skillsByCategory[displayCategory] = []
        skillsByCategory[displayCategory].push(skill.skill_name)
      })

      Object.entries(skillsByCategory).forEach(([category, skillNames]) => {
        if (skillNames.length > 0) {
          resume += `• ${category}: ${skillNames.join(', ')}\n\n`
        }
      })
    }

    // Projects
    if (dataToUse.projects && dataToUse.projects.length > 0) {
      resume += `PROJECTS\n\n`
      dataToUse.projects.forEach((proj: any) => {
        if (proj.title) {
          resume += `${proj.title}\n\n`
          if (proj.description) resume += `• ${proj.description}\n\n`
          if (proj.contribution) resume += `• ${proj.contribution}\n\n`
          if (proj.tech_stack) resume += `• Technologies: ${proj.tech_stack}\n\n`
        }
      })
    }

    // Achievements
    if (dataToUse.achievements && dataToUse.achievements.length > 0) {
      resume += `ACHIEVEMENTS\n\n`
      dataToUse.achievements.forEach((ach: any) => {
        const text = ach.achievement_text || ach
        if (text) {
          resume += `• ${text}\n\n`
        }
      })
    }

    // Certifications
    if (dataToUse.certifications && dataToUse.certifications.length > 0) {
      resume += `CERTIFICATIONS\n\n`
      dataToUse.certifications.forEach((cert: any) => {
        const name = cert.certification_name || cert
        if (name) {
          resume += `• ${name}\n\n`
        }
      })
    }

    return resume.trim() || 'Start building your resume to see the preview here...'
  }

  const resumeText = formatResume()
  const [isGenerating, setIsGenerating] = useState(false)

  const handlePreview = async () => {
    if (!resumeText || resumeText.includes('Start building')) {
      alert('Please build your resume first')
      return
    }

    setIsGenerating(true)
    try {
      await previewPDF(resumeText)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!resumeText || resumeText.includes('Start building')) {
      alert('Please build your resume first')
      return
    }

    setIsGenerating(true)
    try {
      await downloadPDF(resumeText)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrintPreview = () => {
    if (!resumeText || resumeText.includes('Start building')) {
      alert('Please build your resume first')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Resume - Print Preview</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 0.5in;
              }
            }
            body {
              font-family: 'Times New Roman', serif;
              font-size: 11pt;
              line-height: 1.4;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 20px;
              color: #000;
            }
            h1 {
              font-size: 18pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .section {
              margin-top: 15px;
            }
            .section-title {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-top: 15px;
              margin-bottom: 8px;
              border-bottom: 1px solid #000;
            }
            .contact-info {
              text-align: center;
              margin-bottom: 15px;
              font-size: 10pt;
            }
            ul {
              margin: 5px 0;
              padding-left: 20px;
            }
            li {
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <pre style="white-space: pre-wrap; font-family: 'Times New Roman', serif; font-size: 11pt;">${resumeText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handleExportWord = () => {
    if (!resumeText || resumeText.includes('Start building')) {
      alert('Please build your resume first')
      return
    }

    // Create a simple Word document using HTML format
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Resume</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              font-size: 11pt;
              line-height: 1.4;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              font-size: 18pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .section-title {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-top: 15px;
              margin-bottom: 8px;
            }
            .contact-info {
              text-align: center;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <pre style="white-space: pre-wrap; font-family: 'Times New Roman', serif;">${resumeText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'resume.doc'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Resume Preview</h2>
            <p className="text-gray-300 text-xs mt-0.5">A4 Format - Live preview as you type</p>
          </div>
          {resumeText && !resumeText.includes('Start building') && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handlePreview}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-all"
                title="Preview PDF"
              >
                <HiOutlineEye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Preview'}</span>
              </button>
              <button
                onClick={handlePrintPreview}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all"
                title="Print Preview"
              >
                <HiOutlinePrinter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-gray-900 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold transition-all"
                title="Download PDF"
              >
                <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'PDF'}</span>
              </button>
              <button
                onClick={handleExportWord}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all"
                title="Export as Word"
              >
                <HiOutlineDocumentArrowDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Word</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 bg-gray-50 p-8 overflow-y-auto">
        {/* A4-sized preview container */}
        <div className="mx-auto bg-white shadow-lg" style={{
          width: '100%',
          maxWidth: '595px', // A4 width in pixels (scaled for screen)
          minHeight: '842px', // A4 height in pixels (scaled for screen)
          aspectRatio: `${210 / 297}`, // A4 aspect ratio
          padding: '80px', // Increased padding for less congestion
          boxSizing: 'border-box',
          fontSize: '10px',
          lineHeight: '14px', // Increased line height
          fontFamily: 'monospace'
        }}>
          <div className="text-gray-800 leading-relaxed" style={{
            fontSize: '10px',
            lineHeight: '12px',
            fontFamily: 'monospace',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            textAlign: 'justify'
          }}>
            {resumeText.split('\n').map((line, idx) => {
              // Check if it's the name (first line, all caps, not contact info, not Markdown header)
              if (idx === 0 && line.length > 3 && line.length < 50 && 
                  !line.includes('@') && !line.includes('|') && !line.startsWith('##') &&
                  !line.match(/^(PROFESSIONAL SUMMARY|EXPERIENCE|EDUCATION|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS|WORK EXPERIENCE|TECHNICAL SKILLS)$/)) {
                return (
                  <div key={idx} className="text-center font-bold mb-2" style={{ fontSize: '25px' }}>
                    {line}
                  </div>
                )
              }
              
              // Check if it's contact info
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
                }
                
                const parts = displayLine.split('|').map(p => p.trim())
                return (
                  <div key={idx} className="text-center mb-6">
                    {parts.map((part, partIdx) => {
                      // Check if this part has a URL mapping
                      const url = urlMap[part]
                      
                      return (
                        <span key={partIdx}>
                          {url ? (
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {part}
                            </a>
                          ) : (
                            <span>{part}</span>
                          )}
                          {partIdx < parts.length - 1 && <span className="mx-2"> | </span>}
                        </span>
                      )
                    })}
                  </div>
                )
              }
              
              // Check for Markdown table row (| Left | Right |)
              if (line.startsWith('| ') && line.endsWith(' |') && line.includes(' | ')) {
                const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0)
                if (cells.length >= 2) {
                  return (
                    <div key={idx} className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{cells[0]}</span>
                      <span className="text-right">{cells[1]}</span>
                    </div>
                  )
                }
              }
              
              // Check for special format with ||DATE: marker
              if (line.includes('||DATE:')) {
                const parts = line.split('||DATE:')
                if (parts.length === 2) {
                  const leftText = parts[0].trim()
                  const rightText = parts[1].trim()
                  return (
                    <div key={idx} className="flex justify-between items-center mb-2">
                      <span>{leftText}</span>
                      <span className="text-right">{rightText}</span>
                    </div>
                  )
                }
              }
              
              // Check for Markdown section header (## Education, ## Work Experience)
              if (line.startsWith('## ')) {
                const sectionName = line.substring(3).trim()
                return (
                  <div key={idx} className="font-bold text-sm uppercase mt-4 mb-2">
                    {sectionName}
                  </div>
                )
              }
              
              // Check if it's a date/location line that should be right-aligned
              const isDateLocation = (line.match(/\w+\s+\d{4}\s*[-–—]/) || 
                                     line.match(/\d{4}\s*[-–—]/) ||
                                     (line.includes('|') && (line.match(/\d{4}/) || line.match(/present|current/i))))
              
              // Check if previous lines indicate we're in an experience/education entry
              const linesArray = resumeText.split('\n')
              let foundCompanyOrUniversity = false
              
              // Look backwards to find company/university
              for (let j = idx - 1; j >= 0 && j >= idx - 5; j--) {
                const prevLine = linesArray[j]?.trim() || ''
                if (!prevLine) continue
                
                // Check if it's a section header
                if (prevLine.match(/^(WORK EXPERIENCE|EXPERIENCE|EDUCATION)$/)) {
                  break
                }
                
                // Check if it's a company/university (not a date, not a bullet, not a job title/degree with ||DATE:)
                if (!prevLine.includes('—') && 
                    !prevLine.includes('•') && 
                    !prevLine.match(/\d{4}\s*[-–—]/) &&
                    !prevLine.match(/\w+\s+\d{4}\s*[-–—]/) &&
                    !prevLine.includes('|') &&
                    !prevLine.includes('||DATE:')) {
                  foundCompanyOrUniversity = true
                  break
                }
              }
              
              if (isDateLocation && foundCompanyOrUniversity) {
                return (
                  <div key={idx} className="whitespace-pre-wrap text-right">
                    {line || '\u00A0'}
                  </div>
                )
              }
              
              // Regular line
              return (
                <div key={idx} className="whitespace-pre-wrap">
                  {line || '\u00A0'}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
