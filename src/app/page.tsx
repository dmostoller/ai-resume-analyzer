'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 5MB

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session, status } = useSession();
  const [trialExpired, setTrialExpired] = useState(false);
  const [response, setResponse] = useState<{ feedback: string; keywords: string }>({
    feedback: '',
    keywords: ''
  });
  const [jobDescription, setJobDescription] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      console.error('File size must be less than 5MB');
      return;
    }

    if (
      ![
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ].includes(selectedFile.type)
    ) {
      console.error('Please upload PDF or DOCX files only');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      console.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDescription);

    try {
      setLoading(true);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (res.status === 429) {
        setTrialExpired(true);
        return;
      }

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      setResponse({
        feedback: data.feedback,
        keywords: data.keywords
      });
    } catch (error: any) {
      console.error('Something went wrong. Please try again.', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
        AI Resume Analyzer
      </h1>

      {trialExpired && !session && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl max-w-md">
            <h2 className="text-xl font-bold mb-4">Free Trial Expired</h2>
            <p className="mb-6">Sign in to continue using AI Resume Analyzer</p>
            <button
              onClick={() => signIn('google')}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      )}
      {!trialExpired && (
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Upload Form */}
          <div className="w-full">
            <form
              onSubmit={handleUpload}
              className="bg-white backdrop-blur-sm bg-opacity-95 shadow-lg rounded-xl p-8 transition-all duration-300 hover:shadow-xl"
            >
              <div className="relative mb-6">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-600
                hover:file:bg-blue-100
                cursor-pointer"
                />
                <div>
                  <label
                    htmlFor="jobDescription"
                    className="block text-sm font-medium text-gray-700 mb-2"
                    data-tooltip="Paste the job description for personalized feedback"
                  >
                    Job Description (Optional)
                  </label>
                  <textarea
                    id="jobDescription"
                    rows={4}
                    placeholder="Paste job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full p-2 text-sm text-gray-700 bg-gray-100 rounded-lg focus:ring focus:ring-blue-500 focus:outline-none"
                  ></textarea>
                </div>

                {file && (
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!file || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg 
              font-medium tracking-wide hover:from-blue-700 hover:to-indigo-700
              transform transition-all duration-300 hover:scale-[1.02]
              disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Upload and Analyze'
                )}
              </button>
            </form>
            {response && response.keywords && (
              <div className="bg-white backdrop-blur-sm bg-opacity-95 shadow-lg rounded-xl p-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Key Requirements</h2>
                <ul className="list-none space-y-2">
                  {response.keywords
                    .split(/\d+\.\s+/)
                    .filter(Boolean)
                    .filter((item) => !item.toLowerCase().includes('key requirements'))
                    .map((keyword, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="text-blue-600 font-bold min-w-[24px]">{index + 1}.</span>
                        <span className="text-gray-700">{keyword.trim()}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
          <div className="w-full">
            {response && response.feedback && (
              <div className="h-full bg-white backdrop-blur-sm bg-opacity-95 shadow-lg rounded-xl p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Analysis Feedback</h2>
                  {response.feedback
                    .split(/\d+\.\s+/)
                    .filter(Boolean)
                    .map((point, index) => (
                      <div key={index} className="flex gap-3 mb-3">
                        <span className="font-bold text-blue-600 min-w-[24px]">{index + 1}.</span>
                        <p className="text-gray-700">{point.trim()}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
