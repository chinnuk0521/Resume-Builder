'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import ResumeBuilder from '@/components/ResumeBuilder'
import ResumePreview from '@/components/ResumePreview'
import JobDescription from '@/components/JobDescription'
import { supabase } from '@/lib/supabase'
import { HiOutlineDocumentText, HiOutlineSparkles } from 'react-icons/hi2'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [jobDescription, setJobDescription] = useState('')
  const [optimizedResume, setOptimizedResume] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [activeTab, setActiveTab] = useState<'build' | 'optimize'>('build')
  const [liveFormData, setLiveFormData] = useState<any>(null) // For real-time preview

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
      // Combine first, middle, and last name
      const firstName = profileData.profile.first_name || ''
      const middleName = profileData.profile.middle_name || ''
      const lastName = profileData.profile.last_name || ''
      const fullName = [firstName, middleName, lastName].filter(n => n && n.trim()).join(' ') || 
                      profileData.profile.name || // Fallback to old 'name' field
                      'Your Name'
      
      const resumeData = {
        name: fullName,
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Resume Builder
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700 font-medium">{user.email}</span>
              </div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('build')}
              className={`px-6 py-4 font-semibold border-b-2 transition-all relative ${
                activeTab === 'build'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <HiOutlineDocumentText className="w-5 h-5" />
                <span>Build Resume</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('optimize')}
              className={`px-6 py-4 font-semibold border-b-2 transition-all relative ${
                activeTab === 'optimize'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <HiOutlineSparkles className="w-5 h-5" />
                <span>Optimize for Job</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {activeTab === 'build' ? (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="lg:max-h-[calc(100vh-200px)] overflow-y-auto">
              <ResumeBuilder
                profileData={profileData}
                onSave={loadProfile}
                onDataChange={setLiveFormData}
              />
            </div>
            <div className="sticky top-4 h-fit lg:max-h-[calc(100vh-120px)]">
              <ResumePreview 
                profileData={profileData} 
                liveData={liveFormData}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {profileData ? (
              <>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Optimize Your Resume</h2>
                  <p className="text-gray-600 mb-6">Paste a job description below and we'll optimize your resume to match the requirements.</p>
                  <JobDescription
                    value={jobDescription}
                    onChange={setJobDescription}
                  />
                  <button
                    onClick={handleOptimize}
                    disabled={!jobDescription.trim() || isOptimizing}
                    className="mt-6 w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isOptimizing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Optimizing...
                      </span>
                    ) : (
                      'Optimize Resume'
                    )}
                  </button>
                </div>
                {optimizedResume && (
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Optimized Resume</h2>
                    <ResumePreview 
                      optimizedResume={optimizedResume}
                      profileData={profileData}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-12 text-center">
                <p className="text-gray-600 mb-6 text-lg">Please build your resume first before optimizing.</p>
                <button
                  onClick={() => setActiveTab('build')}
                  className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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

