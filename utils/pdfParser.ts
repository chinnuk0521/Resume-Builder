/**
 * Robust PDF Resume Parser
 * Extracts structured data from PDF text with comprehensive error handling
 */

export interface ParsedResumeData {
  // Personal Information
  firstName: string
  lastName: string
  middleName: string
  email: string
  phone: string
  linkedin: string
  github: string
  portfolio: string
  
  // Professional Summary
  professionalSummary: string
  
  // Experience
  experiences: Array<{
    job_title: string
    company: string
    start_date: string
    end_date: string
    bullets: string[]
  }>
  
  // Education
  education: Array<{
    course: string
    school: string
    location: string
    start_year: string
    end_year: string
  }>
  
  // Skills
  skills: Array<{
    category: string
    items: string[]
  }>
  
  // Projects
  projects: Array<{
    title: string
    description: string
    contribution: string
    tech_stack: string
  }>
  
  // Achievements
  achievements: string[]
  
  // Certifications
  certifications: string[]
}

const MAX_TEXT_LENGTH = 50000 // 50KB
const MAX_LINES = 1000

/**
 * Main parsing function - extracts structured data from PDF text
 */
export function parsePDFText(text: string): ParsedResumeData {
  // Input validation
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input')
  }
  
  // Sanitize and limit text size
  const safeText = text.length > MAX_TEXT_LENGTH 
    ? text.substring(0, MAX_TEXT_LENGTH) 
    : text.trim()
  
  if (safeText.length < 50) {
    throw new Error('Insufficient text extracted from PDF')
  }
  
  // Split into lines and filter
  const lines = safeText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, MAX_LINES)
  
  const lowerText = safeText.toLowerCase()
  
  // Extract all components
  const name = extractName(lines)
  const contact = extractContact(safeText, lines)
  const summary = extractSummary(safeText, lowerText, lines)
  const experiences = extractExperiences(safeText, lowerText, lines)
  const education = extractEducation(safeText, lowerText, lines)
  const skills = extractSkills(safeText, lowerText, lines)
  const projects = extractProjects(safeText, lowerText, lines)
  const achievements = extractAchievements(safeText, lowerText, lines)
  const certifications = extractCertifications(safeText, lowerText, lines)
  
  // Split name into components
  const nameParts = splitName(name)
  
  return {
    firstName: nameParts.first,
    lastName: nameParts.last,
    middleName: nameParts.middle,
    email: contact.email || '',
    phone: contact.phone || '',
    linkedin: contact.linkedin || '',
    github: contact.github || '',
    portfolio: contact.portfolio || '',
    professionalSummary: summary,
    experiences: experiences.slice(0, 10), // Limit to 10
    education: education.slice(0, 5), // Limit to 5
    skills,
    projects: projects.slice(0, 5), // Limit to 5
    achievements: achievements.slice(0, 10), // Limit to 10
    certifications: certifications.slice(0, 5) // Limit to 5
  }
}

/**
 * Extract name from resume (usually first substantial line)
 */
function extractName(lines: string[]): string {
  // Check first 15 lines for name
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i]
    
    // Skip contact info
    if (line.match(/@|phone|email|linkedin|github|portfolio|resume|www\./i)) {
      continue
    }
    
    // Skip section headers
    if (line.match(/^(professional|summary|experience|education|skills|projects|achievements|certifications|objective)/i)) {
      continue
    }
    
    // Name patterns: 2-5 words, title case or all caps
    // "John Doe", "JOHN DOE", "Mary-Jane Smith", "Dr. John Doe", "John M. Doe"
    if (line.match(/^[A-Z][a-z]+([\s\-\.][A-Z][a-z]*){1,4}$/) || 
        (line.match(/^[A-Z\s\.\-]{2,50}$/) && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 5)) {
      return line.trim()
    }
    
    // Name with middle initial
    if (line.match(/^[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+/)) {
      return line.trim()
    }
  }
  
  return ''
}

/**
 * Split full name into first, middle, last
 */
