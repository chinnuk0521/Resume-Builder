'use client'

import { generatePDF } from '@/utils/pdfGenerator'
import { HiOutlineArrowDownTray } from 'react-icons/hi2'

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

    // Education (matching image structure: University first, then degree, location, dates)
    if (dataToUse.education && dataToUse.education.length > 0) {
      resume += `EDUCATION\n\n`
      dataToUse.education.forEach((edu: any) => {
        // University name first (bold in PDF)
        resume += `${edu.university || 'University'}\n\n`
        // Degree
        resume += `${edu.degree || 'Degree'}\n\n`
        // Years and location - will be right-aligned in PDF
        const details: string[] = []
        if (edu.years) details.push(edu.years)
        if (edu.location) details.push(edu.location)
        if (details.length > 0) {
          resume += `${details.join(' | ')}\n\n`
        }
      })
    }

    // Experience (matching image structure: Company first, then job title, dates, bullets)
    if (dataToUse.experiences && dataToUse.experiences.length > 0) {
      resume += `WORK EXPERIENCE\n\n`
      dataToUse.experiences.forEach((exp: any) => {
        // Company name first (bold in PDF)
        resume += `${exp.company || 'Company'}\n\n`
        // Job title
        if (exp.job_title) {
          resume += `${exp.job_title}\n\n`
        }
        // Dates
        if (exp.start_date || exp.end_date) {
          resume += `${exp.start_date || 'Start Date'} – ${exp.end_date || 'Present'}\n\n`
        }
        // Bullet points
        if (exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet: string) => {
            if (bullet.trim()) {
              resume += `• ${bullet}\n\n`
            }
          })
        }
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

  const handleDownload = async () => {
    if (!resumeText || resumeText.includes('Start building')) {
      alert('Please build your resume first')
      return
    }

    try {
      await generatePDF(resumeText)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Resume Preview</h2>
            <p className="text-gray-300 text-sm mt-0.5">A4 Format - Live preview as you type</p>
          </div>
          {resumeText && !resumeText.includes('Start building') && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              <HiOutlineArrowDownTray className="w-5 h-5" />
              <span>Download PDF</span>
            </button>
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
            maxWidth: '100%'
          }}>
            {resumeText.split('\n').map((line, idx) => {
              // Check if it's the name (first line, all caps, not contact info)
              if (idx === 0 && line.length > 3 && line.length < 50 && 
                  !line.includes('@') && !line.includes('|') &&
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
              
              // Check if it's a date/location line that should be right-aligned
              // (follows a company or university name)
              const isDateLocation = (line.match(/\w+\s+\d{4}\s*[-–—]/) || 
                                     line.match(/\d{4}\s*[-–—]/) ||
                                     (line.includes('|') && line.match(/\d{4}/)))
              const prevLine = idx > 0 ? resumeText.split('\n')[idx - 1] : ''
              const isAfterCompany = prevLine && 
                                    !prevLine.includes('—') && 
                                    !prevLine.includes('•') &&
                                    !prevLine.match(/^(PROFESSIONAL SUMMARY|WORK EXPERIENCE|EXPERIENCE|EDUCATION|TECHNICAL SKILLS|SKILLS|ACHIEVEMENTS|PROJECTS|CERTIFICATIONS|LINKS)$/)
              
              if (isDateLocation && isAfterCompany) {
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
