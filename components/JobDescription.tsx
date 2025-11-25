'use client'

interface JobDescriptionProps {
  value: string
  onChange: (text: string) => void
}

export default function JobDescription({ value, onChange }: JobDescriptionProps) {
  return (
    <div className="border-2 border-gray-300 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Job Description</h2>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the job description here..."
        className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
      />
    </div>
  )
}

