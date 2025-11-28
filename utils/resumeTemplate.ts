/**
 * EXACT RESUME TEMPLATE CONFIGURATION
 * 
 * This template configuration matches the exact structure, alignment, and formatting
 * from the reference PDF. All measurements are in points (72 DPI).
 * 
 * This is a GENERIC template - it works for ALL users with their own data.
 * NO personal data is hardcoded here.
 */

// A4 Page Dimensions (standard)
export const PAGE_CONFIG = {
  width: 595.28,  // A4 width in points
  height: 841.89,  // A4 height in points
  margin: {
    top: 40,       // Top margin (slightly more space at top)
    bottom: 30,    // Bottom margin (tighter at bottom)
    left: 36,      // Left margin (0.5 inch)
    right: 36      // Right margin (0.5 inch)
  }
}

// Typography Configuration - EXACT font sizes and spacing
export const TYPOGRAPHY = {
  // Font families (using PDF standard fonts)
  fontFamily: 'Helvetica',
  boldFontFamily: 'Helvetica-Bold',
  
  // Font sizes (in points) - PRECISE measurements
  name: {
    size: 16,           // Name font size (slightly smaller for better fit)
    weight: 'bold',     // Always bold
    transform: 'uppercase' // Always uppercase
  },
  contact: {
    size: 9,            // Contact info font size
    weight: 'normal',
    lineHeight: 10.5   // Line height for contact (tighter)
  },
  sectionHeader: {
    size: 10.5,         // Section header font size (PROFESSIONAL SUMMARY, EXPERIENCE, etc.)
    weight: 'bold',
    transform: 'uppercase'
  },
  body: {
    size: 9,            // Body text font size
    weight: 'normal',
    lineHeight: 10.5   // Line height for body text (tighter, more compact)
  },
  company: {
    size: 9.5,          // Company/University name font size (slightly larger than body)
    weight: 'bold'
  },
  jobTitle: {
    size: 9,            // Job title/Degree font size
    weight: 'normal'
  },
  bullet: {
    size: 9,            // Bullet point text size
    weight: 'normal',
    indent: 10          // Indentation from left margin for bullet text (tighter)
  }
}

// Spacing Configuration - EXACT spacing between elements (PRECISE)
export const SPACING = {
  // Vertical spacing (in points) - TIGHTER for professional look
  afterName: 6,              // Space after name (tighter)
  afterContact: 8,           // Space after contact info (tighter)
  beforeSection: 10,         // Space before section header (tighter)
  afterSectionHeader: 6,     // Space after section header (tighter)
  betweenEntries: 5,         // Space between experience/education entries (tighter)
  betweenBullets: 3,         // Space between bullet points (tighter)
  paragraphSpacing: 3,       // Space between paragraphs (tighter)
  afterSummary: 6,           // Space after summary section (tighter)
  
  // Horizontal spacing - PRECISE alignment
  bulletIndent: 10,          // Indent for bullet points from left margin (tighter)
  tableLeftMargin: 18,       // Left margin for table rows (experience/education) - edge-to-edge
  tableRightMargin: 18        // Right margin for table rows (dates/locations) - edge-to-edge
}

// Alignment Configuration
export const ALIGNMENT = {
  name: 'center',            // Name is centered
  contact: 'center',         // Contact info is centered
  sectionHeaders: 'left',     // Section headers are left-aligned
  body: 'left',              // Body text is left-aligned
  dates: 'right',            // Dates are right-aligned
  company: 'left',           // Company names are left-aligned
  jobTitle: 'left'           // Job titles are left-aligned
}

// Section Order - EXACT order of sections
export const SECTION_ORDER = [
  'PROFESSIONAL SUMMARY',
  'WORK EXPERIENCE',  // or 'EXPERIENCE'
  'EDUCATION',
  'TECHNICAL SKILLS', // or 'SKILLS'
  'PROJECTS',
  'ACHIEVEMENTS',
  'CERTIFICATIONS'
]

// Formatting Rules
export const FORMATTING = {
  // Date format
  dateFormat: {
    separator: '–',           // En dash for date ranges
    presentText: 'Present',   // Text for current positions
    style: 'right'           // Right-aligned
  },
  
  // Contact separator
  contactSeparator: ' | ',   // Separator between contact items
  
  // Section header style
  sectionHeaderStyle: {
    bold: true,
    uppercase: true,
    underline: false
  },
  
  // Bullet style
  bulletStyle: {
    character: '•',           // Bullet character
    indent: 12               // Indentation in points
  },
  
  // Table row format (for experience/education)
  tableFormat: {
    leftAlign: 'left',       // Left column alignment
    rightAlign: 'right',      // Right column alignment (dates/locations)
    separator: ' — '         // Separator between location and date
  }
}

// Color Configuration
export const COLORS = {
  text: { r: 0, g: 0, b: 0 },           // Black text
  links: { r: 0, g: 0, b: 0.8 },       // Blue links (if needed)
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
 * Template validation - ensures all measurements are valid
 */
export function validateTemplate(): boolean {
  if (PAGE_CONFIG.width <= 0 || PAGE_CONFIG.height <= 0) return false
  if (PAGE_CONFIG.margin.top < 0 || PAGE_CONFIG.margin.bottom < 0) return false
  if (PAGE_CONFIG.margin.left < 0 || PAGE_CONFIG.margin.right < 0) return false
  if (TYPOGRAPHY.name.size <= 0 || TYPOGRAPHY.body.size <= 0) return false
  return true
}

