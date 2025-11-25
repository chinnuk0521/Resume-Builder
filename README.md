# Resume ATS Optimizer

A full-stack web application that transforms resumes into ATS-friendly formats. Upload a PDF resume, provide a job description, and get an optimized resume that you can edit and download.

## Features

- PDF resume upload (max 5MB)
- Job description input
- AI-powered resume transformation
- Inline rich text editor
- PDF download (client-side generation)
- No data storage - everything processed in memory

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TailwindCSS
- pdf-parse (server-side PDF text extraction)
- pdf-lib (client-side PDF generation)
- react-quill (rich text editor)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. (Optional) Set up Hugging Face API key for better LLM results:
```bash
# Create .env.local file
HF_TOKEN=your_huggingface_token_here
```

You can get a free API token from [Hugging Face](https://huggingface.co/settings/tokens). The application uses the Hugging Face Router API with the `moonshotai/Kimi-K2-Instruct-0905` model for intelligent resume optimization.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Upload your resume PDF (max 5MB)
2. Paste the job description in the textarea
3. Wait for the AI to transform your resume
4. Edit the resume in the rich text editor
5. Click "Download PDF" to get your ATS-optimized resume

## Notes

- The application works without an API key using a fallback transformation method
- For best results, add a Hugging Face API key to use their free LLM
- All processing happens in memory - no data is stored
- The generated PDF uses a clean, ATS-friendly format

## License

MIT

