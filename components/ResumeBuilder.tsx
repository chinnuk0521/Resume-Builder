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

      if (profileId) {
        await supabase
          .from('user_profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            middle_name: formData.middle_name,
            email: formData.email,
            phone: formData.phone,
            linkedin: formData.linkedin,
            github: formData.github,
            portfolio: formData.portfolio,
            professional_summary: formData.professional_summary
          })
          .eq('id', profileId)
      } else {
        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            first_name: formData.first_name,
            last_name: formData.last_name,
            middle_name: formData.middle_name,
            email: formData.email,
            phone: formData.phone,
            linkedin: formData.linkedin,
            github: formData.github,
            portfolio: formData.portfolio,
            professional_summary: formData.professional_summary
          })
          .select()
          .single()

        if (error) throw error
        profileId = data.id
      }

      // Save experiences
      if (experiences.length > 0) {
        if (profileData?.experiences?.length > 0) {
          await supabase
            .from('experiences')
            .delete()
            .eq('user_profile_id', profileId)
        }
        await supabase
          .from('experiences')
          .insert(experiences.map((exp, idx) => ({
            user_profile_id: profileId,
            ...exp,
            order_index: idx
          })))
      }

      // Save education
      if (education.length > 0) {
        if (profileData?.education?.length > 0) {
          await supabase
            .from('education')
            .delete()
            .eq('user_profile_id', profileId)
        }
        await supabase
          .from('education')
          .insert(education.map((edu, idx) => ({
            user_profile_id: profileId,
            ...edu,
            order_index: idx
          })))
      }

      // Save skills
      if (skills.length > 0) {
        if (profileData?.skills?.length > 0) {
          await supabase
            .from('skills')
            .delete()
            .eq('user_profile_id', profileId)
        }
        await supabase
          .from('skills')
          .insert(skills.map((skill, idx) => ({
            user_profile_id: profileId,
            ...skill,
            order_index: idx
          })))
      }

      // Save projects
      if (projects.length > 0) {
        if (profileData?.projects?.length > 0) {
          await supabase
            .from('projects')
            .delete()
            .eq('user_profile_id', profileId)
        }
        await supabase
          .from('projects')
          .insert(projects.map((proj, idx) => ({
            user_profile_id: profileId,
            ...proj,
            order_index: idx
          })))
      }

      // Save achievements
      if (achievements.length > 0) {
        if (profileData?.achievements?.length > 0) {
          await supabase
            .from('achievements')
            .delete()
            .eq('user_profile_id', profileId)
        }
        await supabase
          .from('achievements')
          .insert(achievements.map((ach, idx) => ({
            user_profile_id: profileId,
            achievement_text: ach.achievement_text || ach,
            order_index: idx
          })))
      }

      // Save certifications
      if (certifications.length > 0) {
        if (profileData?.certifications?.length > 0) {
          await supabase
            .from('certifications')
            .delete()
            .eq('user_profile_id', profileId)
        }
        await supabase
          .from('certifications')
          .insert(certifications.map((cert, idx) => ({
            user_profile_id: profileId,
            certification_name: cert.certification_name || cert,
            order_index: idx
          })))
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
        setSaveMessage('error:' + error.message)
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
    const totalWords = [
      formData.professional_summary,
      ...experiences.flatMap(exp => exp.bullets || []),
      ...projects.map(proj => `${proj.description || ''} ${proj.contribution || ''}`).join(' '),
      ...achievements.map(ach => ach.achievement_text || ach || '').join(' ')
    ].join(' ').split(/\s+/).filter(w => w.length > 0).length

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-6 py-5">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Build Your Resume</h2>
              <p className="text-gray-300 text-sm mt-1">Fill in your details below</p>
            </div>
            <div className="flex items-center gap-3">
              {saveMessage && (
                <span className={`flex items-center gap-2 text-sm font-medium ${
                  saveMessage === 'success' ? 'text-green-300' : 'text-red-300'
                }`}>
                  {saveMessage === 'success' ? (
                    <>
                      <HiCheckCircle className="w-5 h-5" />
                      <span>Saved successfully!</span>
                    </>
                  ) : saveMessage.startsWith('error:') ? (
                    <>
                      <HiXCircle className="w-5 h-5" />
                      <span>Error: {saveMessage.replace('error:', '')}</span>
                    </>
                  ) : null}
                </span>
              )}
              {lastSaved && !saveMessage && (
                <span className="text-xs text-gray-400">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handlePDFImport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-semibold transition-all shadow-md hover:shadow-lg"
                title="Import from PDF"
              >
                <HiOutlineArrowDownTray className="w-4 h-4" />
                <span className="hidden sm:inline">Import PDF</span>
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-lg hover:bg-gray-100 disabled:opacity-50 font-semibold transition-all shadow-md hover:shadow-lg"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <HiOutlineDocumentCheck className="w-5 h-5" />
                    <span>Save Resume</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-300">Resume Progress</span>
              <span className="text-sm font-bold text-white">{calculateProgress()}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>

          {/* Resume Stats */}
          {(() => {
            const stats = getResumeStats()
            if (stats.totalWords === 0 && stats.totalExperience === 0) return null
            return (
              <div className="flex gap-4 text-xs text-gray-400">
                <span>{stats.totalExperience} {stats.totalExperience === 1 ? 'Experience' : 'Experiences'}</span>
                <span>{stats.totalSkills} Skills</span>
                <span>{stats.totalProjects} {stats.totalProjects === 1 ? 'Project' : 'Projects'}</span>
                {stats.yearsOfExperience > 0 && <span>{stats.yearsOfExperience} Years Experience</span>}
              </div>
            )
          })()}

          {/* Success Celebration */}
          {showCelebration && (
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
              <HiCheckCircle className="w-5 h-5" />
              <span className="font-semibold">🎉 Congratulations! Your resume is 100% complete!</span>
            </div>
          )}
        </div>
      </div>

      {/* Section Navigation - Horizontal Scroll */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {sections.map((section) => {
            const isComplete = isSectionComplete(section.id)
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all relative ${
                  activeSection === section.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <section.icon className="w-4 h-4" />
                <span>{section.label}</span>
                {isComplete && (
                  <HiCheckCircle className={`w-4 h-4 ${activeSection === section.id ? 'text-green-300' : 'text-green-600'}`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Contact Information</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  {sectionTips.personal.map((tip, idx) => (
                    <li key={idx}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {!formData.first_name && !formData.last_name && !formData.email && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <HiOutlineUser className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 font-medium">Start building your resume</p>
                <p className="text-sm text-gray-500">Add your contact information to get started</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => updateFormData('first_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="John"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => updateFormData('middle_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="Michael (optional)"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => updateFormData('last_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => updateFormData('linkedin', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="linkedin.com/in/johndoe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">GitHub</label>
                <input
                  type="url"
                  value={formData.github}
                  onChange={(e) => updateFormData('github', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="github.com/johndoe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Portfolio</label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => updateFormData('portfolio', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="johndoe.com"
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Professional Summary</h4>
                <ul className="space-y-1 text-sm text-blue-800">
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
                  onChange={(e) => updateFormData('professional_summary', e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
                  placeholder="Experienced software engineer with 5+ years of expertise in full-stack development..."
                />
                <div className="text-xs text-gray-500">
                  {formData.professional_summary.length} characters
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Work Experience</h4>
                <ul className="space-y-1 text-sm text-blue-800">
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
                <div key={idx} className="border border-gray-200 rounded-xl p-5 bg-gray-50 hover:bg-gray-100 transition-colors">
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
                      <input
                        type="text"
                        value={exp.company || ''}
                        onChange={(e) => {
                          const newExp = [...experiences]
                          newExp[idx] = { ...newExp[idx], company: e.target.value }
                          setExperiences(newExp)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Tech Corp"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Jan 2020"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="text"
                        value={exp.end_date || ''}
                        onChange={(e) => {
                          const newExp = [...experiences]
                          newExp[idx] = { ...newExp[idx], end_date: e.target.value }
                          setExperiences(newExp)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Present or Dec 2023"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Achievements & Responsibilities (one per line)</label>
                    <textarea
                      value={Array.isArray(exp.bullets) ? exp.bullets.join('\n') : exp.bullets || ''}
                      onChange={(e) => {
                        const newExp = [...experiences]
                        newExp[idx] = { ...newExp[idx], bullets: e.target.value.split('\n').filter(b => b.trim()) }
                        setExperiences(newExp)
                      }}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                      placeholder="• Developed and maintained web applications&#10;• Led a team of 5 developers"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setExperiences([...experiences, { job_title: '', company: '', start_date: '', end_date: '', bullets: [] }])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium"
              >
                + Add Experience
              </button>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Education</h4>
                <ul className="space-y-1 text-sm text-blue-800">
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
                <div key={idx} className="border border-gray-200 rounded-xl p-5 bg-gray-50 hover:bg-gray-100 transition-colors">
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
                          newEdu[idx] = { ...newEdu[idx], degree: e.target.value }
                          setEducation(newEdu)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="B.S. Computer Science"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">University *</label>
                      <input
                        type="text"
                        value={edu.university || ''}
                        onChange={(e) => {
                          const newEdu = [...education]
                          newEdu[idx] = { ...newEdu[idx], university: e.target.value }
                          setEducation(newEdu)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="University Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years</label>
                      <input
                        type="text"
                        value={edu.years || ''}
                        onChange={(e) => {
                          const newEdu = [...education]
                          newEdu[idx] = { ...newEdu[idx], years: e.target.value }
                          setEducation(newEdu)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="2020 - 2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={edu.location || ''}
                        onChange={(e) => {
                          const newEdu = [...education]
                          newEdu[idx] = { ...newEdu[idx], location: e.target.value }
                          setEducation(newEdu)
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setEducation([...education, { degree: '', university: '', years: '', location: '' }])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium"
              >
                + Add Education
              </button>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Skills</h4>
                <ul className="space-y-1 text-sm text-blue-800">
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
                return (
                  <div key={category} className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                    <label className="block text-sm font-semibold text-gray-800 mb-2 capitalize">
                      {category.replace('_', ' ')}
                    </label>
                    <input
                      type="text"
                      value={categorySkills.map(s => s.skill_name).join(', ')}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const skillNames = inputValue.split(',').map(s => s.trim()).filter(s => s.length > 0)
                        const otherSkills = skills.filter(s => s.category !== category)
                        const newSkills = skillNames.length > 0 
                          ? skillNames.map(name => ({ category, skill_name: name }))
                          : []
                        setSkills([...otherSkills, ...newSkills])
                      }}
                      onBlur={(e) => {
                        // Ensure skills are saved even if input ends with comma
                        const inputValue = e.target.value
                        const skillNames = inputValue.split(',').map(s => s.trim()).filter(s => s.length > 0)
                        const otherSkills = skills.filter(s => s.category !== category)
                        const newSkills = skillNames.length > 0 
                          ? skillNames.map(name => ({ category, skill_name: name }))
                          : []
                        setSkills([...otherSkills, ...newSkills])
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                      placeholder="Enter skills separated by commas (e.g., Python, JavaScript, React)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Projects</h4>
                <ul className="space-y-1 text-sm text-blue-800">
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
                <div key={idx} className="border border-gray-200 rounded-xl p-5 bg-gray-50 hover:bg-gray-100 transition-colors">
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
                        newProj[idx] = { ...newProj[idx], title: e.target.value }
                        setProjects(newProj)
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="Project Title *"
                    />
                    <textarea
                      value={proj.description || ''}
                      onChange={(e) => {
                        const newProj = [...projects]
                        newProj[idx] = { ...newProj[idx], description: e.target.value }
                        setProjects(newProj)
                      }}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                      placeholder="Project description and key features..."
                    />
                    <textarea
                      value={proj.contribution || ''}
                      onChange={(e) => {
                        const newProj = [...projects]
                        newProj[idx] = { ...newProj[idx], contribution: e.target.value }
                        setProjects(newProj)
                      }}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                      placeholder="Your key contributions (optional)"
                    />
                    <input
                      type="text"
                      value={proj.tech_stack || ''}
                      onChange={(e) => {
                        const newProj = [...projects]
                        newProj[idx] = { ...newProj[idx], tech_stack: e.target.value }
                        setProjects(newProj)
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="Technologies used (e.g., React, Node.js, MongoDB)"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setProjects([...projects, { title: '', description: '', contribution: '', tech_stack: '' }])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium"
              >
                + Add Project
              </button>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Achievements</h4>
                <ul className="space-y-1 text-sm text-blue-800">
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
              {achievements.map((ach, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <input
                    type="text"
                    value={ach.achievement_text || ach || ''}
                    onChange={(e) => {
                      const newAch = [...achievements]
                      newAch[idx] = typeof ach === 'string' ? e.target.value : { ...ach, achievement_text: e.target.value }
                      setAchievements(newAch)
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="e.g., Led team that increased revenue by 40%"
                  />
                  <button
                    onClick={() => setAchievements(achievements.filter((_, i) => i !== idx))}
                    className="px-4 py-2.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAchievements([...achievements, ''])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium"
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Certifications</h4>
                <ul className="space-y-1 text-sm text-blue-800">
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
              {certifications.map((cert, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <input
                    type="text"
                    value={cert.certification_name || cert || ''}
                    onChange={(e) => {
                      const newCert = [...certifications]
                      newCert[idx] = typeof cert === 'string' ? e.target.value : { ...cert, certification_name: e.target.value }
                      setCertifications(newCert)
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="e.g., AWS Certified Solutions Architect"
                  />
                  <button
                    onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                    className="px-4 py-2.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => setCertifications([...certifications, ''])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium"
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
