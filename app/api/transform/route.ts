import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export interface ResumeData {
  name: string
  contact: {
    email: string
    phone: string
    linkedin: string
    portfolio: string
    github: string
  }
  summary: string
  experience: Experience[]
  education: Education[]
  skills: {
    programming: string[]
    tools: string[]
    databases: string[]
    cloud: string[]
    others: string[]
  }
  achievements: string[]
  projects: Project[]
  certifications: string[]
}

interface Experience {
  title: string
  company: string
  startDate: string
  endDate: string
  bullets: string[]
}

interface Education {
  degree: string
  university: string
  years: string
  location: string
}

interface Project {
  title: string
  description: string
  contribution: string
  techStack: string
}

// Constants for production limits
const MAX_RESUME_LENGTH = 50000 // 50KB of text
const MAX_JD_LENGTH = 20000 // 20KB job description
const MIN_RESUME_LENGTH = 50 // Minimum resume length
const MIN_JD_LENGTH = 20 // Minimum JD length
const LLM_TIMEOUT = 25000 // 25 seconds for LLM call
const PARSING_TIMEOUT = 10000 // 10 seconds for parsing

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse form data with timeout protection
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error: any) {
      console.error('[Transform API] FormData parsing error:', error.message)
      return NextResponse.json(
        { error: 'Invalid request format. Please try again.' },
        { status: 400 }
      )
    }

    const resumeText = formData.get('resumeText') as string
    const jobDescription = formData.get('jobDescription') as string

    // Comprehensive input validation
    if (!resumeText || typeof resumeText !== 'string') {
      return NextResponse.json(
        { error: 'Resume text is required' },
        { status: 400 }
      )
    }

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      )
    }

    // Sanitize and validate input lengths
    const sanitizedResumeText = resumeText.trim()
    const sanitizedJD = jobDescription.trim()

    if (sanitizedResumeText.length < MIN_RESUME_LENGTH) {
      return NextResponse.json(
        { error: `Resume text is too short. Minimum ${MIN_RESUME_LENGTH} characters required.` },
        { status: 400 }
      )
    }

    if (sanitizedResumeText.length > MAX_RESUME_LENGTH) {
      return NextResponse.json(
        { error: `Resume text is too long. Maximum ${MAX_RESUME_LENGTH} characters allowed.` },
        { status: 400 }
      )
    }

    if (sanitizedJD.length < MIN_JD_LENGTH) {
      return NextResponse.json(
        { error: `Job description is too short. Minimum ${MIN_JD_LENGTH} characters required.` },
        { status: 400 }
      )
    }

    if (sanitizedJD.length > MAX_JD_LENGTH) {
      return NextResponse.json(
        { error: `Job description is too long. Maximum ${MAX_JD_LENGTH} characters allowed.` },
        { status: 400 }
      )
    }

    // Parse resume with timeout protection
    let parsedResume: ResumeData
    try {
      const parsePromise = Promise.resolve(parseResume(sanitizedResumeText))
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Parsing timeout')), PARSING_TIMEOUT)
      )
      
      parsedResume = await Promise.race([parsePromise, timeoutPromise])
    } catch (parseError: any) {
      console.error('[Transform API] Resume parsing error:', parseError.message)
      // Return a basic parsed structure to continue
      parsedResume = {
        name: sanitizedResumeText.split('\n')[0] || 'Your Name',
        contact: { email: '', phone: '', linkedin: '', portfolio: '', github: '' },
        summary: sanitizedResumeText.substring(0, 500),
        experience: [],
        education: [],
        skills: { programming: [], tools: [], databases: [], cloud: [], others: [] },
        achievements: [],
        projects: [],
        certifications: []
      }
    }

    // Validate parsed resume has minimum data
    if (!parsedResume.summary || parsedResume.summary.length < 20) {
      parsedResume.summary = sanitizedResumeText.substring(0, 500) || 'Experienced professional with relevant skills and expertise.'
    }
    
    // Try LLM transformation with timeout, fallback to rule-based
    let transformedResume: string
    const useLLM = !!process.env.HF_TOKEN
    
    if (useLLM) {
      try {
        const llmPromise = transformResumeWithLLM(parsedResume, sanitizedJD, sanitizedResumeText)
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('LLM request timeout')), LLM_TIMEOUT)
        )
        
        transformedResume = await Promise.race([llmPromise, timeoutPromise])
        
        // Validate LLM output
        if (!transformedResume || transformedResume.length < 100) {
          throw new Error('LLM returned invalid response')
        }
      } catch (llmError: any) {
        console.warn('[Transform API] LLM transformation failed, using fallback:', llmError.message)
        // Always fallback to rule-based - never fail the user
        transformedResume = formatResume(parsedResume, sanitizedJD)
      }
    } else {
      // No LLM token, use rule-based directly
      transformedResume = formatResume(parsedResume, sanitizedJD)
    }

    // Final validation of output
    if (!transformedResume || transformedResume.length < 50) {
      // Last resort: return a basic formatted version
      transformedResume = formatResume(parsedResume, sanitizedJD)
    }

    const processingTime = Date.now() - startTime
    console.log(`[Transform API] Success - Processing time: ${processingTime}ms, Output length: ${transformedResume.length}`)

    return NextResponse.json({ 
      resume: transformedResume,
      processingTime: processingTime
    })
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error('[Transform API] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      processingTime
    })
    
    // Never return a 500 error to the user - always provide a fallback
    return NextResponse.json(
      { 
        error: 'We encountered an issue processing your resume. Please try again or contact support if the problem persists.',
        fallback: true
      },
      { status: 200 } // Return 200 with error message so user can still see something
    )
  }
}

function parseResume(text: string): ResumeData {
  // Input validation and sanitization
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid resume text input')
  }
  
  // Limit text size to prevent memory issues
  const safeText = text.length > MAX_RESUME_LENGTH 
    ? text.substring(0, MAX_RESUME_LENGTH) 
    : text
  
  console.log('[parseResume] Starting parse, text length:', safeText.length)
  
  try {
    const lines = safeText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    console.log('[parseResume] Total lines after filtering:', lines.length)
    
    // Limit lines to prevent performance issues
    const maxLines = 1000
    const safeLines = lines.length > maxLines ? lines.slice(0, maxLines) : lines
    
    const lowerText = safeText.toLowerCase()

    // Extract name (usually first line or first few words)
    console.log('[parseResume] Extracting name...')
    const name = extractName(safeLines)
    console.log('[parseResume] Extracted name:', name)

    // Extract contact information
    console.log('[parseResume] Extracting contact...')
    const contact = extractContact(safeText, safeLines)
    console.log('[parseResume] Extracted contact:', contact)

    // Extract summary
    console.log('[parseResume] Extracting summary...')
    const summary = extractSummary(safeText, lowerText, safeLines)
    console.log('[parseResume] Extracted summary length:', summary.length)

    // Extract experience
    console.log('[parseResume] Extracting experience...')
    const experience = extractExperience(safeText, lowerText, safeLines)
    console.log('[parseResume] Extracted experience count:', experience.length)

    // Extract education
    console.log('[parseResume] Extracting education...')
    const education = extractEducation(safeText, lowerText, safeLines)
    console.log('[parseResume] Extracted education count:', education.length)

    // Extract skills
    console.log('[parseResume] Extracting skills...')
    const skills = extractSkills(safeText, lowerText, safeLines)
    console.log('[parseResume] Extracted skills:', Object.keys(skills).map(k => `${k}: ${skills[k as keyof typeof skills].length}`).join(', '))

    // Extract achievements
    console.log('[parseResume] Extracting achievements...')
    const achievements = extractAchievements(safeText, lowerText, safeLines)
    console.log('[parseResume] Extracted achievements count:', achievements.length)

    // Extract projects
    console.log('[parseResume] Extracting projects...')
    const projects = extractProjects(safeText, lowerText, safeLines)
    console.log('[parseResume] Extracted projects count:', projects.length)

    // Extract certifications
    console.log('[parseResume] Extracting certifications...')
    const certifications = extractCertifications(safeText, lowerText, safeLines)
    console.log('[parseResume] Extracted certifications count:', certifications.length)

    return {
      name: name || 'Your Name',
      contact,
      summary: summary || 'Experienced professional with relevant skills and expertise.',
      experience: experience.slice(0, 10), // Limit to 10 experiences
      education: education.slice(0, 5), // Limit to 5 education entries
      skills,
      achievements: achievements.slice(0, 10), // Limit achievements
      projects: projects.slice(0, 5), // Limit projects
      certifications: certifications.slice(0, 5) // Limit certifications
    }
  } catch (parseError: any) {
    console.error('[parseResume] Error during parsing:', parseError.message)
    // Return minimal valid structure instead of failing
    return {
      name: 'Your Name',
      contact: { email: '', phone: '', linkedin: '', portfolio: '', github: '' },
      summary: text.substring(0, 500) || 'Experienced professional with relevant skills and expertise.',
      experience: [],
      education: [],
      skills: { programming: [], tools: [], databases: [], cloud: [], others: [] },
      achievements: [],
      projects: [],
      certifications: []
    }
  }
}

