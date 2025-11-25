'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

interface ResumeBuilderProps {
  profileData: any
  onSave: () => void
}

export default function ResumeBuilder({ profileData, onSave }: ResumeBuilderProps) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
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
      setFormData({
        name: profileData.profile.name || '',
        email: profileData.profile.email || '',
        phone: profileData.profile.phone || '',
        linkedin: profileData.profile.linkedin || '',
        github: profileData.profile.github || '',
        portfolio: profileData.profile.portfolio || '',
        professional_summary: profileData.profile.professional_summary || ''
      })
      setExperiences(profileData.experiences || [])
      setEducation(profileData.education || [])
      setSkills(profileData.skills || [])
      setProjects(profileData.projects || [])
      setAchievements(profileData.achievements || [])
      setCertifications(profileData.certifications || [])
    }
  }, [profileData])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Save or update profile
      let profileId = profileData?.profile?.id

      if (profileId) {
        await supabase
          .from('user_profiles')
          .update({
            name: formData.name,
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
            ...formData
          })
          .select()
          .single()

        if (error) throw error
        profileId = data.id
      }

      // Save experiences
      if (experiences.length > 0) {
        // Delete existing
        if (profileData?.experiences?.length > 0) {
          await supabase
            .from('experiences')
            .delete()
            .eq('user_profile_id', profileId)
        }
        // Insert new
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
      alert('Resume saved successfully!')
    } catch (error: any) {
      console.error('Error saving resume:', error)
      alert('Failed to save resume: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'summary', label: 'Summary' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'certifications', label: 'Certifications' }
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Build Your Resume</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {saving ? 'Saving...' : 'Save Resume'}
        </button>
      </div>

      {/* Section Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-t-lg font-medium transition ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Personal Info Section */}
      {activeSection === 'personal' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="linkedin.com/in/johndoe"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
              <input
                type="url"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="github.com/johndoe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio</label>
              <input
                type="url"
                value={formData.portfolio}
                onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="johndoe.com"
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      {activeSection === 'summary' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Professional Summary *</label>
          <textarea
            value={formData.professional_summary}
            onChange={(e) => setFormData({ ...formData, professional_summary: e.target.value })}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Write a brief summary of your professional experience and key skills..."
          />
        </div>
      )}

      {/* Experience Section */}
      {activeSection === 'experience' && (
        <div className="space-y-4">
          {experiences.map((exp, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Tech Corp"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Present or Dec 2023"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bullet Points (one per line)</label>
                <textarea
                  value={Array.isArray(exp.bullets) ? exp.bullets.join('\n') : exp.bullets || ''}
                  onChange={(e) => {
                    const newExp = [...experiences]
                    newExp[idx] = { ...newExp[idx], bullets: e.target.value.split('\n').filter(b => b.trim()) }
                    setExperiences(newExp)
                  }}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="• Developed and maintained web applications&#10;• Led a team of 5 developers"
                />
              </div>
              <button
                onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}
                className="mt-2 text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setExperiences([...experiences, { job_title: '', company: '', start_date: '', end_date: '', bullets: [] }])}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
          >
            + Add Experience
          </button>
        </div>
      )}

      {/* Education Section */}
      {activeSection === 'education' && (
        <div className="space-y-4">
          {education.map((edu, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="University Name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="City, Country"
                  />
                </div>
              </div>
              <button
                onClick={() => setEducation(education.filter((_, i) => i !== idx))}
                className="mt-2 text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setEducation([...education, { degree: '', university: '', years: '', location: '' }])}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
          >
            + Add Education
          </button>
        </div>
      )}

      {/* Skills Section */}
      {activeSection === 'skills' && (
        <div className="space-y-4">
          {['programming', 'tools', 'databases', 'cloud', 'others'].map((category) => {
            const categorySkills = skills.filter(s => s.category === category)
            return (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{category}</label>
                <input
                  type="text"
                  value={categorySkills.map(s => s.skill_name).join(', ')}
                  onChange={(e) => {
                    const skillNames = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    const otherSkills = skills.filter(s => s.category !== category)
                    const newSkills = skillNames.map(name => ({ category, skill_name: name }))
                    setSkills([...otherSkills, ...newSkills])
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter skills separated by commas"
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Projects, Achievements, Certifications - Similar pattern */}
      {activeSection === 'projects' && (
        <div className="space-y-4">
          {projects.map((proj, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <input
                type="text"
                value={proj.title || ''}
                onChange={(e) => {
                  const newProj = [...projects]
                  newProj[idx] = { ...newProj[idx], title: e.target.value }
                  setProjects(newProj)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Project Title"
              />
              <textarea
                value={proj.description || ''}
                onChange={(e) => {
                  const newProj = [...projects]
                  newProj[idx] = { ...newProj[idx], description: e.target.value }
                  setProjects(newProj)
                }}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Project description"
              />
              <button
                onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setProjects([...projects, { title: '', description: '', contribution: '', tech_stack: '' }])}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
          >
            + Add Project
          </button>
        </div>
      )}

      {activeSection === 'achievements' && (
        <div className="space-y-4">
          {achievements.map((ach, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={ach.achievement_text || ach || ''}
                onChange={(e) => {
                  const newAch = [...achievements]
                  newAch[idx] = typeof ach === 'string' ? e.target.value : { ...ach, achievement_text: e.target.value }
                  setAchievements(newAch)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Achievement description"
              />
              <button
                onClick={() => setAchievements(achievements.filter((_, i) => i !== idx))}
                className="px-4 py-2 text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setAchievements([...achievements, ''])}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
          >
            + Add Achievement
          </button>
        </div>
      )}

      {activeSection === 'certifications' && (
        <div className="space-y-4">
          {certifications.map((cert, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={cert.certification_name || cert || ''}
                onChange={(e) => {
                  const newCert = [...certifications]
                  newCert[idx] = typeof cert === 'string' ? e.target.value : { ...cert, certification_name: e.target.value }
                  setCertifications(newCert)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Certification name"
              />
              <button
                onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                className="px-4 py-2 text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setCertifications([...certifications, ''])}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
          >
            + Add Certification
          </button>
        </div>
      )}
    </div>
  )
}