function splitName(fullName: string): { first: string; middle: string; last: string } {
  if (!fullName) {
    return { first: '', middle: '', last: '' }
  }
  
  const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0)
  
  if (parts.length === 0) {
    return { first: '', middle: '', last: '' }
  } else if (parts.length === 1) {
    return { first: parts[0], middle: '', last: '' }
  } else if (parts.length === 2) {
    return { first: parts[0], middle: '', last: parts[1] }
  } else {
    // 3+ parts: first, middle(s), last
    return {
      first: parts[0],
      middle: parts.slice(1, -1).join(' '),
      last: parts[parts.length - 1]
    }
  }
}

/**
 * Extract contact information
 */
function extractContact(text: string, lines: string[]): {
  email: string
  phone: string
  linkedin: string
  github: string
  portfolio: string
} {
  const contact = {
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    portfolio: ''
  }
  
  // Extract email
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)
  if (emailMatch) {
    contact.email = emailMatch[0].toLowerCase()
  }
  
  // Extract phone (multiple formats)
  const phonePatterns = [
    /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // US format
    /\+\d{10,15}/, // International
    /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/, // (123) 456-7890
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/ // 123-456-7890
  ]
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern)
    if (match) {
      contact.phone = match[0].trim()
      break
    }
  }
  
  // Extract LinkedIn
  const linkedinPatterns = [
    /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9-]+)/i,
    /linkedin[:\s]+([^\s\n]+)/i
  ]
  
  for (const pattern of linkedinPatterns) {
    const match = text.match(pattern)
    if (match) {
      const username = match[1] || match[0]
      contact.linkedin = username.startsWith('http') ? username : `linkedin.com/in/${username}`
      break
    }
  }
  
  // Extract GitHub
  const githubMatch = text.match(/(?:github\.com\/)([a-zA-Z0-9-]+)/i)
  if (githubMatch) {
    contact.github = `github.com/${githubMatch[1]}`
  }
  
  // Extract Portfolio/Website
  const portfolioPatterns = [
    /(?:portfolio[:\s]+|website[:\s]+|personal[:\s]+website[:\s]+)([^\s\n]+)/i,
    /(?:www\.|https?:\/\/)([^\s\n]+\.(?:com|net|org|io|dev|me))/i
  ]
  
  for (const pattern of portfolioPatterns) {
    const match = text.match(pattern)
    if (match) {
      contact.portfolio = match[1] || match[0]
      if (!contact.portfolio.startsWith('http')) {
        contact.portfolio = `https://${contact.portfolio}`
      }
      break
    }
  }
  
  return contact
}

/**
 * Extract professional summary
 */
function extractSummary(text: string, lowerText: string, lines: string[]): string {
  const summaryKeywords = [
    'professional summary',
    'summary',
    'objective',
    'profile',
    'about me',
    'career objective',
    'executive summary'
  ]
  
  for (const keyword of summaryKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      const section = text.substring(index + keyword.length, index + 1000)
      const summaryLines = section
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          return line.length > 10 && 
                 !line.match(/^(experience|education|skills|projects|achievements|certifications|work)/i) &&
                 !line.match(/^[•\-\*]/) // Not a bullet
        })
        .slice(0, 5)
        .join(' ')
      
      if (summaryLines.length > 50) {
        return summaryLines.substring(0, 800).trim()
      }
    }
  }
  
  // Fallback: use first substantial paragraph
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i]
    if (line.length > 100 && 
        !line.match(/^(email|phone|linkedin|github|portfolio|www\.)/i) &&
        !line.match(/^[A-Z\s]{2,40}$/) && // Not all caps (likely name)
        !line.match(/^\d{4}/)) { // Not a date
      return line.substring(0, 800).trim()
    }
  }
  
  return ''
}

/**
 * Extract work experience
 */
function extractExperiences(text: string, lowerText: string, lines: string[]): ParsedResumeData['experiences'] {
  const experiences: ParsedResumeData['experiences'] = []
  const expKeywords = [
    'experience',
    'work experience',
    'employment',
    'professional experience',
    'work history',
    'career history'
  ]
  
  let expStartIndex = -1
  for (const keyword of expKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      expStartIndex = index + keyword.length
      break
    }
  }
  
  if (expStartIndex === -1) {
    // Try pattern-based extraction
    return findExperiencesByPattern(text, lines)
  }
  
  const expSection = text.substring(expStartIndex)
  const expBlocks = expSection.split(/\n\s*\n/).filter(block => block.trim().length > 20)
  
  for (let i = 0; i < Math.min(10, expBlocks.length); i++) {
    const exp = parseExperienceBlock(expBlocks[i])
    if (exp) {
      experiences.push(exp)
    }
  }
  
  if (experiences.length === 0) {
    return findExperiencesByPattern(text, lines)
  }
  
  return experiences
}

