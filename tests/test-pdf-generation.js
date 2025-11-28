/**
 * Test script to generate a PDF with the exact format
 * Run: node test-pdf-generation.js
 */

const { generatePDF } = require('./utils/pdfGenerator.ts');

// Sample resume data matching the exact format from the PDF
const testResumeText = `CHANDU KALLURU

chandu.kalluru@outlook.com | +918179299096 | LinkedIn | Portfolio | GitHub

PROFESSIONAL SUMMARY

Software engineer with 2+ years of experience in full-stack development, data analytics, and blockchain technologies. Skilled in building scalable web applications, RESTful APIs, and interactive dashboards. Experienced in React, Python, SQL, and Power BI, with proven success in designing ETL pipelines, delivering analytics solutions, and implementing smart contracts. Adept at collaborating with cross-functional teams, applying Agile and Test-Driven Development (TDD) practices, and driving projects from concept to deployment. Passionate about leveraging modern technologies to deliver high-impact software solutions for businesses.

EDUCATION

| Yogi Vemana University | Proddatur, India |
2019–2023
Bachelor of Technology in Computer Science & Engineering

WORK EXPERIENCE

| Project Associate | 2025–2025
INDIAN INSTITUTE OF TECHNOLOGY, MADRAS
• Lead research on Blockchain Technology and Distributed Ledger Technologies (DLTs)
• Developed a proof-of-concept decentralized e-voting application using WebAssembly and WIDL
• Design and deploy Smart Contracts for enterprise use cases with a focus on security and efficiency
• Collaborate with cross-functional teams to develop innovative blockchain solutions
• Mentored 4 interns working on blockchain research projects and implementation
`;

async function testPDFGeneration() {
  try {
    console.log('Generating test PDF...');
    const blob = await generatePDF(testResumeText);
    
    // In Node.js environment, we need to use fs to write the file
    const fs = require('fs');
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync('test-resume-output.pdf', buffer);
    
    console.log('✅ PDF generated successfully: test-resume-output.pdf');
    console.log('File size:', buffer.length, 'bytes');
  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    console.error(error.stack);
  }
}

// Note: This requires the PDF generator to work in Node.js environment
// If it doesn't work directly, we may need to create a Next.js API route for testing
console.log('Note: This script requires the PDF generator to be adapted for Node.js');
console.log('Alternatively, test through the web interface or create an API route');

testPDFGeneration();