function extractName(lines: string[]): string {
  console.log('[extractName] Analyzing first 10 lines for name')
  // Name is usually the first substantial line (all caps or title case)
  // Skip lines that look like email, phone, or other contact info
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]
    console.log(`[extractName] Line ${i}:`, line.substring(0, 50))
    
    // Skip if it contains email, phone, or common resume keywords
    if (line.match(/@|phone|email|linkedin|github|portfolio|resume/i)) {
      console.log(`[extractName] Skipping line ${i} - contains contact info`)
      continue
    }
    
    // Skip if it's a section header
    if (line.match(/^(professional|summary|experience|education|skills|projects|achievements|certifications)/i)) {
      console.log(`[extractName] Skipping line ${i} - section header`)
      continue
    }
    
    // Check if it looks like a name (2-4 words, title case or all caps, no special chars except hyphens and periods)
    // Name patterns: "John Doe", "JOHN DOE", "Mary-Jane Smith", "Dr. John Doe"
    if (line.match(/^[A-Z][a-z]+([\s\-\.][A-Z][a-z]+){0,3}$/) || 
        (line.match(/^[A-Z\s]{2,40}$/) && line.split(' ').length >= 2 && line.split(' ').length <= 4)) {
      console.log(`[extractName] Found name on line ${i}:`, line)
      return line.toUpperCase()
    }
    
    // Also check for names that might have middle initials or suffixes
    if (line.match(/^[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+/)) {
      console.log(`[extractName] Found name with middle initial on line ${i}:`, line)
      return line.toUpperCase()
    }
  }
  
  console.log('[extractName] No name found, returning default')
  return 'YOUR NAME'
}

function extractContact(text: string, lines: string[]): ResumeData['contact'] {
  const contact: ResumeData['contact'] = {
    email: '',
    phone: '',
    linkedin: '',
    portfolio: '',
    github: ''
  }

  // Extract email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
  if (emailMatch) contact.email = emailMatch[0]

  // Extract phone
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{10,15}/)
  if (phoneMatch) contact.phone = phoneMatch[0]

  // Extract LinkedIn
  const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/i)
  if (linkedinMatch) {
    contact.linkedin = `linkedin.com/in/${linkedinMatch[1]}`
  } else {
    const linkedinText = text.match(/linkedin[:\s]+([^\s\n]+)/i)
    if (linkedinText) contact.linkedin = linkedinText[1]
  }

  // Extract Portfolio/GitHub
  const githubMatch = text.match(/(?:github\.com\/)([a-zA-Z0-9-]+)/i)
  if (githubMatch) {
    contact.github = `github.com/${githubMatch[1]}`
  }

  const portfolioMatch = text.match(/(?:portfolio[:\s]+|website[:\s]+)([^\s\n]+)/i)
  if (portfolioMatch) contact.portfolio = portfolioMatch[1]

  return contact
}

function extractSummary(text: string, lowerText: string, lines: string[]): string {
  const summaryKeywords = ['professional summary', 'summary', 'objective', 'profile', 'about me']
  
  for (const keyword of summaryKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      const section = text.substring(index + keyword.length, index + 800)
      const summaryLines = section.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10 && !line.match(/^(experience|education|skills|projects|achievements)/i))
        .slice(0, 5)
        .join(' ')
      
      if (summaryLines.length > 50) {
        return summaryLines.substring(0, 500).trim()
      }
    }
  }

  // Fallback: use first substantial paragraph
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 100 && !lines[i].match(/^(email|phone|linkedin|github)/i)) {
      return lines[i].substring(0, 500)
    }
  }

  return 'Experienced professional with a strong background in relevant skills and expertise.'
}

function extractExperience(text: string, lowerText: string, lines: string[]): Experience[] {
  console.log('[extractExperience] Starting extraction')
  const experiences: Experience[] = []
  const expKeywords = ['experience', 'work experience', 'employment', 'professional experience', 'work history']
  
  let expStartIndex = -1
  for (const keyword of expKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      expStartIndex = index + keyword.length
      console.log('[extractExperience] Found experience section at index:', expStartIndex, 'keyword:', keyword)
      break
    }
  }

  if (expStartIndex === -1) {
    console.log('[extractExperience] No experience section found, trying pattern matching...')
    // Try to find experience by looking for job titles and companies
    return findExperienceByPattern(text, lines)
  }

  const expSection = text.substring(expStartIndex)
  console.log('[extractExperience] Experience section length:', expSection.length)
  console.log('[extractExperience] First 300 chars of exp section:', expSection.substring(0, 300))
  
  const expBlocks = expSection.split(/\n\s*\n/).filter(block => block.trim().length > 20)
  console.log('[extractExperience] Found', expBlocks.length, 'experience blocks')

  for (let i = 0; i < Math.min(10, expBlocks.length); i++) {
    const block = expBlocks[i]
    console.log(`[extractExperience] Parsing block ${i + 1}, length:`, block.length)
    console.log(`[extractExperience] Block ${i + 1} preview:`, block.substring(0, 150))
    const exp = parseExperienceBlock(block)
    if (exp) {
      console.log(`[extractExperience] Successfully parsed exp ${i + 1}:`, exp.title, 'at', exp.company, `(${exp.bullets.length} bullets)`)
      experiences.push(exp)
    } else {
      console.log(`[extractExperience] Failed to parse block ${i + 1}`)
    }
  }

  if (experiences.length === 0) {
    console.log('[extractExperience] No experiences found, trying pattern matching fallback...')
    return findExperienceByPattern(text, lines)
  }

  console.log('[extractExperience] Total experiences extracted:', experiences.length)
  return experiences
}

function parseExperienceBlock(block: string): Experience | null {
  console.log('[parseExperienceBlock] Parsing block, length:', block.length)
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  console.log('[parseExperienceBlock] Block has', lines.length, 'lines')
  if (lines.length < 2) {
    console.log('[parseExperienceBlock] Block has too few lines, returning null')
    return null
  }

  // Check if this looks like education (college, university, degree, percentage, GPA) - skip it
  const educationKeywords = ['college', 'university', 'degree', 'bachelor', 'master', 'phd', 'diploma', 'percentage', '%', 'gpa', 'cgpa', 'grade']
  const blockLower = block.toLowerCase()
  const hasEducationKeywords = educationKeywords.some(keyword => blockLower.includes(keyword))
  
  if (hasEducationKeywords && !blockLower.match(/\b(developer|engineer|analyst|manager|specialist|consultant|associate|lead|senior|junior|intern|trainee|employee|staff)\b/i)) {
    console.log('[parseExperienceBlock] Block appears to be education, skipping')
    return null
  }

  // Try to find title and company (usually first or second line)
  let title = ''
  let company = ''
  let startDate = ''
  let endDate = ''
  const bullets: string[] = []

  // Look for date patterns - improved to handle multiple dates
  const datePattern = /(\w+\s+\d{4}|\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\d{4}|present|current)/i
  const allDates = block.match(/\d{4}/g)
  
  if (allDates && allDates.length >= 2) {
    // Take the first two dates as start and end
    startDate = allDates[0]
    endDate = allDates[1]
    console.log('[parseExperienceBlock] Found dates from pattern:', startDate, 'to', endDate)
  } else {
    const dateMatch = block.match(datePattern)
    if (dateMatch) {
      startDate = dateMatch[1].trim()
      endDate = dateMatch[2].trim()
      console.log('[parseExperienceBlock] Found dates:', startDate, 'to', endDate)
    } else {
      console.log('[parseExperienceBlock] No date pattern found')
    }
  }

  // Look for title and company
  console.log('[parseExperienceBlock] Analyzing first 5 lines for title/company:')
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i]
    console.log(`[parseExperienceBlock] Line ${i}:`, line.substring(0, 80))
    
    // Skip date lines
    if (line.match(datePattern) || line.match(/^\d{4}\s*[-–—]\s*\d{4}/)) {
      console.log(`[parseExperienceBlock] Skipping line ${i} - date line`)
      continue
    }
    
    // Skip percentage/GPA lines
    if (line.match(/\d+%|gpa|cgpa/i)) {
      console.log(`[parseExperienceBlock] Skipping line ${i} - percentage/GPA`)
      continue
    }
    
    if (line.length > 5) {
      if (!title) {
        // Check if it contains common job title keywords
        if (line.match(/\b(developer|engineer|analyst|manager|specialist|consultant|associate|lead|senior|junior|intern|trainee|employee|staff|developer|programmer|architect|designer)\b/i)) {
          title = line
          console.log('[parseExperienceBlock] Identified as title:', title)
        } else if (!company && !line.match(/^(email|phone|linkedin|github)/i)) {
          // If it doesn't look like a job title but also doesn't look like contact info, it might be company
          company = line
          console.log('[parseExperienceBlock] Identified as company:', company)
        }
      } else if (!company && !line.match(/^(email|phone|linkedin|github)/i)) {
        company = line
        console.log('[parseExperienceBlock] Identified as company:', company)
      }
    }
  }

  // Extract bullets (lines starting with •, -, *, or numbers)
  console.log('[parseExperienceBlock] Extracting bullets from', lines.length, 'lines')
  for (const line of lines) {
    if (line.match(/^[•\-\*\d+\.]\s+/) && line.length > 10) {
      const bullet = line.replace(/^[•\-\*\d+\.]\s+/, '').trim()
      bullets.push(bullet)
      console.log('[parseExperienceBlock] Found bullet:', bullet.substring(0, 60))
    }
  }
  console.log('[parseExperienceBlock] Total bullets found:', bullets.length)

  if (title || company) {
    const result = {
      title: title || 'Position',
      company: company || 'Company',
      startDate: startDate || 'Start Date',
      endDate: endDate || 'End Date',
      bullets: bullets.length > 0 ? bullets : ['Key responsibilities and achievements']
    }
    console.log('[parseExperienceBlock] Returning experience:', result.title, 'at', result.company)
    return result
  }

  console.log('[parseExperienceBlock] No title or company found, returning null')
  return null
}