/**
 * Parse a single experience block
 */
function parseExperienceBlock(block: string): ParsedResumeData['experiences'][0] | null {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return null
  
  // Skip if looks like education
  const educationKeywords = ['college', 'university', 'degree', 'bachelor', 'master', 'phd', 'diploma', '%', 'gpa', 'cgpa']
  const blockLower = block.toLowerCase()
  if (educationKeywords.some(k => blockLower.includes(k)) && 
      !blockLower.match(/\b(developer|engineer|analyst|manager|specialist|consultant|associate|lead|senior|junior)\b/i)) {
    return null
  }
  
  let jobTitle = ''
  let company = ''
  let startDate = ''
  let endDate = ''
  const bullets: string[] = []
  
  // Extract dates (multiple formats)
  const datePatterns = [
    /(\w+\s+\d{4}|\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\d{4}|present|current)/i,
    /(\d{1,2}\/\d{4}|\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|\d{4}|present|current)/i,
    /(\d{4})\s*[-–—]\s*(\d{4}|present|current)/i,
    /(\w+\s+\d{4})\s*to\s*(\w+\s+\d{4}|\d{4}|present|current)/i,
    /from\s+(\w+\s+\d{4}|\d{4})\s*to\s*(\w+\s+\d{4}|\d{4}|present|current)/i
  ]
  
  for (const pattern of datePatterns) {
    const match = block.match(pattern)
    if (match) {
      startDate = normalizeDate(match[1].trim())
      endDate = normalizeDate(match[2].trim())
      if (startDate && endDate) {
        break
      }
    }
  }
  
  // If no date pattern, try to find years
  if (!startDate) {
    const years = block.match(/\b(19|20)\d{2}\b/g) // Only years 1900-2099
    if (years && years.length >= 2) {
      const sortedYears = years.map(y => parseInt(y)).sort((a, b) => a - b)
      startDate = sortedYears[0].toString()
      endDate = sortedYears[sortedYears.length - 1].toString()
    } else if (years && years.length === 1) {
      startDate = years[0]
      endDate = 'Present'
    }
  }
  
  // Validate dates (start should be before end)
  if (startDate && endDate && endDate.toLowerCase() !== 'present' && endDate.toLowerCase() !== 'current') {
    const startYear = parseInt(startDate.match(/\d{4}/)?.[0] || '0')
    const endYear = parseInt(endDate.match(/\d{4}/)?.[0] || '0')
    if (startYear > endYear && endYear > 0) {
      // Swap if dates are reversed
      const temp = startDate
      startDate = endDate
      endDate = temp
    }
  }
  
  // Extract job title and company (usually first 2-3 lines)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i]
    
    // Skip date lines
    if (line.match(/\d{4}[-–—]\d{4}|\d{4}[-–—]present/i)) {
      continue
    }
    
    // Skip percentage/GPA
    if (line.match(/\d+%|gpa|cgpa/i)) {
      continue
    }
    
    if (line.length > 5) {
      if (!jobTitle) {
        // Check for job title keywords
        if (line.match(/\b(developer|engineer|analyst|manager|specialist|consultant|associate|lead|senior|junior|intern|architect|designer|programmer|developer|scientist|researcher|coordinator|director|executive|officer)\b/i)) {
          // Remove date if present in same line
          jobTitle = line.replace(/\d{4}[-–—].*$/, '').trim()
        } else if (!company && !line.match(/^(email|phone|linkedin|github)/i)) {
          company = line.replace(/\d{4}[-–—].*$/, '').trim()
        }
      } else if (!company && !line.match(/^(email|phone|linkedin|github)/i)) {
        company = line.replace(/\d{4}[-–—].*$/, '').trim()
      }
    }
  }
  
  // Extract bullets
  for (const line of lines) {
    if (line.match(/^[•\-\*\d+\.]\s+/) && line.length > 10) {
      const bullet = line.replace(/^[•\-\*\d+\.]\s+/, '').trim()
      if (bullet.length > 5) {
        bullets.push(bullet)
      }
    }
  }
  
  if (jobTitle || company) {
    return {
      job_title: jobTitle || 'Position',
      company: company || 'Company',
      start_date: startDate || '',
      end_date: endDate || 'Present',
      bullets: bullets.length > 0 ? bullets : []
    }
  }
  
  return null
}

