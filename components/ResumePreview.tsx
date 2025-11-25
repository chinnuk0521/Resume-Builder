'use client'

import { generatePDF } from '@/utils/pdfGenerator'

interface ResumePreviewProps {
  profileData?: any
  optimizedResume?: string
}

export default function ResumePreview({ profileData, optimizedResume }: ResumePreviewProps) {
  const formatResume = () => {
    if (optimizedResume) {
      return optimizedResume
    }

    if (!profileData) {
      return 'Start building your resume to see the preview here...'
    }

    let resume = ''

    // Name
    resume += `${profileData.profile.name || 'Your Name'}\n\n`

    // Contact
    const contactParts: string[] = []
    if (profileData.profile.email) contactParts.push(profileData.profile.email)
    if (profileData.profile.phone) contactParts.push(profileData.profile.phone)
    if (profileData.profile.linkedin) contactParts.push(profileData.profile.linkedin)
    if (profileData.profile.portfolio) contactParts.push(profileData.profile.portfolio)
    if (profileData.profile.github) contactParts.push(profileData.profile.github)

    if (contactParts.length > 0) {
      resume += `${contactParts.join(' | ')}\n\n`
    }

    // Professional Summary
    if (profileData.profile.professional_summary) {
      resume += `PROFESSIONAL SUMMARY\n\n${profileData.profile.professional_summary}\n\n`
    }

    // Experience
    if (profileData.experiences && profileData.experiences.length > 0) {
      resume += `EXPERIENCE\n\n`
      profileData.experiences.forEach((exp: any) => {
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
    if (profileData.education && profileData.education.length > 0) {
      resume += `EDUCATION\n\n`
      profileData.education.forEach((edu: any) => {
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
    if (profileData.skills && profileData.skills.length > 0) {
      resume += `SKILLS\n\n`
      const skillsByCategory: { [key: string]: string[] } = {}
      profileData.skills.forEach((skill: any) => {
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
    if (profileData.projects && profileData.projects.length > 0) {
      resume += `PROJECTS\n\n`
      profileData.projects.forEach((proj: any) => {
        if (proj.title) {
          resume += `${proj.title}\n\n`
          if (proj.description) resume += `• ${proj.description}\n\n`
        }
      })
    }

    // Achievements
    if (profileData.achievements && profileData.achievements.length > 0) {
      resume += `ACHIEVEMENTS\n\n`
      profileData.achievements.forEach((ach: any) => {
        const text = ach.achievement_text || ach
        if (text) {
          resume += `• ${text}\n\n`
        }
      })
    }

    // Certifications
    if (profileData.certifications && profileData.certifications.length > 0) {
      resume += `CERTIFICATIONS\n\n`
      profileData.certifications.forEach((cert: any) => {
        const name = cert.certification_name || cert
        if (name) {
          resume += `• ${name}\n\n`
        }
      })
    }

    // Links
    resume += `LINKS\n\n`
    if (profileData.profile.linkedin) {
      resume += `LinkedIn: ${profileData.profile.linkedin}\n\n`
    }
    if (profileData.profile.portfolio) {
      resume += `Portfolio: ${profileData.profile.portfolio}\n\n`
    }
    if (profileData.profile.github) {
      resume += `GitHub: ${profileData.profile.github}\n\n`
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">Resume Preview</h2>
        {resumeText && !resumeText.includes('Start building') && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            Download PDF
          </button>
        )}
      </div>
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 min-h-[600px]">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
          {resumeText}
        </pre>
      </div>
    </div>
  )
}

