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
  HiXCircle
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

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setSaveMessage('')
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
      setSaveMessage('success')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error: any) {
      console.error('Error saving resume:', error)
      setSaveMessage('error:' + error.message)
      setTimeout(() => setSaveMessage(''), 5000)
    } finally {
      setSaving(false)
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

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Build Your Resume</h2>
            <p className="text-blue-100 text-sm mt-1">Fill in your details below</p>
          </div>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span className={`flex items-center gap-2 text-sm font-medium ${
                saveMessage === 'success' ? 'text-green-200' : 'text-red-200'
              }`}>
                {saveMessage === 'success' ? (
                  <>
                    <HiCheckCircle className="w-5 h-5" />
                    <span>Resume saved successfully!</span>
                  </>
                ) : saveMessage.startsWith('error:') ? (
                  <>
                    <HiXCircle className="w-5 h-5" />
                    <span>Failed to save: {saveMessage.replace('error:', '')}</span>
                  </>
                ) : null}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 font-semibold transition-all shadow-md hover:shadow-lg"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
      </div>

      {/* Section Navigation - Horizontal Scroll */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <section.icon className="w-4 h-4" />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* Personal Info Section */}
        {activeSection === 'personal' && (
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Contact Information</h3>
              <p className="text-sm text-gray-500">Your basic contact details</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => updateFormData('first_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="John"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => updateFormData('middle_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Michael (optional)"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => updateFormData('last_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => updateFormData('linkedin', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="linkedin.com/in/johndoe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">GitHub</label>
                <input
                  type="url"
                  value={formData.github}
                  onChange={(e) => updateFormData('github', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="github.com/johndoe"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Portfolio</label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => updateFormData('portfolio', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="johndoe.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* Summary Section */}
        {activeSection === 'summary' && (
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Professional Summary</h3>
              <p className="text-sm text-gray-500">Write a brief summary of your professional experience</p>
            </div>
            <textarea
              value={formData.professional_summary}
              onChange={(e) => updateFormData('professional_summary', e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Experienced software engineer with 5+ years of expertise in full-stack development..."
            />
            <div className="text-xs text-gray-500">
              {formData.professional_summary.length} characters
            </div>
          </div>
        )}

        {/* Experience Section */}
        {activeSection === 'experience' && (
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Work Experience</h3>
              <p className="text-sm text-gray-500">Add your work history in reverse chronological order</p>
            </div>
            
            <div className="space-y-5">
              {experiences.map((exp, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-5 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-gray-800">Experience #{idx + 1}</h4>
                    <button
                      onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="• Developed and maintained web applications&#10;• Led a team of 5 developers"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setExperiences([...experiences, { job_title: '', company: '', start_date: '', end_date: '', bullets: [] }])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
              >
                + Add Experience
              </button>
            </div>
          </div>
        )}

        {/* Education Section */}
        {activeSection === 'education' && (
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Education</h3>
              <p className="text-sm text-gray-500">Add your educational background</p>
            </div>
            
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setEducation([...education, { degree: '', university: '', years: '', location: '' }])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
              >
                + Add Education
              </button>
            </div>
          </div>
        )}

        {/* Skills Section */}
        {activeSection === 'skills' && (
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Skills</h3>
              <p className="text-sm text-gray-500">Categorize your skills for better organization</p>
            </div>
            
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Projects</h3>
              <p className="text-sm text-gray-500">Showcase your notable projects</p>
            </div>
            
            <div className="space-y-5">
              {projects.map((proj, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-5 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-gray-800">Project #{idx + 1}</h4>
                    <button
                      onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Technologies used (e.g., React, Node.js, MongoDB)"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setProjects([...projects, { title: '', description: '', contribution: '', tech_stack: '' }])}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
              >
                + Add Project
              </button>
            </div>
          </div>
        )}

        {/* Achievements Section */}
        {activeSection === 'achievements' && (
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Achievements</h3>
              <p className="text-sm text-gray-500">Highlight your key accomplishments</p>
            </div>
            
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
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
              >
                + Add Achievement
              </button>
            </div>
          </div>
        )}

        {/* Certifications Section */}
        {activeSection === 'certifications' && (
          <div className="space-y-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Certifications</h3>
              <p className="text-sm text-gray-500">List your professional certifications</p>
            </div>
            
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
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all font-medium"
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