/**
 * Find experiences by pattern matching
 */
function findExperiencesByPattern(text: string, lines: string[]): ParsedResumeData['experiences'] {
  const experiences: ParsedResumeData['experiences'] = []
  const jobTitlePattern = /\b(software|developer|engineer|analyst|manager|specialist|consultant|associate|lead|senior|junior|full.?stack|front.?end|back.?end|architect|designer)\b/i
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(jobTitlePattern) && lines[i].length < 100) {
      const lineIndex = text.indexOf(lines[i])
      if (lineIndex !== -1) {
        const exp = parseExperienceBlock(text.substring(lineIndex, lineIndex + 800))
        if (exp) {
          experiences.push(exp)
        }
      }
    }
  }
  
  return experiences.slice(0, 10)
}

/**
 * Extract education
 */
function extractEducation(text: string, lowerText: string, lines: string[]): ParsedResumeData['education'] {
  const education: ParsedResumeData['education'] = []
  const eduKeywords = ['education', 'academic', 'qualification', 'academic background']
  
  let eduStartIndex = -1
  for (const keyword of eduKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      eduStartIndex = index + keyword.length
      break
    }
  }
  
  if (eduStartIndex === -1) {
    return findEducationByPattern(text, lines)
  }
  
  const eduSection = text.substring(eduStartIndex)
  const eduBlocks = eduSection.split(/\n\s*\n/).filter(block => block.trim().length > 10)
  
  for (let i = 0; i < Math.min(5, eduBlocks.length); i++) {
    const edu = parseEducationBlock(eduBlocks[i])
    if (edu) {
      education.push(edu)
    }
  }
  
  if (education.length === 0) {
    return findEducationByPattern(text, lines)
  }
  
  return education
}

/**
 * Parse a single education block
 */
function parseEducationBlock(block: string): ParsedResumeData['education'][0] | null {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 1) return null
  
  let course = ''
  let school = ''
  let location = ''
  let startYear = ''
  let endYear = ''
  
  // Look for degree keywords
  const degreeKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'diploma', 'certificate', 'degree', 'b\.tech', 'm\.tech', 'b\.e', 'm\.e', 'b\.sc', 'm\.sc']
  
  // Extract dates
  const datePatterns = [
    /(\d{4})\s*[-–—]\s*(\d{4}|present|current)/i,
    /(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\d{4}|present|current)/i,
    /from\s+(\d{4})\s*to\s*(\d{4}|present|current)/i
  ]
  
  for (const pattern of datePatterns) {
    const match = block.match(pattern)
    if (match) {
      startYear = normalizeDate(match[1])
      endYear = normalizeDate(match[2])
      if (startYear && endYear) {
        break
      }
    }
  }
  
  // If no date pattern, try to find years
  if (!startYear) {
    const years = block.match(/\b(19|20)\d{2}\b/g) // Only years 1900-2099
    if (years && years.length >= 1) {
      const sortedYears = years.map(y => parseInt(y)).sort((a, b) => a - b)
      startYear = sortedYears[0].toString()
      endYear = years.length > 1 ? sortedYears[sortedYears.length - 1].toString() : ''
    }
  }
  
  // Find degree and school
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i]
    
    // Skip date lines
    if (line.match(/^\d{4}[-–—]/)) {
      continue
    }
    
    if (!course && line.match(new RegExp(degreeKeywords.join('|'), 'i'))) {
      course = line.replace(/\d{4}[-–—].*$/, '').trim()
    } else if (!school && line.length > 5 && !line.match(/^[•\-\*]/)) {
      // Check if it's a university/college name
      if (line.match(/\b(university|college|institute|school|academy)\b/i) || 
          (!course && i === 0)) {
        school = line.replace(/\d{4}[-–—].*$/, '').trim()
      } else if (!location && line.length < 50) {
        location = line
      }
    }
  }
  
  if (course || school) {
    return {
      course: course || 'Degree',
      school: school || 'Institution',
      location: location || '',
      start_year: startYear || '',
      end_year: endYear || ''
    }
  }
  
  return null
}

