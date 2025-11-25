'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import ResumeBuilder from '@/components/ResumeBuilder'
import ResumePreview from '@/components/ResumePreview'
import JobDescription from '@/components/JobDescription'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [jobDescription, setJobDescription] = useState('')
  const [optimizedResume, setOptimizedResume] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [activeTab, setActiveTab] = useState<'build' | 'optimize'>('build')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    try {
      // Check if profile exists
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
      }

      if (profile) {
        // Load related data
        const [experiences, education, skills, projects, achievements, certifications] = await Promise.all([
          supabase.from('experiences').select('*').eq('user_profile_id', profile.id).order('order_index'),
          supabase.from('education').select('*').eq('user_profile_id', profile.id).order('order_index'),
          supabase.from('skills').select('*').eq('user_profile_id', profile.id).order('order_index'),
          supabase.from('projects').select('*').eq('user_profile_id', profile.id).order('order_index'),
          supabase.from('achievements').select('*').eq('user_profile_id', profile.id).order('order_index'),
          supabase.from('certifications').select('*').eq('user_profile_id', profile.id).order('order_index')
        ])

        setProfileData({
          profile,
          experiences: experiences.data || [],
          education: education.data || [],
          skills: skills.data || [],
          projects: projects.data || [],
          achievements: achievements.data || [],
          certifications: certifications.data || []
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOptimize = async () => {
    if (!jobDescription.trim() || !profileData) {
      return
    }

    setIsOptimizing(true)
    try {
      // Build structured resume data from profile
      const resumeData = {
        name: profileData.profile.name,
        contact: {
          email: profileData.profile.email,
          phone: profileData.profile.phone || '',
          linkedin: profileData.profile.linkedin || '',
          github: profileData.profile.github || '',
          portfolio: profileData.profile.portfolio || ''
        },
        summary: profileData.profile.professional_summary || '',
        experience: profileData.experiences.map((exp: any) => ({
          title: exp.job_title,
          company: exp.company,
          startDate: exp.start_date,
          endDate: exp.end_date || 'Present',
          bullets: exp.bullets || []
        })),
        education: profileData.education.map((edu: any) => ({
          degree: edu.degree,
          university: edu.university,
          years: edu.years || '',
          location: edu.location || ''
        })),
        skills: {
          programming: profileData.skills.filter((s: any) => s.category === 'programming').map((s: any) => s.skill_name),
          tools: profileData.skills.filter((s: any) => s.category === 'tools').map((s: any) => s.skill_name),
          databases: profileData.skills.filter((s: any) => s.category === 'databases').map((s: any) => s.skill_name),
          cloud: profileData.skills.filter((s: any) => s.category === 'cloud').map((s: any) => s.skill_name),
          others: profileData.skills.filter((s: any) => s.category === 'others').map((s: any) => s.skill_name)
        },
        projects: profileData.projects.map((proj: any) => ({
          title: proj.title,
          description: proj.description || '',
          contribution: proj.contribution || '',
          techStack: proj.tech_stack || ''
        })),
        achievements: profileData.achievements.map((ach: any) => ach.achievement_text),
        certifications: profileData.certifications.map((cert: any) => cert.certification_name)
      }

      // Call transform API
      const formData = new FormData()
      formData.append('resumeData', JSON.stringify(resumeData))
      formData.append('jobDescription', jobDescription)

      const response = await fetch('/api/transform-structured', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setOptimizedResume(data.resume)

      // Save optimized resume
      if (profileData.profile.id) {
        await supabase.from('optimized_resumes').insert({
          user_profile_id: profileData.profile.id,
          job_description: jobDescription,
          job_title: data.jobTitle || '',
          optimized_resume_text: data.resume
        })
      }
    } catch (error: any) {
      console.error('Error optimizing resume:', error)
      alert(error.message || 'Failed to optimize resume')
    } finally {
      setIsOptimizing(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">Resume Optimizer</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{user.email}</span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('build')}
              className={`px-6 py-4 font-semibold border-b-2 transition ${
                activeTab === 'build'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Build Resume
            </button>
            <button
              onClick={() => setActiveTab('optimize')}
              className={`px-6 py-4 font-semibold border-b-2 transition ${
                activeTab === 'optimize'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Optimize for JD
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'build' ? (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <ResumeBuilder
                profileData={profileData}
                onSave={loadProfile}
              />
            </div>
            <div className="sticky top-4 h-fit">
              <ResumePreview profileData={profileData} />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {profileData ? (
              <>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Paste Job Description</h2>
                  <JobDescription
                    value={jobDescription}
                    onChange={setJobDescription}
                  />
                  <button
                    onClick={handleOptimize}
                    disabled={!jobDescription.trim() || isOptimizing}
                    className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    {isOptimizing ? 'Optimizing...' : 'Optimize Resume'}
                  </button>
                </div>
                {optimizedResume && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Optimized Resume</h2>
                    <ResumePreview 
                      optimizedResume={optimizedResume}
                      profileData={profileData}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <p className="text-gray-600 mb-4">Please build your resume first before optimizing.</p>
                <button
                  onClick={() => setActiveTab('build')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go to Build Resume
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

