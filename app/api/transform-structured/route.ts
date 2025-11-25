import { NextRequest, NextResponse } from 'next/server'
import { analyzeJobDescription, optimizeResumeData, formatResume, type ResumeData } from '@/app/api/transform/route'

export const runtime = 'nodejs'
export const maxDuration = 30

interface StructuredResumeData {
  name: string
  contact: {
    email: string
    phone?: string
    linkedin?: string
    github?: string
    portfolio?: string
  }
  summary: string
  experience: Array<{
    title: string
    company: string
    startDate: string
    endDate: string
    bullets: string[]
  }>
  education: Array<{
    degree: string
    university: string
    years?: string
    location?: string
  }>
  skills: {
    programming: string[]
    tools: string[]
    databases: string[]
    cloud: string[]
    others: string[]
  }
  projects?: Array<{
    title: string
    description?: string
    contribution?: string
    techStack?: string
  }>
  achievements?: string[]
  certifications?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const resumeDataJson = formData.get('resumeData') as string
    const jobDescription = formData.get('jobDescription') as string

    if (!resumeDataJson || !jobDescription) {
      return NextResponse.json(
        { error: 'Missing resume data or job description' },
        { status: 400 }
      )
    }

    const resumeData: StructuredResumeData = JSON.parse(resumeDataJson)

    // Convert structured data to ResumeData format
    const formattedData: ResumeData = {
      name: resumeData.name,
      contact: resumeData.contact,
      summary: resumeData.summary,
      experience: resumeData.experience.map(exp => ({
        title: exp.title,
        company: exp.company,
        startDate: exp.startDate,
        endDate: exp.endDate,
        bullets: exp.bullets
      })),
      education: resumeData.education.map(edu => ({
        degree: edu.degree,
        university: edu.university,
        years: edu.years || '',
        location: edu.location || ''
      })),
      skills: resumeData.skills,
      projects: resumeData.projects || [],
      achievements: resumeData.achievements || [],
      certifications: resumeData.certifications || []
    }

    // Analyze job description
    const jdAnalysis = analyzeJobDescription(jobDescription)

    // Extract job title from JD
    const jobTitleMatch = jobDescription.match(/(?:seeking|looking for|hiring|position|role|job|opening|title)[^.]*?((?:power\s*bi|business\s*intelligence|data|analytics|developer|engineer|analyst|specialist|manager|architect|consultant|lead|senior|junior|full.?stack|front.?end|back.?end)[^.]*?)/i)
    const jobTitle = jobTitleMatch ? jobTitleMatch[1].trim() : ''

    // Optimize resume data
    const optimizedData = optimizeResumeData(formattedData, jdAnalysis, jobDescription)

    // Format the optimized resume
    const optimizedResume = formatResume(optimizedData, jobDescription)

    return NextResponse.json({
      resume: optimizedResume,
      jobTitle
    })
  } catch (error: any) {
    console.error('Error transforming structured resume:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transform resume' },
      { status: 500 }
    )
  }
}