function findExperienceByPattern(text: string, lines: string[]): Experience[] {
  console.log('[findExperienceByPattern] Starting pattern-based search')
  const experiences: Experience[] = []
  const jobTitlePattern = /\b(software|developer|engineer|analyst|manager|specialist|consultant|associate|lead|senior|junior|full.?stack|front.?end|back.?end)\b/i

  console.log('[findExperienceByPattern] Searching through', lines.length, 'lines')
  let matchesFound = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(jobTitlePattern) && lines[i].length < 100) {
      matchesFound++
      console.log(`[findExperienceByPattern] Found potential job title at line ${i}:`, lines[i])
      const lineIndex = text.indexOf(lines[i])
      if (lineIndex !== -1) {
        const exp = parseExperienceBlock(text.substring(lineIndex, lineIndex + 500))
        if (exp) {
          console.log('[findExperienceByPattern] Successfully parsed:', exp.title)
          experiences.push(exp)
        }
      }
    }
  }
  console.log('[findExperienceByPattern] Found', matchesFound, 'potential job titles, parsed', experiences.length, 'experiences')
  return experiences.slice(0, 5)
}

function extractEducation(text: string, lowerText: string, lines: string[]): Education[] {
  const education: Education[] = []
  const eduKeywords = ['education', 'academic', 'qualification']
  
  let eduStartIndex = -1
  for (const keyword of eduKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      eduStartIndex = index + keyword.length
      break
    }
  }

  if (eduStartIndex === -1) {
    // Look for degree patterns
    return findEducationByPattern(text, lines)
  }

  const eduSection = text.substring(eduStartIndex)
  const eduLines = eduSection.split('\n').map(l => l.trim()).filter(l => l.length > 5)

  // Look for degree patterns
  const degreePattern = /\b(B\.?\s?Tech|B\.?\s?S\.?|B\.?\s?A\.?|M\.?\s?Tech|M\.?\s?S\.?|M\.?\s?A\.?|PhD|Bachelor|Master|Diploma)\b/i
  
  for (let i = 0; i < eduLines.length; i++) {
    if (eduLines[i].match(degreePattern)) {
      const edu = parseEducationLine(eduLines, i)
      if (edu) education.push(edu)
    }
  }

  return education.length > 0 ? education : findEducationByPattern(text, lines)
}

function parseEducationLine(lines: string[], index: number): Education | null {
  console.log(`[parseEducationLine] Parsing education at line ${index}`)
  const degreeLine = lines[index]
  console.log(`[parseEducationLine] Degree line:`, degreeLine)
  
  // Look for degree patterns - more comprehensive
  const degreePattern = /\b(B\.?\s?Tech|B\.?\s?S\.?|B\.?\s?A\.?|M\.?\s?Tech|M\.?\s?S\.?|M\.?\s?A\.?|PhD|Bachelor|Master|Diploma|B\.?E\.?|M\.?E\.?|B\.?Com|M\.?Com)[^\n]*/i
  const degreeMatch = degreeLine.match(degreePattern)
  
  if (!degreeMatch) {
    console.log(`[parseEducationLine] No degree pattern found`)
    return null
  }

  const degree = degreeMatch[0].trim()
  let university = ''
  let years = ''
  let location = ''

  // Look for university in the same line or nearby lines
  // First check the same line
  const universityInLine = degreeLine.match(/\b([A-Z][a-zA-Z\s]+(?:University|College|Institute|School))\b/)
  if (universityInLine) {
    university = universityInLine[1].trim()
    console.log(`[parseEducationLine] Found university in same line:`, university)
  } else {
    // Look in nearby lines
    for (let i = Math.max(0, index - 1); i < Math.min(lines.length, index + 4); i++) {
      if (i === index) continue
      const line = lines[i]
      if (line.match(/\b(university|college|institute|school)\b/i) && line.length < 100) {
        university = line.trim()
        console.log(`[parseEducationLine] Found university in nearby line ${i}:`, university)
        break
      }
    }
  }

  // Look for dates - improved pattern
  const allDates = degreeLine.match(/\d{4}/g)
  if (allDates && allDates.length >= 1) {
    if (allDates.length >= 2) {
      years = `${allDates[0]} - ${allDates[1]}`
    } else {
      years = allDates[0]
    }
    console.log(`[parseEducationLine] Found years:`, years)
  }

  // Look for location
  const locationMatch = degreeLine.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s*(?:State|Province|Country|City)?\b/)
  if (locationMatch && !university.includes(locationMatch[1])) {
    location = locationMatch[1].trim()
    console.log(`[parseEducationLine] Found location:`, location)
  }

  const result = {
    degree: degree || 'Degree',
    university: university || 'University',
    years: years || 'Years',
    location: location || 'Location'
  }
  
  console.log(`[parseEducationLine] Parsed education:`, result)
  return result
}

function findEducationByPattern(text: string, lines: string[]): Education[] {
  const education: Education[] = []
  const degreePattern = /\b(B\.?\s?Tech|B\.?\s?S\.?|B\.?\s?A\.?|M\.?\s?Tech|M\.?\s?S\.?|M\.?\s?A\.?|PhD|Bachelor|Master)\b/i

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(degreePattern)) {
      const edu = parseEducationLine(lines, i)
      if (edu) education.push(edu)
    }
  }

  return education.slice(0, 3)
}

function extractSkills(text: string, lowerText: string, lines: string[]): ResumeData['skills'] {
  console.log('[extractSkills] Starting skill extraction')
  const skills: ResumeData['skills'] = {
    programming: [],
    tools: [],
    databases: [],
    cloud: [],
    others: []
  }

  const skillKeywords = {
    programming: ['python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'react', 'node', 'angular', 'vue', 'html', 'css', 'solidity', 'go', 'golang', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl'],
    tools: ['git', 'docker', 'kubernetes', 'jenkins', 'jira', 'postman', 'agile', 'scrum', 'tdd', 'ci/cd', 'cicd', 'bitbucket', 'sourcetree', 'github', 'gitlab', 'terraform', 'ansible'],
    databases: ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo', 'redis', 'oracle', 'dynamodb', 'cassandra', 'elasticsearch', 'nosql'],
    cloud: ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify', 'digitalocean'],
    others: ['power bi', 'tableau', 'etl', 'rest', 'restful', 'api', 'graphql', 'microservices', 'blockchain', 'smart contracts', 'dlt', 'hedera', 'ai', 'machine learning', 'ml', 'deep learning', 'nlp']
  }

  const allText = text.toLowerCase()
  let totalMatches = 0

  for (const [category, keywords] of Object.entries(skillKeywords)) {
    let categoryMatches = 0
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        totalMatches++
        categoryMatches++
        const capitalized = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        if (category === 'programming') {
          skills.programming.push(capitalized)
        } else if (category === 'tools') {
          skills.tools.push(capitalized)
        } else if (category === 'databases') {
          skills.databases.push(capitalized)
        } else if (category === 'cloud') {
          skills.cloud.push(capitalized)
        } else {
          skills.others.push(capitalized)
        }
      }
    }
    console.log(`[extractSkills] ${category}: found ${categoryMatches} matches`)
  }
  console.log('[extractSkills] Total keyword matches:', totalMatches)

  // Also extract from skills section
  const skillsIndex = lowerText.indexOf('skills')
  if (skillsIndex !== -1) {
    console.log('[extractSkills] Found skills section at index:', skillsIndex)
    const skillsSection = text.substring(skillsIndex, skillsIndex + 1000)
    const skillsLines = skillsSection.split('\n').slice(1, 20)
    console.log('[extractSkills] Processing', skillsLines.length, 'lines from skills section')
    
    let sectionMatches = 0
    for (const line of skillsLines) {
      const cleanLine = line.replace(/[•\-\*]/g, '').trim().toLowerCase()
      if (cleanLine.length > 2 && cleanLine.length < 50) {
        // Try to categorize
        const found = Object.values(skillKeywords).flat().find(k => cleanLine.includes(k))
        if (found) {
          sectionMatches++
          const capitalized = found.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          if (!skills.programming.includes(capitalized) && 
              !skills.tools.includes(capitalized) && 
              !skills.databases.includes(capitalized) &&
              !skills.cloud.includes(capitalized) &&
              !skills.others.includes(capitalized)) {
            skills.others.push(capitalized)
            console.log('[extractSkills] Added from skills section:', capitalized)
          }
        }
      }
    }
    console.log('[extractSkills] Added', sectionMatches, 'skills from skills section')
  } else {
    console.log('[extractSkills] No skills section found')
  }

  console.log('[extractSkills] Final skills:', {
    programming: skills.programming.length,
    tools: skills.tools.length,
    databases: skills.databases.length,
    cloud: skills.cloud.length,
    others: skills.others.length
  })

  return skills
}

function extractAchievements(text: string, lowerText: string, lines: string[]): string[] {
  const achievements: string[] = []
  const achievementKeywords = ['achievement', 'accomplishment', 'award', 'recognition']

  let achStartIndex = -1
  for (const keyword of achievementKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      achStartIndex = index + keyword.length
      break
    }
  }

  if (achStartIndex !== -1) {
    const achSection = text.substring(achStartIndex, achStartIndex + 800)
    const achLines = achSection.split('\n').map(l => l.trim()).filter(l => l.length > 10)
    
    for (const line of achLines.slice(0, 10)) {
      if (line.match(/^[•\-\*\d+\.]\s+/) || line.match(/\d+%/) || line.match(/\d+\+/)) {
        achievements.push(line.replace(/^[•\-\*\d+\.]\s+/, '').trim())
      }
    }
  }

  // Also look for quantified achievements in experience section
  const quantPattern = /(?:improved|increased|reduced|decreased|delivered|achieved|implemented).*?\d+%/i
  const matches = text.match(new RegExp(quantPattern, 'g'))
  if (matches) {
    for (const match of matches.slice(0, 5)) {
      if (!achievements.some(a => a.includes(match.substring(0, 20)))) {
        achievements.push(match.trim())
      }
    }
  }

  return achievements.slice(0, 6)
}

