'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { SubscriptionSuccessModal } from '@/components/SubscriptionSuccessModal';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import PricingPlans from './PricingPlans';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type AnalysisResponse = {
  feedback: string;
  requirements: {
    matched: string[];
    missing: string[];
    resumeRequirements: string[];
    score: number;
  };
  atsKeywords: {
    matched: string[];
    missing: string[];
    score: number;
  };
  overallScore: number;
} | null;

const AuthButton = () => {
  const { data: session } = useSession();

  if (session) {
    return (
      <button
        onClick={() => signOut()}
        className=" text-gray-600 hover:text-gray-800 transition-colors"
        aria-label="Logout"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="text-gray-600 hover:text-gray-800 transition-colors"
      aria-label="Login"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
        />
      </svg>
    </button>
  );
};

const PricingModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg max-w-6xl w-full mx-auto p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <PricingPlans />
        </div>
      </div>
    </div>
  );
};

export function MainPage({ searchParams }: { searchParams: { success?: string; canceled?: string } }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const [trialExpired, setTrialExpired] = useState(false);
  const [response, setResponse] = useState<AnalysisResponse>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(searchParams.success === 'true');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [jobDescription, setJobDescription] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      console.error('File size must be less than 10MB');
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
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDescription);

    try {
      setLoading(true);

      if (!session?.user) {
        toast.error('Please sign in to continue');
        return;
      }

      // Check subscription with error handling
      try {
        const subStatus = await fetch('/api/subscription');

        if (!subStatus.ok) {
          console.error('Subscription check failed:', await subStatus.text());
          toast.error('Failed to verify subscription status');
          return;
        }

        const subData = await subStatus.json();
        console.log('Subscription status:', subData); // Debug log

        if (!subData.isSubscribed) {
          setTrialExpired(true);
          setShowSubscriptionModal(true);
          return;
        }

        if (subData.usage >= subData.limit) {
          toast.error('Monthly scan limit reached. Please upgrade your plan.');
          return;
        }
      } catch (error) {
        console.error('Subscription check error:', error);
        toast.error('Failed to verify subscription');
        return;
      }

      // Continue with file analysis
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        if (res.status === 429) {
          toast.error('Rate limit reached. Please try again later.');
          return;
        }
        if (res.status === 402) {
          setTrialExpired(true);
          return;
        }
        throw new Error('Analysis failed');
      }

      const data = await res.json();

      try {
        const usageResponse = await fetch('/api/increment-usage', {
          method: 'POST'
        });

        if (!usageResponse.ok) {
          console.error('Failed to increment usage');
        }

        const usageData = await usageResponse.json();
        console.log('Updated usage:', usageData);
      } catch (error) {
        console.error('Error incrementing usage:', error);
      }

      setResponse({
        feedback: data.feedback,
        requirements: {
          matched: data.requirements.matched,
          missing: data.requirements.missing,
          resumeRequirements: data.requirements.resumeRequirements,
          score: data.requirements.score
        },
        atsKeywords: data.atsKeywords,
        overallScore: data.overallScore
      });

      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowPricingModal(true)}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          Upgrade & Unlock Pro Features
        </button>
        <div className="flex items-center">
          <AuthButton />
          <SubscriptionManager />
        </div>
      </div>
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
      <header className="mb-8 text-center">
        <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          AI Resume Analyzer
        </h1>
      </header>
      {trialExpired && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onUpgrade={() => {
            setShowSubscriptionModal(false);
            setShowPricingModal(true);
          }}
        />
      )}
      {showSuccessModal && (
        <SubscriptionSuccessModal
          onClose={() => {
            setShowSuccessModal(false);
            setTrialExpired(false);
          }}
        />
      )}
      {!trialExpired && (
        <>
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Upload Form */}
            <div className="lg:col-span-1">
              <form
                onSubmit={handleUpload}
                className="bg-white backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6 space-y-6"
              >
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Resume
                  </label>
                  <input
                    id="file-upload"
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
                </div>
                <div>
                  <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description (Optional)
                  </label>
                  <textarea
                    id="jobDescription"
                    rows={4}
                    placeholder="Paste job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full p-3 text-sm text-gray-700 bg-gray-100 rounded-lg focus:ring focus:ring-blue-500 focus:outline-none"
                  ></textarea>
                </div>
                {file && (
                  <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <span>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
                <button
                  type="submit"
                  disabled={!file || loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg 
                  font-medium tracking-wide hover:from-blue-700 hover:to-indigo-700
                  transform transition-all duration-300 hover:scale-105
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
            </div>

            {/* Middle Column - Analysis Results */}
            <div className="lg:col-span-2 space-y-6">
              {response && (
                <>
                  {/* Requirements Analysis */}
                  <div className="bg-white backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Requirements Analysis</h2>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 h-24">
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#eee"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={`hsl(${response.overallScore}, 70%, 50%)`}
                              strokeWidth="3"
                              strokeDasharray={`${response.overallScore}, 100`}
                            />
                            <text
                              x="18"
                              y="20.35"
                              className="score-text"
                              textAnchor="middle"
                              fill="#444"
                              fontSize="8"
                            >
                              {response.overallScore}%
                            </text>
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg text-gray-700">Overall Score</p>
                          <p className="text-2xl font-semibold text-gray-900">{response.overallScore}%</p>
                        </div>
                      </div>
                      <div className="flex space-x-8 mt-4 md:mt-0">
                        <div>
                          <p className="text-sm text-gray-600">Requirements Match:</p>
                          <p
                            className="text-lg font-semibold"
                            style={{ color: `hsl(${response.requirements.score}, 70%, 50%)` }}
                          >
                            {response.requirements.score}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Keywords Match:</p>
                          <p
                            className="text-lg font-semibold"
                            style={{ color: `hsl(${response.atsKeywords.score}, 70%, 50%)` }}
                          >
                            {response.atsKeywords.score}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resume Requirements */}
                    {response.requirements.resumeRequirements?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-blue-600 mb-3">Your Resume Requirements</h3>
                        <ul className="list-disc list-inside space-y-2">
                          {response.requirements.resumeRequirements
                            .filter(
                              (req) => !req.toLowerCase().includes('key qualifications and requirements:')
                            )
                            .map((req, index) => (
                              <li key={index} className="text-gray-700">
                                {req}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Matched Requirements */}
                    {response.requirements.matched?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-green-600 mb-3">Requirements Met</h3>
                        <ul className="list-disc list-inside space-y-2">
                          {response.requirements.matched.map((req, index) => (
                            <li key={index} className="flex items-center text-gray-700">
                              <span className="text-green-500 mr-2">✓</span> {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Missing Requirements */}
                    {response.requirements.missing?.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-red-600 mb-3">Missing Requirements</h3>
                        <ul className="list-disc list-inside space-y-2">
                          {response.requirements.missing.map((req, index) => (
                            <li key={index} className="flex items-center text-gray-700">
                              <span className="text-red-500 mr-2">✗</span> {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* ATS Keywords Analysis */}
                  {response.atsKeywords && (
                    <div className="bg-white backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">ATS Keywords Analysis</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="md:col-span-1">
                          <h3 className="text-lg font-semibold text-green-600 mb-2">Found in Your Resume</h3>
                          <div className="flex flex-wrap gap-2">
                            {response.atsKeywords.matched.map((keyword, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="md:col-span-2">
                          <h3 className="text-lg font-semibold text-red-600 mb-2">Missing Keywords</h3>
                          <div className="flex flex-wrap gap-2">
                            {response.atsKeywords.missing.map((keyword, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {response && response.feedback ? (
                // Analysis Feedback
                <div className="bg-white backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Resume Feedback</h2>
                  <div className="prose prose-sm prose-blue">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-3xl font-bold mb-4">{children}</h1>,
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold text-gray-700 mt-6 mb-2">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold text-gray-600 mt-4 mb-2">{children}</h3>
                        ),
                        p: ({ children }) => <p className="text-gray-700 mb-3">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-3">{children}</ul>,
                        li: ({ children }) => <li className="mb-2">{children}</li>,
                        strong: ({ children }) => (
                          <strong className="font-bold text-gray-900">{children}</strong>
                        )
                      }}
                    >
                      {response.feedback}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">How It Works</h2>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-blue-600 mb-2">1. Upload Your Resume</h3>
                        <p className="text-gray-700">
                          Upload your resume in PDF or DOCX format. Maximum file size is 10MB.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-blue-600 mb-2">
                          2. Add Job Description (Optional)
                        </h3>
                        <p className="text-gray-700">
                          Paste the job description to receive tailored feedback and match analysis.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-blue-600 mb-2">3. Get Instant Analysis</h3>
                        <p className="text-gray-700">
                          Our AI will analyze your resume and provide detailed feedback on:
                        </p>
                        <ul className="list-disc list-inside mt-2 text-gray-700 space-y-1">
                          <li>Content and formatting improvements</li>
                          <li>Key skills and qualifications</li>
                          <li>ATS optimization suggestions</li>
                          <li>Job description alignment (if provided)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
