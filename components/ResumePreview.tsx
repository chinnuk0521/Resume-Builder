'use client'

import { generatePDF } from '@/utils/pdfGenerator'

interface ResumePreviewProps {
  profileData?: any
  optimizedResume?: string
  liveData?: any // For real-time preview updates
}

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

    // Name
    resume += `${dataToUse.profile?.name || 'Your Name'}\n\n`

    // Contact
    const contactParts: string[] = []
    if (dataToUse.profile?.email) contactParts.push(dataToUse.profile.email)
    if (dataToUse.profile?.phone) contactParts.push(dataToUse.profile.phone)
    if (dataToUse.profile?.linkedin) contactParts.push(dataToUse.profile.linkedin)
    if (dataToUse.profile?.portfolio) contactParts.push(dataToUse.profile.portfolio)
    if (dataToUse.profile?.github) contactParts.push(dataToUse.profile.github)

    if (contactParts.length > 0) {
      resume += `${contactParts.join(' | ')}\n\n`
    }

    // Professional Summary
    if (dataToUse.profile?.professional_summary) {
      resume += `PROFESSIONAL SUMMARY\n\n${dataToUse.profile.professional_summary}\n\n`
    }

    // Experience
    if (dataToUse.experiences && dataToUse.experiences.length > 0) {
      resume += `EXPERIENCE\n\n`
      dataToUse.experiences.forEach((exp: any) => {
        resume += `${exp.job_title || 'Job Title'} — ${exp.company || 'Company'}\n\n`
        if (exp.start_date || exp.end_date) {
          resume += `${exp.start_date || 'Start Date'} – ${exp.end_date || 'Present'}\n\n`
        }
        if (exp.bullets && Array.isArray(exp.bullets) && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet: string) => {
            if (bullet.trim()) {
              resume += `• ${bullet}\n\n`
            }
          })
        }
      })
    }

    // Education
    if (dataToUse.education && dataToUse.education.length > 0) {
      resume += `EDUCATION\n\n`
      dataToUse.education.forEach((edu: any) => {
        resume += `${edu.degree || 'Degree'} — ${edu.university || 'University'}\n\n`
        const details: string[] = []
        if (edu.years) details.push(edu.years)
        if (edu.location) details.push(edu.location)
        if (details.length > 0) {
          resume += `${details.join(' | ')}\n\n`
        }
      })
    }

    // Skills
    if (dataToUse.skills && dataToUse.skills.length > 0) {
      resume += `SKILLS\n\n`
      const skillsByCategory: { [key: string]: string[] } = {}
      dataToUse.skills.forEach((skill: any) => {
        const cat = skill.category || 'others'
        if (!skillsByCategory[cat]) skillsByCategory[cat] = []
        skillsByCategory[cat].push(skill.skill_name)
      })

      Object.entries(skillsByCategory).forEach(([category, skillNames]) => {
        if (skillNames.length > 0) {
          resume += `• ${category.charAt(0).toUpperCase() + category.slice(1)}: ${skillNames.join(', ')}\n\n`
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

    // Links
    resume += `LINKS\n\n`
    if (dataToUse.profile?.linkedin) {
      resume += `LinkedIn: ${dataToUse.profile.linkedin}\n\n`
    }
    if (dataToUse.profile?.portfolio) {
      resume += `Portfolio: ${dataToUse.profile.portfolio}\n\n`
    }
    if (dataToUse.profile?.github) {
      resume += `GitHub: ${dataToUse.profile.github}\n\n`
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
            <p className="text-gray-300 text-sm mt-0.5">Live preview as you type</p>
          </div>
          {resumeText && !resumeText.includes('Start building') && (
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
            >
              📥 Download PDF
            </button>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 bg-gray-50 p-6 min-h-[600px] max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="bg-white rounded-lg p-8 shadow-inner border border-gray-200">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
            {resumeText}
          </pre>
        </div>
      </div>
    </div>
  )
}