function extractProjects(text: string, lowerText: string, lines: string[]): Project[] {
  const projects: Project[] = []
  const projectIndex = lowerText.indexOf('project')
  
  if (projectIndex !== -1) {
    const projectSection = text.substring(projectIndex, projectIndex + 2000)
    const projectBlocks = projectSection.split(/\n\s*\n/).filter(b => b.trim().length > 20)
    
    for (const block of projectBlocks.slice(0, 5)) {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      if (lines.length >= 2) {
        projects.push({
          title: lines[0] || 'Project Title',
          description: lines.slice(1, 3).join(' ') || 'Project description',
          contribution: lines.find(l => l.match(/(?:developed|built|created|designed)/i)) || 'Key contributions',
          techStack: lines.find(l => l.match(/(?:tech|stack|technologies|tools)/i)) || 'Technologies used'
        })
      }
    }
  }

  return projects
}

function extractCertifications(text: string, lowerText: string, lines: string[]): string[] {
  const certifications: string[] = []
  const certKeywords = ['certification', 'certified', 'certificate', 'cert']

  let certStartIndex = -1
  for (const keyword of certKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      certStartIndex = index + keyword.length
      break
    }
  }

  if (certStartIndex !== -1) {
    const certSection = text.substring(certStartIndex, certStartIndex + 500)
    const certLines = certSection.split('\n').map(l => l.trim()).filter(l => l.length > 5 && l.length < 100)
    
    for (const line of certLines.slice(0, 5)) {
      if (line.match(/^[•\-\*]\s+/) || line.match(/\b(certified|certification|certificate)\b/i)) {
        certifications.push(line.replace(/^[•\-\*]\s+/, '').trim())
      }
    }
  }

  return certifications.slice(0, 5)
}

