'use client'

interface JobDescriptionProps {
  value: string
  onChange: (text: string) => void
}

export default function JobDescription({ value, onChange }: JobDescriptionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">Job Description</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the job description here. Include requirements, responsibilities, and qualifications..."
        className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
      />
      <p className="text-xs text-gray-500 mt-2">{value.length} characters</p>
    </div>
  )
}