/**
 * Find education by pattern
 */
function findEducationByPattern(text: string, lines: string[]): ParsedResumeData['education'] {
  const education: ParsedResumeData['education'] = []
  const degreePattern = /\b(bachelor|master|phd|doctorate|diploma|b\.tech|m\.tech|b\.e|m\.e|b\.sc|m\.sc)\b/i
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(degreePattern)) {
      const lineIndex = text.indexOf(lines[i])
      if (lineIndex !== -1) {
        const edu = parseEducationBlock(text.substring(lineIndex, lineIndex + 500))
        if (edu) {
          education.push(edu)
        }
      }
    }
  }
  
  return education.slice(0, 5)
}

/**
 * Extract skills
 */
function extractSkills(text: string, lowerText: string, lines: string[]): ParsedResumeData['skills'] {
  const skills: ParsedResumeData['skills'] = []
  const skillKeywords = ['skills', 'technical skills', 'core competencies', 'expertise']
  
  let skillStartIndex = -1
  for (const keyword of skillKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      skillStartIndex = index + keyword.length
      break
    }
  }
  
  if (skillStartIndex === -1) {
    return []
  }
  
  const skillSection = text.substring(skillStartIndex, skillStartIndex + 2000)
  const skillLines = skillSection.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // Common skill categories
  const categories: { [key: string]: string[] } = {
    programming: [],
    tools: [],
    databases: [],
    cloud: [],
    others: []
  }
  
  // Common skill keywords
  const programmingKeywords = ['javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'react', 'node', 'angular', 'vue', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin']
  const toolKeywords = ['git', 'docker', 'kubernetes', 'jenkins', 'jira', 'confluence', 'figma', 'postman', 'vscode', 'eclipse']
  const databaseKeywords = ['mysql', 'postgresql', 'mongodb', 'redis', 'oracle', 'sql server', 'dynamodb', 'cassandra']
  const cloudKeywords = ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify']
  
  for (const line of skillLines) {
    const lowerLine = line.toLowerCase()
    
    // Skip if it's a section header
    if (line.match(/^(experience|education|projects|achievements|certifications)/i)) {
      break
    }
    
    // Extract skills from bullets or comma-separated lists
    const skillItems = line
      .replace(/^[•\-\*]\s+/, '')
      .split(/[,;|]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const item of skillItems) {
      const lowerItem = item.toLowerCase()
      
      if (programmingKeywords.some(k => lowerItem.includes(k))) {
        categories.programming.push(item)
      } else if (toolKeywords.some(k => lowerItem.includes(k))) {
        categories.tools.push(item)
      } else if (databaseKeywords.some(k => lowerItem.includes(k))) {
        categories.databases.push(item)
      } else if (cloudKeywords.some(k => lowerItem.includes(k))) {
        categories.cloud.push(item)
      } else if (item.length > 2) {
        categories.others.push(item)
      }
    }
  }
  
  // Convert to array format
  Object.keys(categories).forEach(category => {
    if (categories[category].length > 0) {
      skills.push({
        category,
        items: Array.from(new Set(categories[category])) // Remove duplicates
      })
    }
  })
  
  return skills
}

/**
 * Extract projects
 */
function extractProjects(text: string, lowerText: string, lines: string[]): ParsedResumeData['projects'] {
  const projects: ParsedResumeData['projects'] = []
  const projectKeywords = ['projects', 'personal projects', 'side projects', 'portfolio projects']
  
  let projectStartIndex = -1
  for (const keyword of projectKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      projectStartIndex = index + keyword.length
      break
    }
  }
  
  if (projectStartIndex === -1) {
    return []
  }
  
  const projectSection = text.substring(projectStartIndex, projectStartIndex + 3000)
  const projectBlocks = projectSection.split(/\n\s*\n/).filter(block => block.trim().length > 20)
  
  for (let i = 0; i < Math.min(5, projectBlocks.length); i++) {
    const project = parseProjectBlock(projectBlocks[i])
    if (project) {
      projects.push(project)
    }
  }
  
  return projects
}