async function transformResumeWithLLM(data: ResumeData, jobDescription: string, originalResumeText: string): Promise<string> {
  const hfToken = process.env.HF_TOKEN
  
  if (!hfToken || hfToken.trim().length === 0) {
    throw new Error('HF_TOKEN not configured')
  }

  // Validate input data
  if (!data || !jobDescription || jobDescription.trim().length < MIN_JD_LENGTH) {
    throw new Error('Invalid input data for LLM transformation')
  }

  // Build the formatted resume structure for LLM with size limits
  const resumeStructure = buildResumeStructure(data)
  
  // Limit prompt size to avoid token limits
  const maxPromptLength = 15000
  const truncatedJD = jobDescription.length > maxPromptLength 
    ? jobDescription.substring(0, maxPromptLength) + '...'
    : jobDescription
  
  const prompt = `You are an expert resume builder and ATS (Applicant Tracking System) specialist. Transform the resume below to achieve 95%+ keyword matching with the job description.

CRITICAL INSTRUCTIONS - MUST FOLLOW EXACTLY:
1. EXTRACT the EXACT job title/role from the JD (e.g., "Power BI Developer/Analyst") and use it in the Professional Summary
2. REPLACE ALL technologies, tools, and skills with EXACT keywords from the job description (e.g., "Power BI" not "power bi", "Business Intelligence" not "BI")
3. Use the EXACT same terminology, phrases, and keywords that appear in the JD - word-for-word when possible
4. In Professional Summary: Start with the EXACT role title from JD, mention ALL key JD technologies, and use JD terminology throughout
5. In Experience bullets: Replace generic terms with JD-specific terms (e.g., "dashboards" → "Power BI dashboards", "reports" → "business intelligence reports")
6. In Skills section: List JD technologies FIRST in each category, then add others
7. Maintain the exact resume structure and format shown below
8. Keep all factual information accurate (names, companies, dates, achievements, metrics)
9. Ensure EVERY bullet point naturally incorporates at least 2-3 JD keywords
10. Add missing JD technologies to skills if candidate has ANY related experience
11. Replace weak action verbs with stronger ones from the JD (e.g., "design", "develop", "maintain", "collaborate")
12. Target 95%+ keyword match rate for maximum ATS shortlisting

OUTPUT FORMAT - Follow this EXACT structure:
[NAME]

[Email] | [Phone] | [LinkedIn] | [Portfolio] | [GitHub]

PROFESSIONAL SUMMARY

[2-3 lines optimized with JD keywords]

EXPERIENCE

[Job Title] — [Company]

[Start Date] – [End Date]

• [Bullet with JD keywords and metrics]
• [Bullet with JD keywords and metrics]
• [Bullet with JD keywords and metrics]

[Repeat for all experiences]

EDUCATION

[Degree] — [University]

[Years] | [Location]

SKILLS

• Programming: [JD technologies first, then others]
• Tools & Tech: [JD tools first]
• Databases: [JD databases if mentioned]
• Cloud: [JD cloud platforms if mentioned]
• Others: [Additional relevant skills]

ACHIEVEMENTS

• [Achievement with JD keywords]
• [Achievement with JD keywords]

[PROJECTS if applicable]

[LINKS if applicable]

CURRENT RESUME:
${resumeStructure}

TARGET JOB DESCRIPTION:
${truncatedJD}

Transform the resume above to perfectly match the job description. Use EXACT keywords from the JD. Return ONLY the transformed resume following the format above, with no explanations or additional text.`

  // Add retry logic for network issues
  let lastError: Error | null = null
  const maxRetries = 2
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
        console.log(`[transformResumeWithLLM] Retry attempt ${attempt}`)
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT)

      const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hfToken}`,
        },
        body: JSON.stringify({
          model: 'moonshotai/Kimi-K2-Instruct-0905',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 3000,
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`HF API error: ${response.status} - ${errorText.substring(0, 200)}`)
      }

      const result = await response.json()
      
      if (!result || !result.choices || !result.choices[0]) {
        throw new Error('Invalid response structure from LLM')
      }
      
      const transformedText = result.choices[0]?.message?.content

      if (!transformedText || typeof transformedText !== 'string') {
        throw new Error('No valid content in LLM response')
      }

      // Clean up the response (remove any markdown formatting if present)
      let cleaned = transformedText.trim()
      
      // Remove markdown code blocks if present
      cleaned = cleaned.replace(/```[\s\S]*?```/g, '')
      cleaned = cleaned.replace(/^#+\s*/gm, '')
      cleaned = cleaned.replace(/^\*\*|\*\*$/g, '') // Remove bold markers
      
      // Validate cleaned output
      if (cleaned.length < 100) {
        throw new Error('LLM response too short after cleaning')
      }

      // Limit output size to prevent issues
      if (cleaned.length > MAX_RESUME_LENGTH) {
        cleaned = cleaned.substring(0, MAX_RESUME_LENGTH)
      }

      console.log(`[transformResumeWithLLM] Success - Output length: ${cleaned.length}`)
      return cleaned
      
    } catch (fetchError: any) {
      lastError = fetchError
      
      // Don't retry on certain errors
      if (fetchError.name === 'AbortError') {
        throw new Error('LLM request timeout')
      }
      
      if (fetchError.message?.includes('401') || fetchError.message?.includes('403')) {
        throw new Error('Authentication failed with LLM service')
      }
      
      // Retry on network errors
      if (attempt < maxRetries && (
        fetchError.message?.includes('fetch') || 
        fetchError.message?.includes('network') ||
        fetchError.message?.includes('timeout')
      )) {
        continue
      }
      
      throw fetchError
    }
  }
  
  throw lastError || new Error('LLM transformation failed after retries')
}

function buildResumeStructure(data: ResumeData): string {
  console.log('[buildResumeStructure] Building structure for LLM')
  console.log('[buildResumeStructure] Input - Experience:', data.experience.length, 'Education:', data.education.length, 'Skills:', Object.keys(data.skills).length)
  
  let structure = ''

  structure += `NAME: ${data.name}\n\n`
  
  structure += `CONTACT:\n`
  if (data.contact.email) structure += `Email: ${data.contact.email}\n`
  if (data.contact.phone) structure += `Phone: ${data.contact.phone}\n`
  if (data.contact.linkedin) structure += `LinkedIn: ${data.contact.linkedin}\n`
  if (data.contact.portfolio) structure += `Portfolio: ${data.contact.portfolio}\n`
  if (data.contact.github) structure += `GitHub: ${data.contact.github}\n`
  structure += '\n'

  structure += `PROFESSIONAL SUMMARY:\n${data.summary}\n\n`

  structure += `EXPERIENCE:\n`
  console.log('[buildResumeStructure] Adding', data.experience.length, 'experiences')
  for (let i = 0; i < data.experience.length; i++) {
    const exp = data.experience[i]
    console.log(`[buildResumeStructure] Experience ${i + 1}: ${exp.title} at ${exp.company} (${exp.bullets.length} bullets)`)
    structure += `${exp.title} — ${exp.company}\n`
    structure += `${exp.startDate} – ${exp.endDate}\n`
    for (const bullet of exp.bullets) {
      structure += `• ${bullet}\n`
    }
    structure += '\n'
  }

  structure += `EDUCATION:\n`
  for (const edu of data.education) {
    structure += `${edu.degree} — ${edu.university}\n`
    structure += `${edu.years} | ${edu.location}\n\n`
  }

  structure += `SKILLS:\n`
  if (data.skills.programming.length > 0) {
    structure += `Programming: ${data.skills.programming.join(', ')}\n`
  }
  if (data.skills.tools.length > 0) {
    structure += `Tools: ${data.skills.tools.join(', ')}\n`
  }
  if (data.skills.databases.length > 0) {
    structure += `Databases: ${data.skills.databases.join(', ')}\n`
  }
  if (data.skills.cloud.length > 0) {
    structure += `Cloud: ${data.skills.cloud.join(', ')}\n`
  }
  if (data.skills.others.length > 0) {
    structure += `Others: ${data.skills.others.join(', ')}\n`
  }
  structure += '\n'

  if (data.achievements.length > 0) {
    structure += `ACHIEVEMENTS:\n`
    for (const achievement of data.achievements) {
      structure += `• ${achievement}\n`
    }
    structure += '\n'
  }

  if (data.projects.length > 0) {
    structure += `PROJECTS:\n`
    for (const project of data.projects) {
      structure += `${project.title}\n`
      structure += `• ${project.description}\n`
      structure += `• ${project.contribution}\n`
      structure += `• ${project.techStack}\n\n`
    }
  }

  if (data.certifications.length > 0) {
    structure += `CERTIFICATIONS:\n`
    for (const cert of data.certifications) {
      structure += `• ${cert}\n`
    }
    structure += '\n'
  }

  return structure
}

export function formatResume(data: ResumeData, jobDescription: string): string {
  console.log('[formatResume] Starting resume formatting')
  console.log('[formatResume] Input data - Experience:', data.experience.length, 'Education:', data.education.length)
  
  // Extract keywords and requirements from job description
  console.log('[formatResume] Analyzing job description...')
  const jdAnalysis = analyzeJobDescription(jobDescription)
  console.log('[formatResume] JD Analysis - Technologies:', jdAnalysis.technologies.length, 'Skills:', jdAnalysis.skills.length)
  
  // Optimize resume data based on JD
  console.log('[formatResume] Optimizing resume data...')
  const optimizedData = optimizeResumeData(data, jdAnalysis, jobDescription)
  console.log('[formatResume] Optimized data - Experience:', optimizedData.experience.length, 'Education:', optimizedData.education.length)
  
  let resume = ''

  // Header: Name
  resume += `${optimizedData.name}\n\n`

  // Contact Information
  const contactParts: string[] = []
  if (optimizedData.contact.email) contactParts.push(optimizedData.contact.email)
  if (optimizedData.contact.phone) contactParts.push(optimizedData.contact.phone)
  if (optimizedData.contact.linkedin) contactParts.push(optimizedData.contact.linkedin)
  if (optimizedData.contact.portfolio) contactParts.push(optimizedData.contact.portfolio)
  if (optimizedData.contact.github) contactParts.push(optimizedData.contact.github)
  
  if (contactParts.length > 0) {
    resume += `${contactParts.join(' | ')}\n\n`
  }

  // PROFESSIONAL SUMMARY
  resume += `PROFESSIONAL SUMMARY\n\n`
  const optimizedSummary = optimizeSummary(optimizedData.summary, jdAnalysis, jobDescription)
  // Clean up summary - remove extra spaces and ensure proper formatting
  const cleanSummary = optimizedSummary
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
  resume += `${cleanSummary}\n\n`

  // WORK EXPERIENCE
  if (optimizedData.experience.length > 0) {
    resume += `WORK EXPERIENCE\n\n`
    for (const exp of optimizedData.experience) {
      // Validate experience entry - skip if title/company are placeholders or invalid
      if (exp.title === 'Position' || exp.company === 'Company' || 
          exp.title.toLowerCase().includes('technical skills') ||
          exp.company.toLowerCase().includes('technical skills')) {
        console.log('[formatResume] Skipping invalid experience entry:', exp.title, exp.company)
        continue
      }
      
      // Optimize job title if it matches JD role
      const optimizedTitle = optimizeJobTitle(exp.title, jdAnalysis)
      
      // Format exactly like PDF: | Job Title | dates
      const dateRange = (exp.startDate !== 'Start Date' && exp.endDate !== 'End Date')
        ? `${exp.startDate.replace(/\s*[-–—]\s*/, '–')} – ${exp.endDate.replace(/\s*[-–—]\s*/, '–')}`
        : ''
      
      if (dateRange) {
        resume += `| ${optimizedTitle} | ${dateRange}\n`
      } else {
        resume += `| ${optimizedTitle} |\n`
      }
      
      // Company name on next line (uppercase)
      resume += `${exp.company.toUpperCase()}\n\n`
      
      // Only add bullets if they exist and aren't placeholders
      if (exp.bullets.length > 0 && !exp.bullets[0].includes('Key responsibilities and achievements')) {
        for (const bullet of exp.bullets) {
          if (bullet.trim().length > 5) {
            const optimizedBullet = optimizeExperienceBullet(bullet, jdAnalysis, jobDescription)
            resume += `• ${optimizedBullet}\n\n`
          }
        }
      }
    }
  } else {
    console.log('[formatResume] WARNING: No valid experiences to format!')
  }

  // PROJECTS (optional)
  if (optimizedData.projects.length > 0) {
    resume += `PROJECTS\n\n`
    for (const project of optimizedData.projects) {
      // Skip if title is placeholder
      if (project.title === 'Project Title' || project.title.trim().length < 3) {
        continue
      }
      resume += `${project.title}\n\n`
      if (project.description && project.description !== 'Project description') {
        const optimizedDesc = optimizeText(project.description, jdAnalysis, jobDescription)
        resume += `• ${optimizedDesc}\n\n`
      }
      if (project.contribution && project.contribution !== 'Key contributions') {
        const optimizedContrib = optimizeText(project.contribution, jdAnalysis, jobDescription)
        resume += `• ${optimizedContrib}\n\n`
      }
      if (project.techStack && project.techStack !== 'Technologies used') {
        const optimizedTech = optimizeTechStack(project.techStack, jdAnalysis)
        resume += `• ${optimizedTech}\n\n`
      }
    }
  }

  // EDUCATION
  if (optimizedData.education.length > 0) {
    console.log('[formatResume] Formatting', optimizedData.education.length, 'education entries')
    resume += `EDUCATION\n\n`
    
    // Remove duplicates and validate
    const seenDegrees = new Set<string>()
    const validEducation = optimizedData.education.filter(edu => {
      const key = `${edu.degree}-${edu.university}`.toLowerCase()
      if (seenDegrees.has(key)) {
        console.log('[formatResume] Skipping duplicate education:', edu.degree)
        return false
      }
      if (edu.degree === 'Degree' || edu.university === 'University') {
        console.log('[formatResume] Skipping placeholder education')
        return false
      }
      seenDegrees.add(key)
      return true
    })
    
    for (let i = 0; i < validEducation.length; i++) {
      const edu = validEducation[i]
      console.log(`[formatResume] Formatting education ${i + 1}/${validEducation.length}:`, edu.degree, 'at', edu.university)
      
      // Clean up degree and university - remove duplicates
      let degree = edu.degree.trim()
      let university = edu.university.trim()
      
      // Remove duplicate text if degree contains university name
      if (degree.toLowerCase().includes(university.toLowerCase().substring(0, 10))) {
        degree = degree.replace(new RegExp(university, 'gi'), '').trim()
      }
      
      // Format exactly like PDF: | University | Location | with dates right-aligned separately
      const dateRange = edu.years && edu.years !== 'Years' && !edu.years.match(/^years?$/i) 
        ? edu.years.replace(/\s*[-–—]\s*/, '–')
        : ''
      const location = edu.location && edu.location !== 'Location' && !edu.location.match(/^location$/i)
        ? edu.location
        : ''
      
      // Format: | University | Location |
      if (location) {
        resume += `| ${university} | ${location} |\n`
      } else {
        resume += `| ${university} |\n`
      }
      
      // Add dates on same line, right-aligned (PDF generator will handle alignment)
      if (dateRange) {
        resume += `${dateRange}\n`
      }
      
      resume += `${degree}\n\n`
    }
  } else {
    console.log('[formatResume] WARNING: No education entries to format!')
  }

  // SKILLS - Enhanced with JD keywords (prioritize JD keywords first)
  resume += `SKILLS\n\n`
  const optimizedSkills = optimizeSkills(optimizedData.skills, jdAnalysis)
  
  // Remove duplicates and prioritize JD technologies
  const prioritizeJDKeywords = (skills: string[], jdTechs: string[]): string[] => {
    const jdTechsLower = jdTechs.map(t => t.toLowerCase())
    const jdSkills: string[] = []
    const otherSkills: string[] = []
    
    skills.forEach(skill => {
      const skillLower = skill.toLowerCase()
      const isJDKeyword = jdTechsLower.some(jdTech => 
        skillLower.includes(jdTech) || jdTech.includes(skillLower) || 
        skillLower === jdTech || jdTech === skillLower
      )
      if (isJDKeyword) {
        jdSkills.push(skill)
      } else {
        otherSkills.push(skill)
      }
    })
    
    // JD keywords first, then others
    return [...Array.from(new Set(jdSkills)), ...Array.from(new Set(otherSkills))]
  }
  
  const uniqueSkills = {
    programming: prioritizeJDKeywords(optimizedSkills.programming, jdAnalysis.technologies),
    tools: prioritizeJDKeywords(optimizedSkills.tools, jdAnalysis.technologies),
    databases: prioritizeJDKeywords(optimizedSkills.databases, jdAnalysis.technologies),
    cloud: prioritizeJDKeywords(optimizedSkills.cloud, jdAnalysis.technologies),
    others: prioritizeJDKeywords(optimizedSkills.others, jdAnalysis.technologies)
  }
  
  // Add missing critical JD technologies to appropriate category
  jdAnalysis.technologies.forEach(jdTech => {
    const jdTechTitle = jdTech.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const jdTechLower = jdTech.toLowerCase()
    const allSkills = [
      ...uniqueSkills.programming,
      ...uniqueSkills.tools,
      ...uniqueSkills.databases,
      ...uniqueSkills.cloud,
      ...uniqueSkills.others
    ].map(s => s.toLowerCase())
    
    if (!allSkills.some(s => s.includes(jdTechLower) || jdTechLower.includes(s) || s === jdTechLower)) {
      // Categorize and add
      if (jdTechLower.includes('power bi') || jdTechLower.includes('tableau') || jdTechLower.includes('business intelligence') || jdTechLower.includes('qlik')) {
        if (!uniqueSkills.others.includes(jdTechTitle)) {
          uniqueSkills.others.unshift(jdTechTitle) // Add at beginning
        }
      } else if (jdTechLower.includes('sql') || jdTechLower.includes('database') || jdTechLower.includes('mysql') || jdTechLower.includes('postgresql')) {
        if (!uniqueSkills.databases.includes(jdTechTitle)) {
          uniqueSkills.databases.unshift(jdTechTitle)
        }
      } else if (jdTechLower.includes('azure') || jdTechLower.includes('aws') || jdTechLower.includes('cloud') || jdTechLower.includes('gcp')) {
        if (!uniqueSkills.cloud.includes(jdTechTitle)) {
          uniqueSkills.cloud.unshift(jdTechTitle)
        }
      } else if (jdTechLower.includes('python') || jdTechLower.includes('javascript') || jdTechLower.includes('java') || jdTechLower.includes('typescript')) {
        if (!uniqueSkills.programming.includes(jdTechTitle)) {
          uniqueSkills.programming.unshift(jdTechTitle)
        }
      } else {
        if (!uniqueSkills.others.includes(jdTechTitle)) {
          uniqueSkills.others.unshift(jdTechTitle)
        }
      }
    }
  })
  
  if (uniqueSkills.programming.length > 0) {
    resume += `• Programming: ${uniqueSkills.programming.join(', ')}\n\n`
  }
  if (uniqueSkills.tools.length > 0) {
    resume += `• Tools & Tech: ${uniqueSkills.tools.join(', ')}\n\n`
  }
  if (uniqueSkills.databases.length > 0) {
    resume += `• Databases: ${uniqueSkills.databases.join(', ')}\n\n`
  }
  if (uniqueSkills.cloud.length > 0) {
    resume += `• Cloud: ${uniqueSkills.cloud.join(', ')}\n\n`
  }
  if (uniqueSkills.others.length > 0) {
    resume += `• Others: ${uniqueSkills.others.join(', ')}\n\n`
  }

  // ACHIEVEMENTS
  if (optimizedData.achievements.length > 0) {
    resume += `ACHIEVEMENTS\n\n`
    for (const achievement of optimizedData.achievements.slice(0, 4)) {
      const optimized = optimizeText(achievement, jdAnalysis, jobDescription)
      resume += `• ${optimized}\n\n`
    }
  }

  // CERTIFICATIONS (optional)
  if (data.certifications.length > 0) {
    resume += `CERTIFICATIONS\n\n`
    for (const cert of data.certifications) {
      resume += `• ${cert}\n\n`
    }
  }

  // LINKS
  resume += `LINKS\n\n`
  if (data.contact.linkedin) {
    resume += `LinkedIn: ${data.contact.linkedin}\n\n`
  }
  if (data.contact.portfolio) {
    resume += `Portfolio: ${data.contact.portfolio}\n\n`
  }
  if (data.contact.github) {
    resume += `GitHub: ${data.contact.github}\n\n`
  }

  // Clean up the final resume - remove excessive blank lines and ensure proper spacing
  let finalResume = resume.trim()
  
  // Replace 3+ consecutive newlines with 2 newlines (proper section spacing)
  finalResume = finalResume.replace(/\n{3,}/g, '\n\n')
  
  // Ensure each section header is followed by proper spacing
  finalResume = finalResume.replace(/([A-Z][A-Z\s]+)\n\n/g, '$1\n\n')
  
  // Remove any trailing whitespace from each line
  finalResume = finalResume.split('\n').map(line => line.trimEnd()).join('\n')
  
  console.log('[formatResume] Final resume length:', finalResume.length)
  console.log('[formatResume] Final resume preview (first 500 chars):', finalResume.substring(0, 500))
  console.log('[formatResume] Resume sections count - Experience:', (finalResume.match(/EXPERIENCE/g) || []).length, 'Education:', (finalResume.match(/EDUCATION/g) || []).length)
  return finalResume
}

export interface JDAnalysis {
  technologies: string[]
  skills: string[]
  tools: string[]
  methodologies: string[]
  requirements: string[]
  roleKeywords: string[]
  actionVerbs: string[]
}

export function analyzeJobDescription(jd: string): JDAnalysis {
  const lowerJd = jd.toLowerCase()
  
  // Extract role title first (most important) - multiple patterns
  const rolePatterns = [
    /(?:seeking|looking for|hiring|position|role|job|opening|title)[^.]*?((?:power\s*bi|business\s*intelligence|data|analytics|developer|engineer|analyst|specialist|manager|architect|consultant|lead|senior|junior|full.?stack|front.?end|back.?end)[^.]*?)/i,
    /^([A-Z][^.]*?(?:power\s*bi|business\s*intelligence|developer|engineer|analyst|specialist|manager)[^.]*?)/,
    /\b((?:power\s*bi|business\s*intelligence)\s*(?:developer|analyst|specialist))\b/i,
    /(?:as\s+a|position\s+of|role\s+of)\s+([A-Z][^.]*?(?:developer|engineer|analyst|specialist)[^.]*?)/i
  ]
  
  let roleTitle = ''
  for (const pattern of rolePatterns) {
    const match = jd.match(pattern)
    if (match && match[1]) {
      roleTitle = match[1].trim()
      // Clean up common prefixes
      roleTitle = roleTitle.replace(/^(a|an|the)\s+/i, '')
      break
    }
  }
  
  // Technology keywords - expanded and prioritized
  const techPatterns = [
    // BI Tools (high priority)
    /\b(power\s*bi|powerbi|tableau|qlikview|qlik|microstrategy|looker|sisense|domo|spotfire)\b/gi,
    // Data & Analytics
    /\b(etl|elt|data\s*warehouse|data\s*warehousing|data\s*modeling|data\s*models|business\s*intelligence|bi\s*tools|data\s*visualization|dashboards|reports|dax|m\s*query|power\s*query)\b/gi,
    // Databases
    /\b(sql|mysql|postgresql|postgres|mongodb|redis|oracle|dynamodb|cassandra|elasticsearch|nosql|azure\s*sql|sql\s*server|sql\s*server\s*analysis\s*services)\b/gi,
    // Cloud & Azure
    /\b(aws|azure|gcp|google\s*cloud|azure\s*sql\s*database|azure\s*data\s*factory|azure\s*analysis\s*services|azure\s*data\s*lake|azure\s*synapse|azure\s*databricks)\b/gi,
    // Programming
    /\b(python|javascript|typescript|java|c\+\+|c#|react|angular|vue|node\.?js|express|django|flask|spring|\.net|php|ruby|go|rust|swift|kotlin|scala|r|matlab)\b/gi,
    // Frontend
    /\b(html|css|sass|less|bootstrap|tailwind|material|ui|ux)\b/gi,
    // DevOps
    /\b(docker|kubernetes|jenkins|ci\/cd|terraform|ansible|git|github|gitlab)\b/gi,
    // APIs
    /\b(rest|graphql|api|microservices|serverless|lambda|s3|ec2|rds)\b/gi,
    // AI/ML
    /\b(machine\s*learning|ml|ai|deep\s*learning|nlp|computer\s*vision|tensorflow|pytorch|scikit)\b/gi,
    // Blockchain
    /\b(blockchain|solidity|smart\s*contracts|ethereum|web3|dlt|distributed\s*ledger)\b/gi
  ]
  
  const technologies: string[] = []
  techPatterns.forEach(pattern => {
    const matches = jd.match(pattern)
    if (matches) {
      technologies.push(...matches.map(m => m.trim()))
    }
  })
  
  // Deduplicate and normalize technologies (keep original case for important terms)
  const normalizedTechs = Array.from(new Set(technologies.map(t => {
    const lower = t.toLowerCase()
    // Preserve important capitalization (Power BI, SQL, etc.)
    if (lower.includes('power bi') || lower === 'power bi') return 'Power BI'
    if (lower.includes('business intelligence') || lower === 'business intelligence') return 'Business Intelligence'
    if (lower === 'sql' || lower.includes('sql')) return 'SQL'
    if (lower.includes('azure')) return t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    // Default: capitalize first letter of each word
    return t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  })))
  
  console.log('[analyzeJobDescription] Extracted role title:', roleTitle)
  console.log('[analyzeJobDescription] Extracted technologies:', normalizedTechs.slice(0, 10))
  
  // Skills and methodologies
  const skillPatterns = [
    /\b(agile|scrum|kanban|waterfall|tdd|bdd|devops|git|github|gitlab|bitbucket|jira|confluence)\b/gi,
    /\b(object-oriented|oop|design patterns|clean code|refactoring|code review)\b/gi,
    /\b(testing|unit testing|integration testing|qa|quality assurance|automation)\b/gi,
    /\b(project management|leadership|mentoring|collaboration|communication)\b/gi
  ]
  
  const skills: string[] = []
  skillPatterns.forEach(pattern => {
    const matches = jd.match(pattern)
    if (matches) {
      skills.push(...matches.map(m => m.trim()))
    }
  })
  
  // Extract role-specific keywords
  const roleKeywords: string[] = []
  const rolePattern = /\b(developer|engineer|architect|specialist|analyst|manager|lead|senior|junior|full.?stack|front.?end|back.?end|fullstack)\b/gi
  const roleMatches = jd.match(rolePattern)
  if (roleMatches) {
    roleKeywords.push(...roleMatches.map(m => m.trim()))
  }
  
  // Action verbs from JD
  const actionVerbs = [
    'develop', 'design', 'implement', 'build', 'create', 'optimize', 'improve',
    'manage', 'lead', 'collaborate', 'deliver', 'deploy', 'maintain', 'enhance',
    'analyze', 'solve', 'integrate', 'automate', 'scale', 'refactor', 'test'
  ].filter(verb => lowerJd.includes(verb))
  
  // Requirements (sentences with "must", "required", "should")
  const requirements: string[] = []
  const reqPattern = /(?:must|required|should|need|essential).*?[.!?]/gi
  const reqMatches = jd.match(reqPattern)
  if (reqMatches) {
    requirements.push(...reqMatches.map(m => m.trim()).slice(0, 10))
  }
  
  return {
    technologies: normalizedTechs, // Keep original case for better matching
    skills: Array.from(new Set(skills.map(s => s.toLowerCase()))),
    tools: [],
    methodologies: Array.from(new Set(skills.filter(s => ['agile', 'scrum', 'kanban', 'tdd', 'bdd'].includes(s.toLowerCase())))),
    requirements,
    roleKeywords: Array.from(new Set([roleTitle.toLowerCase(), ...roleKeywords.map(r => r.toLowerCase())])),
    actionVerbs: Array.from(new Set(actionVerbs))
  }
}

export function optimizeResumeData(data: ResumeData, jdAnalysis: JDAnalysis, jobDescription: string): ResumeData {
  // Enhance skills with JD technologies
  const enhancedSkills = { ...data.skills }
  
  // Add missing JD technologies to appropriate categories
  jdAnalysis.technologies.forEach(tech => {
    const techLower = tech.toLowerCase()
    const techTitle = tech.charAt(0).toUpperCase() + tech.slice(1)
    
    // Check if already exists
    const allSkills = [
      ...enhancedSkills.programming,
      ...enhancedSkills.tools,
      ...enhancedSkills.databases,
      ...enhancedSkills.cloud,
      ...enhancedSkills.others
    ].map(s => s.toLowerCase())
    
    if (!allSkills.includes(techLower)) {
      // Categorize and add
      if (techLower.match(/\b(python|javascript|typescript|java|c\+\+|c#|react|angular|vue|node|go|rust|swift|kotlin|php|ruby)\b/)) {
        if (!enhancedSkills.programming.includes(techTitle)) {
          enhancedSkills.programming.push(techTitle)
        }
      } else if (techLower.match(/\b(aws|azure|gcp|docker|kubernetes|jenkins|terraform)\b/)) {
        if (!enhancedSkills.cloud.includes(techTitle)) {
          enhancedSkills.cloud.push(techTitle)
        }
      } else if (techLower.match(/\b(sql|mysql|postgresql|mongodb|redis|oracle|dynamodb)\b/)) {
        if (!enhancedSkills.databases.includes(techTitle)) {
          enhancedSkills.databases.push(techTitle)
        }
      } else {
        if (!enhancedSkills.others.includes(techTitle)) {
          enhancedSkills.others.push(techTitle)
        }
      }
    }
  })
  
  return {
    ...data,
    skills: enhancedSkills
  }
}

function optimizeSummary(summary: string, jdAnalysis: JDAnalysis, jobDescription: string): string {
  const jdLower = jobDescription.toLowerCase()
  const summaryLower = summary.toLowerCase()
  
  // Extract the EXACT role title from JD (most important)
  const rolePatterns = [
    /(?:seeking|looking for|hiring|position|role|job|opening|title)[^.]*?((?:power\s*bi|business\s*intelligence|data|analytics|developer|engineer|analyst|specialist|manager|architect|consultant|lead|senior|junior|full.?stack|front.?end|back.?end)[^.]*?)/i,
    /^([A-Z][^.]*?(?:developer|engineer|analyst|specialist|manager)[^.]*?)/,
    /\b((?:power\s*bi|business\s*intelligence)\s*(?:developer|analyst|specialist))\b/i
  ]
  
  let exactRole = ''
  for (const pattern of rolePatterns) {
    const match = jobDescription.match(pattern)
    if (match && match[1]) {
      exactRole = match[1].trim()
      break
    }
  }
  
  // If no exact role found, use role keywords
  if (!exactRole && jdAnalysis.roleKeywords.length > 0) {
    exactRole = jdAnalysis.roleKeywords[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  
  // Extract key JD phrases and requirements
  const jdKeyPhrases: string[] = []
  
  // Extract experience requirement
  const expMatch = jdLower.match(/(\d+)\+?\s*(years?|yrs?)\s*(of\s*)?(experience|exp)/)
  if (expMatch) {
    jdKeyPhrases.push(`${expMatch[1]}+ years of experience`)
  }
  
  // Extract key responsibilities/requirements from JD
  const responsibilityPatterns = [
    /\b(design(?:ing|ed)?|develop(?:ing|ed)?|maintain(?:ing|ed)?|build(?:ing|ed)?|create(?:ing|ed)?|implement(?:ing|ed)?)\s+(?:business\s*intelligence|power\s*bi|dashboards?|reports?|data\s*models?|data\s*visualizations?)/gi,
    /\b(collaborate|work\s+with|stakeholders|requirements|data\s*driven|decision.?making)/gi,
    /\b(data\s*modeling|data\s*models|datasets|etl|data\s*governance|data\s*security|data\s*accuracy|data\s*integrity)/gi
  ]
  
  responsibilityPatterns.forEach(pattern => {
    const matches = jobDescription.match(pattern)
    if (matches) {
      jdKeyPhrases.push(...matches.slice(0, 3))
    }
  })
  
  // Get top JD technologies (prioritize BI tools, then others)
  const biTools = jdAnalysis.technologies.filter(t => 
    t.toLowerCase().includes('power') || 
    t.toLowerCase().includes('bi') || 
    t.toLowerCase().includes('tableau') ||
    t.toLowerCase().includes('business intelligence')
  )
  const otherTechs = jdAnalysis.technologies.filter(t => 
    !t.toLowerCase().includes('power') && 
    !t.toLowerCase().includes('bi') && 
    !t.toLowerCase().includes('tableau')
  )
  const topJDTechnologies = [...biTools, ...otherTechs].slice(0, 5)
  
  // Build optimized summary - start with role if found
  let optimized = ''
  
  if (exactRole) {
    // Start summary with exact JD role
    optimized = `${exactRole}`
    if (expMatch) {
      optimized += ` with ${expMatch[1]}+ years of experience`
    } else if (summaryLower.match(/\d+\+?\s*years/)) {
      const summaryExp = summaryLower.match(/(\d+)\+?\s*years/)
      if (summaryExp) {
        optimized += ` with ${summaryExp[1]}+ years of experience`
      }
    }
    optimized += ' in '
  } else {
    // Use original summary start but replace role
    const originalStart = summary.split('.').slice(0, 1).join('.')
    optimized = originalStart.replace(/\b(software\s*engineer|developer|professional|engineer)\b/gi, exactRole || 'Professional')
  }
  
  // Add JD key technologies and skills
  const techList: string[] = []
  topJDTechnologies.forEach(tech => {
    const techTitle = tech.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    if (!techList.includes(techTitle)) {
      techList.push(techTitle)
    }
  })
  
  if (techList.length > 0) {
    optimized += `specialized in ${techList.slice(0, 3).join(', ')}`
    if (techList.length > 3) {
      optimized += `, and ${techList.slice(3, 5).join(', ')}`
    }
    optimized += '. '
  }
  
  // Add key responsibilities from JD
  if (jdKeyPhrases.length > 0) {
    const keyPhrase = jdKeyPhrases[0]
    const capitalized = keyPhrase.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    optimized += `Experienced in ${capitalized.toLowerCase()}. `
  }
  
  // Add remaining summary content with JD keyword replacement
  const remainingSummary = summary.split('.').slice(1).join('.').trim()
  if (remainingSummary.length > 0) {
    let remaining = remainingSummary
    
    // Replace ALL technologies with JD terminology
    jdAnalysis.technologies.forEach(jdTech => {
      const jdTechLower = jdTech.toLowerCase()
      const jdTechTitle = jdTech.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      
      // Replace if mentioned (case insensitive)
      remaining = remaining.replace(new RegExp(jdTechLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), jdTechTitle)
      
      // Replace common variations
      const variations: { [key: string]: string[] } = {
        'power bi': ['powerbi', 'power bi', 'powerbi developer'],
        'sql': ['sql server', 'mysql', 'postgresql'],
        'business intelligence': ['bi', 'business intelligence tools'],
        'data modeling': ['data models', 'modeling'],
        'data visualization': ['visualizations', 'dashboards', 'reports']
      }
      
      Object.entries(variations).forEach(([standard, vars]) => {
        if (jdTechLower.includes(standard)) {
          vars.forEach(v => {
            remaining = remaining.replace(new RegExp(v, 'gi'), jdTechTitle)
          })
        }
      })
    })
    
    optimized += remaining.substring(0, 200)
  }
  
  // Ensure summary mentions key JD terms
  const mustHaveTerms = ['power bi', 'business intelligence', 'data modeling', 'sql', 'dashboards', 'reports']
  mustHaveTerms.forEach(term => {
    if (jdLower.includes(term) && !optimized.toLowerCase().includes(term)) {
      const termTitle = term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      if (optimized.length < 450) {
        optimized += ` Proficient in ${termTitle}.`
      }
    }
  })
  
  // Clean up and limit length
  optimized = optimized
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim()
  
  if (optimized.length > 500) {
    optimized = optimized.substring(0, 497) + '...'
  }
  
  // Ensure it ends properly
  if (!optimized.endsWith('.') && !optimized.endsWith('...')) {
    optimized += '.'
  }
  
  return optimized || summary
}

function optimizeJobTitle(title: string, jdAnalysis: JDAnalysis): string {
  if (jdAnalysis.roleKeywords.length === 0) return title
  
  const titleLower = title.toLowerCase()
  const jdRole = jdAnalysis.roleKeywords[0]
  
  // If title doesn't match JD role, try to enhance it
  if (!titleLower.includes(jdRole)) {
    // Keep original but ensure it's professional
    return title
  }
  
  return title
}

function optimizeExperienceBullet(bullet: string, jdAnalysis: JDAnalysis, jobDescription: string): string {
  let optimized = bullet
  const bulletLower = bullet.toLowerCase()
  const jdLower = jobDescription.toLowerCase()
  
  // Comprehensive tech replacement map - expanded for BI tools
  const techReplacementMap: { [key: string]: string[] } = {
    'power bi': ['powerbi', 'power bi', 'powerbi developer', 'bi tools', 'business intelligence'],
    'tableau': ['tableau desktop', 'tableau server', 'tableau prep'],
    'business intelligence': ['bi', 'bi tools', 'business intelligence tools', 'bi solutions'],
    'data modeling': ['data models', 'modeling', 'data model design', 'database modeling'],
    'data visualization': ['visualizations', 'dashboards', 'reports', 'charts', 'analytics dashboards'],
    'dashboards': ['dashboard', 'interactive dashboards', 'executive dashboards'],
    'reports': ['reporting', 'analytical reports', 'business reports'],
    'sql': ['sql server', 'mysql', 'postgresql', 'tsql', 'pl/sql'],
    'etl': ['extract transform load', 'data pipeline', 'data integration'],
    'azure': ['microsoft azure', 'azure cloud', 'azure services'],
    'azure sql database': ['azure sql', 'sql azure'],
    'azure data factory': ['adf', 'data factory'],
    'azure analysis services': ['aas', 'analysis services'],
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts', 'tsx'],
    'react': ['reactjs', 'react.js', 'reactjs'],
    'node.js': ['nodejs', 'node', 'node js'],
    'python': ['py', 'python3'],
    'postgresql': ['postgres', 'postgres db'],
    'mongodb': ['mongo', 'mongo db'],
    'aws': ['amazon web services', 'amazon aws'],
    'kubernetes': ['k8s', 'kube'],
    'docker': ['docker container', 'containerization'],
    'rest api': ['rest', 'restful api', 'restful'],
    'graphql': ['gql'],
    'microservices': ['micro service', 'micro-service'],
    'machine learning': ['ml', 'machine-learning'],
    'artificial intelligence': ['ai', 'artificial-intelligence']
  }
  
  // Replace technologies with JD terminology (exact matches first) - AGGRESSIVE matching
  jdAnalysis.technologies.forEach(jdTech => {
    const jdTechLower = jdTech.toLowerCase()
    const jdTechTitle = jdTech.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    
    // Direct replacement if JD tech is in bullet (case insensitive)
    if (bulletLower.includes(jdTechLower)) {
      optimized = optimized.replace(new RegExp(jdTechLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), jdTechTitle)
    }
    
    // Replace synonyms and variations
    Object.entries(techReplacementMap).forEach(([standard, synonyms]) => {
      if (jdTechLower === standard.toLowerCase() || jdTechLower.includes(standard.toLowerCase()) || standard.toLowerCase().includes(jdTechLower)) {
        synonyms.forEach(syn => {
          const synRegex = new RegExp(`\\b${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
          if (bulletLower.match(synRegex)) {
            optimized = optimized.replace(synRegex, jdTechTitle)
          }
        })
      }
    })
  })
  
  // Add JD keywords if bullet is related but doesn't mention them
  const relatedConcepts: { [key: string]: string[] } = {
    'power bi': ['dashboard', 'report', 'data visualization', 'analytics', 'business intelligence', 'data model'],
    'data modeling': ['database', 'schema', 'table', 'query', 'sql'],
    'sql': ['database', 'query', 'data', 'table', 'schema'],
    'business intelligence': ['analytics', 'reporting', 'dashboard', 'data', 'insights']
  }
  
  jdAnalysis.technologies.forEach(jdTech => {
    const jdTechLower = jdTech.toLowerCase()
    const jdTechTitle = jdTech.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    
    if (relatedConcepts[jdTechLower]) {
      const hasRelated = relatedConcepts[jdTechLower].some(concept => bulletLower.includes(concept))
      const hasJDKeyword = bulletLower.includes(jdTechLower)
      
      if (hasRelated && !hasJDKeyword && optimized.length < 200) {
        // Add JD keyword naturally
        optimized = optimized.replace(/([.!?]|$)/, ` using ${jdTechTitle}$1`)
      }
    }
  })
  
  // Replace similar skills/concepts with JD terminology
  const skillReplacementMap: { [key: string]: string[] } = {
    'agile': ['scrum', 'sprint', 'iterative'],
    'api': ['endpoint', 'service'],
    'database': ['db', 'data store'],
    'cloud': ['aws', 'azure', 'gcp'],
    'frontend': ['front-end', 'client-side', 'ui'],
    'backend': ['back-end', 'server-side', 'server'],
    'full-stack': ['fullstack', 'full stack', 'end-to-end']
  }
  
  jdAnalysis.skills.forEach(jdSkill => {
    const jdSkillLower = jdSkill.toLowerCase()
    const jdSkillTitle = jdSkill.charAt(0).toUpperCase() + jdSkill.slice(1)
    
    Object.entries(skillReplacementMap).forEach(([standard, synonyms]) => {
      if (jdSkillLower === standard.toLowerCase()) {
        synonyms.forEach(syn => {
          if (bulletLower.includes(syn) && !bulletLower.includes(jdSkillLower)) {
            optimized = optimized.replace(new RegExp(syn, 'gi'), jdSkillTitle)
          }
        })
      }
    })
  })
  
  // Use stronger action verbs from JD
  if (jdAnalysis.actionVerbs.length > 0) {
    const jdVerb = jdAnalysis.actionVerbs[0]
    const weakVerbs: { [key: string]: string } = {
      'made': jdVerb,
      'did': jdVerb,
      'worked on': jdVerb,
      'helped': jdVerb,
      'assisted': jdVerb,
      'participated': jdVerb
    }
    
    Object.entries(weakVerbs).forEach(([weak, strong]) => {
      if (bulletLower.includes(weak) && bulletLower.length < 120) {
        optimized = optimized.replace(new RegExp(`\\b${weak}\\b`, 'gi'), strong)
      }
    })
  }
  
  // Add JD technologies if bullet is technical but doesn't mention them
  if (bulletLower.match(/\b(develop|build|create|design|implement|integrate|optimize)\b/) && 
      jdAnalysis.technologies.length > 0) {
    const hasJdTech = jdAnalysis.technologies.some(tech => bulletLower.includes(tech.toLowerCase()))
    if (!hasJdTech) {
      // Find most relevant JD tech based on context
      const relevantTech = jdAnalysis.technologies.find(tech => {
        const techLower = tech.toLowerCase()
        if (bulletLower.match(/\b(api|service|endpoint)\b/) && (techLower.includes('rest') || techLower.includes('graphql'))) {
          return true
        }
        if (bulletLower.match(/\b(database|db|data)\b/) && (techLower.includes('sql') || techLower.includes('mongo') || techLower.includes('redis'))) {
          return true
        }
        if (bulletLower.match(/\b(cloud|deploy|infrastructure)\b/) && (techLower.includes('aws') || techLower.includes('azure') || techLower.includes('docker'))) {
          return true
        }
        return false
      })
      
      if (relevantTech && optimized.length < 180) {
        const techTitle = relevantTech.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        optimized += ` using ${techTitle}`
      }
    }
  }
  
  // Ensure JD keywords are present in key bullets
  if (jdLower.match(/\b(experience|proven|demonstrated|strong)\b/)) {
    // Add quantifiable metrics if missing
    if (!bulletLower.match(/\d+%|\d+\+|\d+\s*(years|months|users|customers|projects)/)) {
      // Don't add fake metrics, just ensure JD keywords are present
    }
  }
  
  return optimized
}

