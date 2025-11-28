/**
 * ATS-FRIENDLY RESUME TEMPLATE CONFIGURATION
 * 
 * This template follows ATS-friendly single-page resume specifications:
 * - No tables, text boxes, or complex layouts
 * - Simple text structure with proper alignment
 * - Standard fonts and spacing
 * - Right-aligned dates using calculated positions
 * 
 * All measurements are in points (72 DPI).
 * 1 mm = 2.83465 points
 * 
 * This is a GENERIC template - works for ALL users with their own data.
 * NO personal data is hardcoded here.
 */

// A4 Page Dimensions (210 mm × 297 mm)
export const PAGE_CONFIG = {
  width: 595.28,   // A4 width in points
  height: 841.89,  // A4 height in points
  margin: {
    top: 51.02,     // 18 mm = 51.02 points
    bottom: 51.02,  // 18 mm = 51.02 points
    left: 42.52,    // 15 mm = 42.52 points
    right: 42.52    // 15 mm = 42.52 points
  }
}

// Typography Configuration - ATS-friendly font sizes
export const TYPOGRAPHY = {
  // Font families (using PDF standard fonts - ATS compatible)
  fontFamily: 'Helvetica',
  boldFontFamily: 'Helvetica-Bold',
  
  // Font sizes (in points) - ATS-friendly specifications
  name: {
    size: 19,           // 18-20 pt (using 19pt for balance)
    weight: 'bold',     // Always bold
    transform: 'uppercase' // Always uppercase
  },
  contact: {
    size: 10.5,         // 10-11 pt (using 10.5pt)
    weight: 'normal',
    lineHeight: 11.55   // 10.5 * 1.1 = 11.55 (line spacing 1.1)
  },
  sectionHeader: {
    size: 11.5,         // 11-12 pt (using 11.5pt)
    weight: 'bold',
    transform: 'uppercase'
  },
  body: {
    size: 10.5,         // 10-11 pt (using 10.5pt)
    weight: 'normal',
    lineHeight: 11.55   // 10.5 * 1.1 = 11.55 (line spacing 1.1)
  },
  company: {
    size: 10.5,         // Same as body, but bold
    weight: 'bold'
  },
  jobTitle: {
    size: 10.5,         // Same as body
    weight: 'normal'
  },
  dates: {
    size: 10,           // 10 pt for dates/locations
    weight: 'normal',
    lineHeight: 11      // 10 * 1.1 = 11
  },
  bullet: {
    size: 10.5,         // Same as body
    weight: 'normal',
    leftIndent: 14.17,  // 5 mm = 14.17 points (left indent)
    hangingIndent: 14.17 // 5 mm = 14.17 points (hanging indent)
  }
}

// Spacing Configuration - ATS-friendly spacing
export const SPACING = {
  // Vertical spacing (in points)
  afterName: 4.5,           // 4-5 pt (using 4.5pt)
  afterContact: 6,          // Space after contact info
  beforeSection: 7,         // 6-8 pt before section (using 7pt)
  afterSectionHeader: 4,    // Space after section header
  betweenSections: 11,      // 10-12 pt between sections (using 11pt)
  betweenEntries: 5,       // 4-6 pt between job/education entries (using 5pt)
  betweenBullets: 2,       // 2 pt between bullet points
  paragraphSpacing: 3,     // Space between paragraphs
  afterSummary: 6,         // Space after summary
  
  // Horizontal spacing
  bulletLeftIndent: 14.17, // 5 mm = 14.17 points
  bulletHangingIndent: 14.17 // 5 mm = 14.17 points
}

// Alignment Configuration
export const ALIGNMENT = {
  name: 'center',          // Name is centered
  contact: 'center',       // Contact info is centered
  sectionHeaders: 'left',  // Section headers are left-aligned
  body: 'left',            // Body text is left-aligned
  dates: 'right',          // Dates are right-aligned
  company: 'left',         // Company names are left-aligned
  jobTitle: 'left'         // Job titles are left-aligned
}

// Section Order - ATS-friendly order
export const SECTION_ORDER = [
  'SUMMARY',              // Optional
  'SKILLS',
  'EXPERIENCE',           // or 'WORK EXPERIENCE'
  'EDUCATION',
  'PROJECTS',             // Optional
  'CERTIFICATIONS'        // Optional
]

// Formatting Rules
export const FORMATTING = {
  // Date format
  dateFormat: {
    separator: ' – ',      // Space-en-dash-space for date ranges
    presentText: 'Present', // Text for current positions
    style: 'right'        // Right-aligned
  },
  
  // Contact separator
  contactSeparator: ' | ', // Separator between contact items
  
  // Section header style
  sectionHeaderStyle: {
    bold: true,
    uppercase: true,
    underline: false
  },
  
  // Bullet style
  bulletStyle: {
    character: '•',        // Simple circular bullet
    leftIndent: 14.17,    // 5 mm left indent
    hangingIndent: 14.17  // 5 mm hanging indent
  },
  
  // Simple text format (no tables)
  textFormat: {
    useTabs: false,        // Use calculated positions instead of tabs
    simpleText: true       // Simple text, no pipes or complex formatting
  }
}

// Color Configuration
export const COLORS = {
  text: { r: 0, g: 0, b: 0 },           // Pure black (#000000)
  links: { r: 0, g: 0, b: 0 },         // Black for links (ATS-friendly)
  background: { r: 1, g: 1, b: 1 }     // White background
}

/**
 * Calculate content width (page width minus margins)
 */
export function getContentWidth(): number {
  return PAGE_CONFIG.width - PAGE_CONFIG.margin.left - PAGE_CONFIG.margin.right
}

/**
 * Calculate starting Y position (from top)
 */
export function getStartY(): number {
  return PAGE_CONFIG.height - PAGE_CONFIG.margin.top
}

/**
 * Get minimum Y position (bottom margin)
 */
export function getMinY(): number {
  return PAGE_CONFIG.margin.bottom
}

/**
 * Calculate right-aligned X position for text
 */
export function getRightAlignedX(text: string, fontSize: number, font: any): number {
  const textWidth = font.widthOfTextAtSize(text, fontSize)
  return PAGE_CONFIG.width - PAGE_CONFIG.margin.right - textWidth
}

/**
 * Template validation - ensures all measurements are valid
 */
export function validateTemplate(): boolean {
  if (PAGE_CONFIG.width <= 0 || PAGE_CONFIG.height <= 0) return false
  if (PAGE_CONFIG.margin.top < 0 || PAGE_CONFIG.margin.bottom < 0) return false
  if (PAGE_CONFIG.margin.left < 0 || PAGE_CONFIG.margin.right < 0) return false
  if (TYPOGRAPHY.name.size <= 0 || TYPOGRAPHY.body.size <= 0) return false
  if (TYPOGRAPHY.body.lineHeight < TYPOGRAPHY.body.size) return false // Line spacing must be >= 1.0
  return true
}
