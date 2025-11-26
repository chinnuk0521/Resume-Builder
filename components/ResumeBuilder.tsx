'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { 
  HiOutlineUser, 
  HiOutlineDocumentText, 
  HiOutlineBriefcase, 
  HiOutlineAcademicCap,
  HiOutlineWrenchScrewdriver,
  HiOutlineRocketLaunch,
  HiOutlineTrophy,
  HiOutlineDocumentCheck,
  HiCheckCircle,
  HiXCircle,
  HiOutlineInformationCircle,
  HiOutlineClipboard,
  HiOutlineSquare2Stack,
  HiOutlineTrash,
  HiOutlineSparkles,
  HiOutlineArrowDownTray
} from 'react-icons/hi2'

interface ResumeBuilderProps {
  profileData: any
  onSave: () => void
  onDataChange?: (data: any) => void // Callback for real-time updates
}

export default function ResumeBuilder({ profileData, onSave, onDataChange }: ResumeBuilderProps) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')
  const [saveMessage, setSaveMessage] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showTips, setShowTips] = useState<{ [key: string]: boolean }>({})

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    portfolio: '',
    professional_summary: ''
  })

  const [experiences, setExperiences] = useState<any[]>([])
  const [education, setEducation] = useState<any[]>([])
  const [skills, setSkills] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [certifications, setCertifications] = useState<any[]>([])
  const [skillInputs, setSkillInputs] = useState<{ [key: string]: string }>({
    programming: '',
    tools: '',
    databases: '',
    cloud: '',
    others: ''
  })

  useEffect(() => {
    if (profileData) {
      // Handle both old 'name' field and new separate name fields
      const profile = profileData.profile
      let firstName = profile.first_name || ''
      let lastName = profile.last_name || ''
      let middleName = profile.middle_name || ''
      
      // If new fields don't exist, try to split the old 'name' field
      if (!firstName && !lastName && profile.name) {
        const nameParts = profile.name.trim().split(/\s+/)
        if (nameParts.length >= 2) {
          firstName = nameParts[0]
          lastName = nameParts.slice(-1)[0]
          if (nameParts.length > 2) {
            middleName = nameParts.slice(1, -1).join(' ')
          }
        } else if (nameParts.length === 1) {
          firstName = nameParts[0]
        }
      }
      
      setFormData({
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        email: profile.email || '',
        phone: profile.phone || '',
        linkedin: profile.linkedin || '',
        github: profile.github || '',
        portfolio: profile.portfolio || '',
        professional_summary: profile.professional_summary || ''
      })
      setExperiences(profileData.experiences || [])
      setEducation(profileData.education || [])
      setSkills(profileData.skills || [])
      setProjects(profileData.projects || [])
      setAchievements(profileData.achievements || [])
      setCertifications(profileData.certifications || [])
    }
  }, [profileData])

  // Real-time preview updates
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        profile: formData,
        experiences,
        education,
        skills,
        projects,
        achievements,
        certifications
      })
    }
  }, [formData, experiences, education, skills, projects, achievements, certifications, onDataChange])

  const handleSave = async (silent = false) => {
    if (!user) return

    if (!silent) {
      setSaving(true)
      setSaveMessage('')
    }
    try {
      let profileId = profileData?.profile?.id

      // Clean and validate data before saving
      const cleanedFormData = {
        first_name: (formData.first_name || '').trim(),
        last_name: (formData.last_name || '').trim(),
        middle_name: (formData.middle_name || '').trim(),
        email: (formData.email || '').trim().toLowerCase(),
        phone: (formData.phone || '').trim(),
        linkedin: (formData.linkedin || '').trim(),
        github: (formData.github || '').trim(),
        portfolio: (formData.portfolio || '').trim(),
        professional_summary: (formData.professional_summary || '').trim()
      }

      if (profileId) {
        const { error } = await supabase
          .from('user_profiles')
          .update(cleanedFormData)
          .eq('id', profileId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            ...cleanedFormData
          })
          .select()
          .single()

        if (error) throw error
        profileId = data.id
      }

      // Save experiences - clean and validate
      if (experiences.length > 0) {
        if (profileData?.experiences?.length > 0) {
          await supabase
            .from('experiences')
            .delete()
            .eq('user_profile_id', profileId)
        }
        const cleanedExperiences = experiences
          .filter(exp => exp.job_title && exp.company) // Only save valid experiences
          .map((exp, idx) => ({
            user_profile_id: profileId,
            job_title: (exp.job_title || '').trim(),
            company: (exp.company || '').trim(),
            start_date: (exp.start_date || '').trim(),
            end_date: (exp.end_date || '').trim() || null,
            bullets: Array.isArray(exp.bullets) ? exp.bullets.filter((b: any) => b && typeof b === 'string' && b.trim()) : []
          }))
        
        if (cleanedExperiences.length > 0) {
          await supabase
            .from('experiences')
            .insert(cleanedExperiences.map((exp, idx) => ({
              ...exp,
              order_index: idx
            })))
        }
      }

      // Save education - clean and validate
      if (education.length > 0) {
        if (profileData?.education?.length > 0) {
          await supabase
            .from('education')
            .delete()
            .eq('user_profile_id', profileId)
        }
        const cleanedEducation = education
          .filter(edu => edu.degree && edu.university) // Only save valid education
          .map((edu, idx) => ({
            user_profile_id: profileId,
            degree: (edu.degree || '').trim(),
            university: (edu.university || '').trim(),
            years: (edu.years || '').trim() || null,
            location: (edu.location || '').trim() || null,
            order_index: idx
          }))
        
        if (cleanedEducation.length > 0) {
          await supabase
            .from('education')
            .insert(cleanedEducation)
        }
      }

      // Save skills - clean and validate
      if (skills.length > 0) {
        if (profileData?.skills?.length > 0) {
          await supabase
            .from('skills')
            .delete()
            .eq('user_profile_id', profileId)
        }
        const cleanedSkills = skills
          .filter(skill => skill.skill_name && skill.skill_name.trim()) // Only save valid skills
          .map((skill, idx) => ({
            user_profile_id: profileId,
            category: skill.category || 'others',
            skill_name: (skill.skill_name || '').trim(),
            order_index: idx
          }))
        
        if (cleanedSkills.length > 0) {
          await supabase
            .from('skills')
            .insert(cleanedSkills)
        }
      }

      // Save projects - clean and validate
      if (projects.length > 0) {
        if (profileData?.projects?.length > 0) {
          await supabase
            .from('projects')
            .delete()
            .eq('user_profile_id', profileId)
        }
        const cleanedProjects = projects
          .filter(proj => proj.title && proj.title.trim()) // Only save valid projects
          .map((proj, idx) => ({
            user_profile_id: profileId,
            title: (proj.title || '').trim(),
            description: (proj.description || '').trim() || null,
            contribution: (proj.contribution || '').trim() || null,
            tech_stack: (proj.tech_stack || '').trim() || null,
            order_index: idx
          }))
        
        if (cleanedProjects.length > 0) {
          await supabase
            .from('projects')
            .insert(cleanedProjects)
        }
      }

      // Save achievements - clean and validate
      if (achievements.length > 0) {
        if (profileData?.achievements?.length > 0) {
          await supabase
            .from('achievements')
            .delete()
            .eq('user_profile_id', profileId)
        }
        const cleanedAchievements = achievements
          .map(ach => typeof ach === 'string' ? ach.trim() : (ach?.achievement_text || '').trim())
          .filter(ach => ach.length > 0) // Only save non-empty achievements
          .map((ach, idx) => ({
            user_profile_id: profileId,
            achievement_text: ach,
            order_index: idx
          }))
        
        if (cleanedAchievements.length > 0) {
          await supabase
            .from('achievements')
            .insert(cleanedAchievements)
        }
      }

      // Save certifications - clean and validate
      if (certifications.length > 0) {
        if (profileData?.certifications?.length > 0) {
          await supabase
            .from('certifications')
            .delete()
            .eq('user_profile_id', profileId)
        }
        const cleanedCertifications = certifications
          .map(cert => typeof cert === 'string' ? cert.trim() : (cert?.certification_name || '').trim())
          .filter(cert => cert.length > 0) // Only save non-empty certifications
          .map((cert, idx) => ({
            user_profile_id: profileId,
            certification_name: cert,
            order_index: idx
          }))
        
        if (cleanedCertifications.length > 0) {
          await supabase
            .from('certifications')
            .insert(cleanedCertifications)
        }
      }

      onSave()
      setLastSaved(new Date())
      if (!silent) {
        setSaveMessage('success')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    } catch (error: any) {
      console.error('Error saving resume:', error)
      if (!silent) {
        const errorMessage = error?.message || 'Failed to save. Please try again.'
        setSaveMessage('error:' + errorMessage)
        setTimeout(() => setSaveMessage(''), 5000)
      }
    } finally {
      if (!silent) {
        setSaving(false)
      }
    }
  }

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: HiOutlineUser },
    { id: 'summary', label: 'Summary', icon: HiOutlineDocumentText },
    { id: 'experience', label: 'Experience', icon: HiOutlineBriefcase },
    { id: 'education', label: 'Education', icon: HiOutlineAcademicCap },
    { id: 'skills', label: 'Skills', icon: HiOutlineWrenchScrewdriver },
    { id: 'projects', label: 'Projects', icon: HiOutlineRocketLaunch },
    { id: 'achievements', label: 'Achievements', icon: HiOutlineTrophy },
    { id: 'certifications', label: 'Certifications', icon: HiOutlineDocumentCheck }
  ]

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Calculate progress percentage
  const calculateProgress = () => {
    let completed = 0
    let total = 8

    // Personal info (name, email required)
    if (formData.first_name && formData.last_name && formData.email) completed++
    
    // Summary
    if (formData.professional_summary && formData.professional_summary.length > 50) completed++
    
    // Experience
    if (experiences.length > 0 && experiences.some(exp => exp.job_title && exp.company)) completed++
    
    // Education
    if (education.length > 0 && education.some(edu => edu.degree && edu.university)) completed++
    
    // Skills
    if (skills.length > 0) completed++
    
    // Projects
    if (projects.length > 0 && projects.some(proj => proj.title)) completed++
    
    // Achievements
    if (achievements.length > 0 && achievements.some(ach => (ach.achievement_text || ach)?.trim())) completed++
    
    // Certifications
    if (certifications.length > 0 && certifications.some(cert => (cert.certification_name || cert)?.trim())) completed++

    return Math.round((completed / total) * 100)
  }

  // Check if section is complete
  const isSectionComplete = (sectionId: string) => {
    switch (sectionId) {
      case 'personal':
        return !!(formData.first_name && formData.last_name && formData.email)
      case 'summary':
        return !!(formData.professional_summary && formData.professional_summary.length > 50)
      case 'experience':
        return experiences.length > 0 && experiences.some(exp => exp.job_title && exp.company)
      case 'education':
        return education.length > 0 && education.some(edu => edu.degree && edu.university)
      case 'skills':
        return skills.length > 0
      case 'projects':
        return projects.length > 0 && projects.some(proj => proj.title)
      case 'achievements':
        return achievements.length > 0 && achievements.some(ach => (ach.achievement_text || ach)?.trim())
      case 'certifications':
        return certifications.length > 0 && certifications.some(cert => (cert.certification_name || cert)?.trim())
      default:
        return false
    }
  }

  // Get resume stats
  const getResumeStats = () => {
    const allText = [
      formData.professional_summary,
      ...experiences.flatMap(exp => exp.bullets || []),
      ...projects.map(proj => `${proj.description || ''} ${proj.contribution || ''}`),
      ...achievements.map(ach => ach.achievement_text || ach || '')
    ].join(' ').split(/\s+/).filter(w => w.length > 0)
    const totalWords = allText.length

    const totalExperience = experiences.length
    const totalSkills = skills.length
    const totalProjects = projects.length

    // Calculate years of experience
    let yearsOfExperience = 0
    experiences.forEach(exp => {
      if (exp.start_date) {
        const startYear = parseInt(exp.start_date.match(/\d{4}/)?.[0] || '0')
        const endYear = exp.end_date && exp.end_date !== 'Present' 
          ? parseInt(exp.end_date.match(/\d{4}/)?.[0] || '0')
          : new Date().getFullYear()
        if (startYear > 0 && endYear > 0) {
          yearsOfExperience += Math.max(0, endYear - startYear)
        }
      }
    })

    return { totalWords, totalExperience, totalSkills, totalProjects, yearsOfExperience }
  }

  // Smart tips for each section
  const sectionTips: { [key: string]: string[] } = {
    personal: [
      "Use a professional email address",
      "Include your LinkedIn profile for better visibility",
      "Phone number should include country code"
    ],
    summary: [
      "Start with your years of experience and key expertise",
      "Use action verbs: 'Led', 'Developed', 'Implemented'",
      "Keep it 2-3 sentences, highlight your unique value"
    ],
    experience: [
      "Use bullet points starting with action verbs",
      "Include quantifiable achievements (e.g., 'Increased revenue by 40%')",
      "List experiences in reverse chronological order",
      "Focus on impact and results, not just responsibilities"
    ],
    education: [
      "Include your degree and university name",
      "Add graduation year or expected graduation date",
      "Include location if it's relevant"
    ],
    skills: [
      "List technical skills relevant to your target role",
      "Separate skills by category for better organization",
      "Include both hard skills (programming) and soft skills"
    ],
    projects: [
      "Describe what the project does and its impact",
      "Mention technologies and tools used",
      "Highlight your specific contributions"
    ],
    achievements: [
      "Focus on measurable accomplishments",
      "Include awards, recognitions, or significant milestones",
      "Use specific numbers and metrics when possible"
    ],
    certifications: [
      "List professional certifications relevant to your field",
      "Include certification dates if recent",
      "Only include verified certifications"
    ]
  }

  // Auto-save functionality (debounced)
  useEffect(() => {
    if (!user) return
    
    const autoSaveTimer = setTimeout(() => {
      if (formData.first_name || formData.last_name || formData.email || experiences.length > 0) {
        handleSave(true) // Silent auto-save
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.first_name, formData.last_name, formData.email, experiences.length])

  // Check for 100% completion and show celebration
  useEffect(() => {
    const progress = calculateProgress()
    if (progress === 100 && !showCelebration) {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 3000)
    }
  }, [formData, experiences, education, skills, projects, achievements, certifications])

  // Generate summary from experience
  const generateSummary = () => {
    if (experiences.length === 0) {
      alert('Please add at least one work experience first')
      return
    }

    const latestExp = experiences[0]
    const jobTitle = latestExp.job_title || 'professional'
    const company = latestExp.company || ''
    const years = getResumeStats().yearsOfExperience || experiences.length
    
    const generatedSummary = `Experienced ${jobTitle} with ${years}+ years of expertise${company ? ` at ${company}` : ''}. Proven track record of delivering high-quality solutions and driving business results. Strong technical skills and collaborative approach to problem-solving.`
    
    updateFormData('professional_summary', generatedSummary)
  }

  // Quick actions
  const duplicateExperience = (idx: number) => {
    const expToDuplicate = experiences[idx]
    setExperiences([...experiences.slice(0, idx + 1), { ...expToDuplicate }, ...experiences.slice(idx + 1)])
  }

  const clearSection = (sectionId: string) => {
    if (confirm('Are you sure you want to clear this section?')) {
      switch (sectionId) {
        case 'experience':
          setExperiences([])
          break
        case 'education':
          setEducation([])
          break
        case 'projects':
          setProjects([])
          break
        case 'achievements':
          setAchievements([])
          break
        case 'certifications':
          setCertifications([])
          break
        case 'skills':
          setSkills([])
          break
        case 'summary':
          updateFormData('professional_summary', '')
          break
      }
    }
  }

  const copyContactInfo = () => {
    const contactInfo = [
      formData.first_name && formData.last_name ? `${formData.first_name} ${formData.last_name}` : '',
      formData.email,
      formData.phone,
      formData.linkedin,
      formData.github,
      formData.portfolio
    ].filter(Boolean).join('\n')
    
    navigator.clipboard.writeText(contactInfo)
    alert('Contact information copied to clipboard!')
  }

  // Import from PDF
  const handlePDFImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file only')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/parse', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()
        if (data.error) {
          alert(`Error parsing PDF: ${data.error}`)
          return
        }

        // Parse the extracted text and populate fields (basic parsing)
        // This is a simplified version - you might want to enhance it
        alert('PDF imported! Please review and update the extracted information.')
        // Note: Full PDF parsing and field mapping would require more sophisticated parsing
      } catch (error) {
        console.error('Error importing PDF:', error)
        alert('Failed to import PDF. Please try again.')
      }
    }
    input.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Build Your Resume</h2>
            <p className="text-gray-300 text-xs mt-1">Fill in your details to create a professional resume</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saveMessage && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                saveMessage === 'success' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'
              }`}>
                {saveMessage === 'success' ? (
                  <>
                    <HiCheckCircle className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : saveMessage.startsWith('error:') ? (
                  <>
                    <HiXCircle className="w-4 h-4" />
                    <span>Error</span>
                  </>
                ) : null}
              </div>
            )}
            {lastSaved && !saveMessage && (
              <span className="text-xs text-gray-400 px-2">
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={handlePDFImport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 text-white rounded-lg hover:bg-gray-700 text-xs font-medium transition-all"
              title="Import from PDF"
            >
              <HiOutlineArrowDownTray className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-gray-900 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs font-semibold transition-all"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <HiOutlineDocumentCheck className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Progress Bar - Compact */}
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-xs font-medium text-gray-300">Progress</span>
            <span className="text-xs font-bold text-white">{calculateProgress()}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-1.5">
            <div 
              className="bg-green-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>
          {/* Compact Stats */}
          {(() => {
            const stats = getResumeStats()
            if (stats.totalWords === 0 && stats.totalExperience === 0) return null
            return (
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <span>{stats.totalExperience} Exp</span>
                <span>{stats.totalSkills} Skills</span>
                {stats.totalProjects > 0 && <span>{stats.totalProjects} Projects</span>}
              </div>
            )
          })()}
        </div>

        {/* Success Celebration */}
        {showCelebration && (
          <div className="mt-3 bg-green-500/90 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium animate-pulse">
            <HiCheckCircle className="w-4 h-4" />
            <span>🎉 Resume 100% complete!</span>
          </div>
        )}
      </div>

      {/* Section Navigation - Horizontal Scroll */}
      <div className="bg-gray-50/50 border-b border-gray-200 px-4 py-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {sections.map((section) => {
            const isComplete = isSectionComplete(section.id)
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium text-xs whitespace-nowrap transition-all relative ${
                  activeSection === section.id
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                }`}
              >
                <section.icon className="w-3.5 h-3.5" />
                <span>{section.label}</span>
                {isComplete && (
                  <HiCheckCircle className={`w-3 h-3 ${activeSection === section.id ? 'text-green-300' : 'text-green-600'}`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Personal Info Section */}
        {activeSection === 'personal' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="border-l-4 border-gray-900 pl-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Contact Information</h3>
                <p className="text-sm text-gray-600">Your basic contact details</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTips({ ...showTips, personal: !showTips.personal })}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Show tips"
                >
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                {(formData.email || formData.phone) && (
                  <button
                    onClick={copyContactInfo}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy contact info"
                  >
                    <HiOutlineClipboard className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showTips.personal && (
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3.5 mb-4">
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">💡 Tips</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {sectionTips.personal.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {!formData.first_name && !formData.last_name && !formData.email && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <HiOutlineUser className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-700 mb-1.5 font-semibold">Start building your resume</p>
                <p className="text-sm text-gray-500">Add your contact information to get started</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => updateFormData('first_name', e.target.value.trim().substring(0, 50))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                  placeholder="John"
                  maxLength={50}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => updateFormData('middle_name', e.target.value.trim().substring(0, 50))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                  placeholder="Michael (optional)"
                  maxLength={50}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => updateFormData('last_name', e.target.value.trim().substring(0, 50))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                  placeholder="Doe"
                  maxLength={50}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value.trim().toLowerCase().substring(0, 100))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                  placeholder="john@example.com"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    // Allow only numbers, spaces, +, -, (, )
                    const value = e.target.value.replace(/[^\d\s\+\-\(\)]/g, '').substring(0, 20)
                    updateFormData('phone', value)
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                  placeholder="+1 234 567 8900"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                <input
                  type="text"
                  value={formData.linkedin}
                  onChange={(e) => {
                    let value = e.target.value.trim()
                    // Auto-format URL if user doesn't include protocol
                    if (value && !value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('linkedin.com')) {
                      if (value.includes('.')) {
                        value = value.startsWith('www.') ? `https://${value}` : `https://www.${value}`
                      } else {
                        value = `https://linkedin.com/in/${value.replace(/^\/+|\/+$/g, '')}`
                      }
                    }
                    updateFormData('linkedin', value)
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                  placeholder="linkedin.com/in/johndoe or just johndoe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">GitHub</label>
                <input
                  type="text"
                  value={formData.github}
                  onChange={(e) => {
                    let value = e.target.value.trim()
                    // Auto-format URL if user doesn't include protocol
                    if (value && !value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('github.com')) {
                      if (value.includes('.')) {
                        value = value.startsWith('www.') ? `https://${value}` : `https://www.${value}`
                      } else {
                        value = `https://github.com/${value.replace(/^\/+|\/+$/g, '')}`
                      }
                    }
                    updateFormData('github', value)
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                  placeholder="github.com/johndoe or just johndoe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Portfolio</label>
                <input
                  type="text"
                  value={formData.portfolio}
                  onChange={(e) => {
                    let value = e.target.value.trim()
                    // Auto-format URL if user doesn't include protocol
                    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                      value = `https://${value.replace(/^\/+|\/+$/g, '')}`
                    }
                    updateFormData('portfolio', value)
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                  placeholder="johndoe.com or www.johndoe.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* Summary Section */}
        {activeSection === 'summary' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="border-l-4 border-gray-900 pl-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Professional Summary</h3>
                <p className="text-sm text-gray-600">Write a brief summary of your professional experience</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTips({ ...showTips, summary: !showTips.summary })}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Show tips"
                >
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                {experiences.length > 0 && (
                  <button
                    onClick={generateSummary}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                    title="Generate summary from experience"
                  >
                    <HiOutlineSparkles className="w-4 h-4" />
                    <span>Generate</span>
                  </button>
                )}
                {formData.professional_summary && (
                  <button
                    onClick={() => clearSection('summary')}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear section"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showTips.summary && (
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3.5 mb-4">
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">💡 Tips</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {sectionTips.summary.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {!formData.professional_summary && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiOutlineDocumentText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-medium">No summary yet</p>
                <p className="text-sm text-gray-500 mb-4">Write a compelling summary or generate one from your experience</p>
                {experiences.length > 0 && (
                  <button
                    onClick={generateSummary}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                  >
                    Generate Summary from Experience
                  </button>
                )}
              </div>
            )}

            {formData.professional_summary && (
              <>
                <textarea
                  value={formData.professional_summary}
                  onChange={(e) => {
                    const value = e.target.value
                    // Limit to reasonable length
                    if (value.length <= 1000) {
                      updateFormData('professional_summary', value)
                    }
                  }}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all resize-none text-sm"
                  placeholder="Experienced software engineer with 5+ years of expertise in full-stack development..."
                  maxLength={1000}
                />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{formData.professional_summary.length} / 1000 characters</span>
                  {formData.professional_summary.length > 800 && (
                    <span className="text-orange-600">Consider shortening for better readability</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Experience Section */}
        {activeSection === 'experience' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="border-l-4 border-gray-900 pl-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Work Experience</h3>
                <p className="text-sm text-gray-600">Add your work history in reverse chronological order</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTips({ ...showTips, experience: !showTips.experience })}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Show tips"
                >
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                {experiences.length > 0 && (
                  <button
                    onClick={() => clearSection('experience')}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear all experiences"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showTips.experience && (
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3.5 mb-4">
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">💡 Tips</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {sectionTips.experience.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {experiences.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiOutlineBriefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-medium">No work experience added yet</p>
                <p className="text-sm text-gray-500 mb-4">Add your first work experience to showcase your career</p>
                <button
                  onClick={() => setExperiences([{ job_title: '', company: '', start_date: '', end_date: '', bullets: [] }])}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                >
                  Add First Experience
                </button>
              </div>
            )}
            
            <div className="space-y-5">
              {experiences.map((exp, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-gray-800">Experience #{idx + 1}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => duplicateExperience(idx)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Duplicate this experience"
                      >
                        <HiOutlineSquare2Stack className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                      <input
                        type="text"
                        value={exp.job_title || ''}
                        onChange={(e) => {
                          const newExp = [...experiences]
                          newExp[idx] = { ...newExp[idx], job_title: e.target.value }
                          setExperiences(newExp)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                        placeholder="Software Engineer"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                      <input
                        type="text"
                        value={exp.company || ''}
                        onChange={(e) => {
                          const newExp = [...experiences]
                          newExp[idx] = { ...newExp[idx], company: e.target.value.trim().substring(0, 100) }
                          setExperiences(newExp)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                        placeholder="Tech Corp"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                      <input
                        type="text"
                        value={exp.start_date || ''}
                        onChange={(e) => {
                          const newExp = [...experiences]
                          newExp[idx] = { ...newExp[idx], start_date: e.target.value }
                          setExperiences(newExp)
                        }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                      placeholder="Jan 2020 or 2020-01"
                    />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="text"
                        value={exp.end_date || ''}
                        onChange={(e) => {
                          const newExp = [...experiences]
                          newExp[idx] = { ...newExp[idx], end_date: e.target.value.trim() }
                          setExperiences(newExp)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                        placeholder="Present, Dec 2023, or 2023-12"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty or enter "Present" for current role</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Achievements & Responsibilities (one per line)</label>
                    <textarea
                      value={Array.isArray(exp.bullets) ? exp.bullets.join('\n') : (typeof exp.bullets === 'string' ? exp.bullets : '')}
                      onChange={(e) => {
                        const newExp = [...experiences]
                        const bullets = e.target.value.split('\n')
                          .map(b => b.trim())
                          .filter(b => b.length > 0)
                        newExp[idx] = { ...newExp[idx], bullets: bullets.length > 0 ? bullets : [] }
                        setExperiences(newExp)
                      }}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all resize-none text-sm"
                      placeholder="Developed and maintained web applications&#10;Led a team of 5 developers"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter each achievement or responsibility on a new line</p>
                  </div>
                </div>
              ))}
              {experiences.length > 0 && (
                <button
                  onClick={() => setExperiences([...experiences, { job_title: '', company: '', start_date: '', end_date: '', bullets: [] }])}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium text-sm"
                >
                  + Add Another Experience
                </button>
              )}
            </div>
          </div>
        )}

        {/* Education Section */}
        {activeSection === 'education' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="border-l-4 border-gray-900 pl-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Education</h3>
                <p className="text-sm text-gray-600">Add your educational background</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTips({ ...showTips, education: !showTips.education })}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Show tips"
                >
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                {education.length > 0 && (
                  <button
                    onClick={() => clearSection('education')}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear all education"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showTips.education && (
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3.5 mb-4">
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">💡 Tips</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {sectionTips.education.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {education.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiOutlineAcademicCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-medium">No education added yet</p>
                <p className="text-sm text-gray-500 mb-4">Add your educational qualifications</p>
                <button
                  onClick={() => setEducation([{ degree: '', university: '', years: '', location: '' }])}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                >
                  Add Education
                </button>
              </div>
            )}
            
            <div className="space-y-5">
              {education.map((edu, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-gray-800">Education #{idx + 1}</h4>
                    <button
                      onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Degree *</label>
                      <input
                        type="text"
                        value={edu.degree || ''}
                        onChange={(e) => {
                          const newEdu = [...education]
                          newEdu[idx] = { ...newEdu[idx], degree: e.target.value.trim().substring(0, 100) }
                          setEducation(newEdu)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                        placeholder="B.S. Computer Science"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">University *</label>
                      <input
                        type="text"
                        value={edu.university || ''}
                        onChange={(e) => {
                          const newEdu = [...education]
                          newEdu[idx] = { ...newEdu[idx], university: e.target.value.trim().substring(0, 150) }
                          setEducation(newEdu)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                        placeholder="University Name"
                        maxLength={150}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years</label>
                      <input
                        type="text"
                        value={edu.years || ''}
                        onChange={(e) => {
                          const newEdu = [...education]
                          newEdu[idx] = { ...newEdu[idx], years: e.target.value.trim() }
                          setEducation(newEdu)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                        placeholder="2020 - 2024 or 2020-2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={edu.location || ''}
                        onChange={(e) => {
                          const newEdu = [...education]
                          newEdu[idx] = { ...newEdu[idx], location: e.target.value.trim() }
                          setEducation(newEdu)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {education.length > 0 && (
                <button
                  onClick={() => setEducation([...education, { degree: '', university: '', years: '', location: '' }])}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium text-sm"
                >
                  + Add Another Education
                </button>
              )}
            </div>
          </div>
        )}

        {/* Skills Section */}
        {activeSection === 'skills' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="border-l-4 border-gray-900 pl-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Skills</h3>
                <p className="text-sm text-gray-600">Categorize your skills for better organization</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTips({ ...showTips, skills: !showTips.skills })}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Show tips"
                >
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                {skills.length > 0 && (
                  <button
                    onClick={() => clearSection('skills')}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear all skills"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showTips.skills && (
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3.5 mb-4">
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">💡 Tips</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {sectionTips.skills.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {skills.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiOutlineWrenchScrewdriver className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-medium">No skills added yet</p>
                <p className="text-sm text-gray-500">Add your technical and professional skills</p>
              </div>
            )}
            
            <div className="space-y-5">
              {['programming', 'tools', 'databases', 'cloud', 'others'].map((category) => {
                const categorySkills = skills.filter(s => s.category === category)
                
                const handleAddSkill = (skillName: string) => {
                  const trimmed = skillName.trim()
                  if (trimmed.length === 0 || trimmed.length > 50) return
                  
                  // Check if skill already exists in this category
                  const exists = categorySkills.some(s => 
                    s.skill_name.toLowerCase() === trimmed.toLowerCase()
                  )
                  if (exists) {
                    // Clear input if duplicate
                    setSkillInputs({ ...skillInputs, [category]: '' })
                    return
                  }
                  
                  const otherSkills = skills.filter(s => s.category !== category)
                  const newSkill = { category, skill_name: trimmed }
                  setSkills([...otherSkills, newSkill])
                  setSkillInputs({ ...skillInputs, [category]: '' })
                }
                
                const handleRemoveSkill = (skillName: string) => {
                  const otherSkills = skills.filter(s => 
                    !(s.category === category && s.skill_name === skillName)
                  )
                  setSkills(otherSkills)
                }
                
                return (
                  <div key={category} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 capitalize">
                      {category.replace('_', ' ')}
                    </label>
                    
                    {/* Input field */}
                    <input
                      type="text"
                      value={skillInputs[category] || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.length <= 50) {
                          setSkillInputs({ ...skillInputs, [category]: value })
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSkill(skillInputs[category] || '')
                        }
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                      placeholder="Type a skill and press Enter to add"
                      maxLength={50}
                    />
                    <p className="text-xs text-gray-500 mt-1.5 mb-3">
                      Press Enter to add • {categorySkills.length} skill{categorySkills.length !== 1 ? 's' : ''} added
                    </p>
                    
                    {/* Skills display as tags */}
                    {categorySkills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {categorySkills.map((skill, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium"
                          >
                            <span>{skill.skill_name}</span>
                            <button
                              onClick={() => handleRemoveSkill(skill.skill_name)}
                              className="hover:bg-gray-700 rounded-full p-0.5 transition-colors"
                              title="Remove skill"
                              type="button"
                            >
                              <HiXCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Projects Section */}
        {activeSection === 'projects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="border-l-4 border-gray-900 pl-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Projects</h3>
                <p className="text-sm text-gray-600">Showcase your notable projects</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTips({ ...showTips, projects: !showTips.projects })}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Show tips"
                >
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                {projects.length > 0 && (
                  <button
                    onClick={() => clearSection('projects')}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear all projects"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showTips.projects && (
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3.5 mb-4">
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">💡 Tips</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {sectionTips.projects.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {projects.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiOutlineRocketLaunch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-medium">No projects added yet</p>
                <p className="text-sm text-gray-500 mb-4">Showcase your notable projects and contributions</p>
                <button
                  onClick={() => setProjects([{ title: '', description: '', contribution: '', tech_stack: '' }])}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                >
                  Add First Project
                </button>
              </div>
            )}
            
            <div className="space-y-5">
              {projects.map((proj, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-gray-800">Project #{idx + 1}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProjects([...projects.slice(0, idx + 1), { ...proj }, ...projects.slice(idx + 1)])}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Duplicate this project"
                      >
                        <HiOutlineSquare2Stack className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={proj.title || ''}
                      onChange={(e) => {
                        const newProj = [...projects]
                        newProj[idx] = { ...newProj[idx], title: e.target.value.trim().substring(0, 150) }
                        setProjects(newProj)
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                      placeholder="Project Title *"
                      maxLength={150}
                    />
                    <textarea
                      value={proj.description || ''}
                      onChange={(e) => {
                        const newProj = [...projects]
                        newProj[idx] = { ...newProj[idx], description: e.target.value.substring(0, 500) }
                        setProjects(newProj)
                      }}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all resize-none text-sm"
                      placeholder="Project description and key features..."
                      maxLength={500}
                    />
                    <textarea
                      value={proj.contribution || ''}
                      onChange={(e) => {
                        const newProj = [...projects]
                        newProj[idx] = { ...newProj[idx], contribution: e.target.value.substring(0, 300) }
                        setProjects(newProj)
                      }}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all resize-none text-sm"
                      placeholder="Your key contributions (optional)"
                      maxLength={300}
                    />
                    <input
                      type="text"
                      value={proj.tech_stack || ''}
                      onChange={(e) => {
                        const newProj = [...projects]
                        newProj[idx] = { ...newProj[idx], tech_stack: e.target.value.trim().substring(0, 200) }
                        setProjects(newProj)
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                      placeholder="Technologies used (e.g., React, Node.js, MongoDB)"
                      maxLength={200}
                    />
                  </div>
                </div>
              ))}
              {projects.length > 0 && (
                <button
                  onClick={() => setProjects([...projects, { title: '', description: '', contribution: '', tech_stack: '' }])}
                  className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium text-sm"
                >
                  + Add Another Project
                </button>
              )}
            </div>
          </div>
        )}

        {/* Achievements Section */}
        {activeSection === 'achievements' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="border-l-4 border-gray-900 pl-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Achievements</h3>
                <p className="text-sm text-gray-600">Highlight your key accomplishments</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTips({ ...showTips, achievements: !showTips.achievements })}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Show tips"
                >
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                {achievements.length > 0 && (
                  <button
                    onClick={() => clearSection('achievements')}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear all achievements"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showTips.achievements && (
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3.5 mb-4">
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">💡 Tips</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {sectionTips.achievements.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {achievements.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiOutlineTrophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-medium">No achievements added yet</p>
                <p className="text-sm text-gray-500 mb-4">Highlight your key accomplishments and recognitions</p>
                <button
                  onClick={() => setAchievements([''])}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                >
                  Add First Achievement
                </button>
              </div>
            )}
            
            <div className="space-y-3">
              {achievements.map((ach, idx) => {
                // Normalize achievement value
                const achievementValue = typeof ach === 'string' ? ach : (ach?.achievement_text || '')
                return (
                  <div key={idx} className="flex gap-3 items-start">
                    <input
                      type="text"
                      value={achievementValue}
                      onChange={(e) => {
                        const newAch = [...achievements]
                        const value = e.target.value.trim().substring(0, 200)
                        newAch[idx] = typeof ach === 'string' ? value : { achievement_text: value }
                        setAchievements(newAch)
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                      placeholder="e.g., Led team that increased revenue by 40%"
                      maxLength={200}
                    />
                    <button
                      onClick={() => setAchievements(achievements.filter((_, i) => i !== idx))}
                      className="px-4 py-2.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                      title="Remove achievement"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
              <button
                onClick={() => {
                  // Only add if last achievement is not empty
                  if (achievements.length === 0 || (typeof achievements[achievements.length - 1] === 'string' ? achievements[achievements.length - 1].trim() : achievements[achievements.length - 1]?.achievement_text?.trim())) {
                    setAchievements([...achievements, ''])
                  }
                }}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium text-sm"
              >
                + Add Achievement
              </button>
            </div>
          </div>
        )}

        {/* Certifications Section */}
        {activeSection === 'certifications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div className="border-l-4 border-gray-900 pl-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Certifications</h3>
                <p className="text-sm text-gray-600">List your professional certifications</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTips({ ...showTips, certifications: !showTips.certifications })}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Show tips"
                >
                  <HiOutlineInformationCircle className="w-5 h-5" />
                </button>
                {certifications.length > 0 && (
                  <button
                    onClick={() => clearSection('certifications')}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Clear all certifications"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {showTips.certifications && (
              <div className="bg-blue-50/80 border border-blue-200/50 rounded-lg p-3.5 mb-4">
                <h4 className="font-semibold text-blue-900 mb-1.5 text-sm">💡 Tips</h4>
                <ul className="space-y-1 text-xs text-blue-800">
                  {sectionTips.certifications.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {certifications.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiOutlineDocumentCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-medium">No certifications added yet</p>
                <p className="text-sm text-gray-500 mb-4">Add your professional certifications and credentials</p>
                <button
                  onClick={() => setCertifications([''])}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                >
                  Add First Certification
                </button>
              </div>
            )}
            
            <div className="space-y-3">
              {certifications.map((cert, idx) => {
                // Normalize certification value
                const certValue = typeof cert === 'string' ? cert : (cert?.certification_name || '')
                return (
                  <div key={idx} className="flex gap-3 items-start">
                    <input
                      type="text"
                      value={certValue}
                      onChange={(e) => {
                        const newCert = [...certifications]
                        const value = e.target.value.trim().substring(0, 200)
                        newCert[idx] = typeof cert === 'string' ? value : { certification_name: value }
                        setCertifications(newCert)
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all text-sm"
                      placeholder="e.g., AWS Certified Solutions Architect"
                      maxLength={200}
                    />
                    <button
                      onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                      className="px-4 py-2.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                      title="Remove certification"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
              <button
                onClick={() => {
                  // Only add if last certification is not empty
                  if (certifications.length === 0 || (typeof certifications[certifications.length - 1] === 'string' ? certifications[certifications.length - 1].trim() : certifications[certifications.length - 1]?.certification_name?.trim())) {
                    setCertifications([...certifications, ''])
                  }
                }}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium text-sm"
              >
                + Add Certification
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