function optimizeText(text: string, jdAnalysis: JDAnalysis, jobDescription: string): string {
  let optimized = text
  const textLower = text.toLowerCase()
  
  // Replace technologies with JD terminology
  jdAnalysis.technologies.forEach(jdTech => {
    const jdTechLower = jdTech.toLowerCase()
    const jdTechTitle = jdTech.charAt(0).toUpperCase() + jdTech.slice(1)
    
    if (textLower.includes(jdTechLower)) {
      optimized = optimized.replace(new RegExp(jdTechLower, 'gi'), jdTechTitle)
    }
  })
  
  // Limit length
  if (optimized.length > 500) {
    optimized = optimized.substring(0, 497) + '...'
  }
  
  return optimized
}

function optimizeTechStack(techStack: string, jdAnalysis: JDAnalysis): string {
  let optimized = techStack
  
  // Add missing JD technologies to tech stack
  const stackLower = techStack.toLowerCase()
  const missingTechs = jdAnalysis.technologies.filter(tech => !stackLower.includes(tech))
  
  if (missingTechs.length > 0 && missingTechs.length <= 2) {
    const techsToAdd = missingTechs.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')
    if (optimized.length < 200) {
      optimized += `, ${techsToAdd}`
    }
  }
  
  return optimized
}

function optimizeSkills(skills: ResumeData['skills'], jdAnalysis: JDAnalysis): ResumeData['skills'] {
  // Skills are already optimized in optimizeResumeData
  // Just ensure proper ordering - JD technologies first
  const optimized = { ...skills }
  
  // Sort programming skills to put JD technologies first
  optimized.programming.sort((a, b) => {
    const aInJd = jdAnalysis.technologies.some(t => a.toLowerCase().includes(t))
    const bInJd = jdAnalysis.technologies.some(t => b.toLowerCase().includes(t))
    if (aInJd && !bInJd) return -1
    if (!aInJd && bInJd) return 1
    return 0
  })
  
  return optimized
}