/**
 * Parse a single project block
 */
function parseProjectBlock(block: string): ParsedResumeData['projects'][0] | null {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 1) return null
  
  let title = ''
  let description = ''
  const techStack: string[] = []
  
  // First line is usually title
  if (lines[0] && !lines[0].match(/^[•\-\*]/)) {
    title = lines[0].replace(/\d{4}[-–—].*$/, '').trim()
  }
  
  // Extract description from bullets
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/^[•\-\*]\s+/)) {
      const bullet = line.replace(/^[•\-\*]\s+/, '').trim()
      if (!description) {
        description = bullet
      }
    } else if (line.length > 10 && !title) {
      title = line
    }
  }
  
  // Extract tech stack from description
  const techKeywords = ['react', 'node', 'python', 'javascript', 'typescript', 'java', 'mongodb', 'mysql', 'aws', 'docker']
  const allText = block.toLowerCase()
  techKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      techStack.push(keyword)
    }
  })
  
  if (title || description) {
    return {
      title: title || 'Project',
      description: description || '',
      contribution: '',
      tech_stack: techStack.join(', ')
    }
  }
  
  return null
}

/**
 * Extract achievements
 */
function extractAchievements(text: string, lowerText: string, lines: string[]): string[] {
  const achievements: string[] = []
  const achievementKeywords = ['achievements', 'awards', 'honors', 'recognition', 'accomplishments']
  
  let achievementStartIndex = -1
  for (const keyword of achievementKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      achievementStartIndex = index + keyword.length
      break
    }
  }
  
  if (achievementStartIndex === -1) {
    return []
  }
  
  const achievementSection = text.substring(achievementStartIndex, achievementStartIndex + 2000)
  const achievementLines = achievementSection.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  for (const line of achievementLines) {
    // Skip if it's a section header
    if (line.match(/^(experience|education|skills|projects|certifications)/i)) {
      break
    }
    
    if (line.match(/^[•\-\*\d+\.]\s+/) && line.length > 10) {
      const achievement = line.replace(/^[•\-\*\d+\.]\s+/, '').trim()
      if (achievement.length > 5) {
        achievements.push(achievement)
      }
    }
  }
  
  return achievements.slice(0, 10)
}

/**
 * Normalize date format (extract year from various formats)
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return ''
  
  const lower = dateStr.toLowerCase()
  if (lower === 'present' || lower === 'current' || lower === 'now') {
    return 'Present'
  }
  
  // Extract year from formats like "Jan 2020", "01/2020", "2020"
  const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) {
    return yearMatch[0]
  }
  
  // Try to parse month-year formats
  const monthYearMatch = dateStr.match(/(\w+)\s+(\d{4})/i)
  if (monthYearMatch) {
    return monthYearMatch[2] // Return just the year
  }
  
  return dateStr.trim()
}

/**
 * Extract certifications
 */
function extractCertifications(text: string, lowerText: string, lines: string[]): string[] {
  const certifications: string[] = []
  const certKeywords = ['certifications', 'certificates', 'certification', 'licenses', 'credentials']
  
  let certStartIndex = -1
  for (const keyword of certKeywords) {
    const index = lowerText.indexOf(keyword)
    if (index !== -1) {
      certStartIndex = index + keyword.length
      break
    }
  }
  
  if (certStartIndex === -1) {
    return []
  }
  
  const certSection = text.substring(certStartIndex, certStartIndex + 2000)
  const certLines = certSection.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  for (const line of certLines) {
    // Skip if it's a section header
    if (line.match(/^(experience|education|skills|projects|achievements)/i)) {
      break
    }
    
    if (line.match(/^[•\-\*\d+\.]\s+/) && line.length > 10) {
      const cert = line.replace(/^[•\-\*\d+\.]\s+/, '').trim()
      if (cert.length > 5) {
        certifications.push(cert)
      }
    }
  }
  
  return certifications.slice(0, 5)
}

