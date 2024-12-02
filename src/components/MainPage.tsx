'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-hot-toast';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { SubscriptionSuccessModal } from '@/components/SubscriptionSuccessModal';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import PricingPlans from './PricingPlans';
import { AuthButton } from '@/components/AuthButton';
import { signIn } from 'next-auth/react';
import { useSubscription } from '@/app/hooks/useSubscription';
import { SubscriptionTier } from '@/app/types/subscription';
import { PlanTier } from '@/app/types/stripe';
import Lottie from 'lottie-react';
import aiAnimation from '../animations/ai-analysis.json';
import aiIconAnimation from '../animations/ai-icon.json';
import { UploadAnimation } from './UploadAnimation';
import { SparklesIcon } from './icons/sparkes';

const PLAN_DISPLAY_NAME: Record<PlanTier, string> = {
  free: 'Free Plan',
  pro: 'Pro Plan',
  premium: 'Premium Plan'
} as const;

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

const PricingModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <div className="relative bg-[var(--card-background)] rounded-lg max-w-6xl w-full mx-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 z-50">
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
  const { subscription, loading: subLoading, fetchSubscriptionDetails } = useSubscription();
  const [usageCount, setUsageCount] = useState(subscription?.usage || 0);
  const [currentController, setCurrentController] = useState<AbortController | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchSubscriptionDetails();
    }
  }, [session]);

  useEffect(() => {
    setUsageCount(subscription?.usage || 0);
  }, [subscription]);

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

    if (!session?.user) {
      toast.error('Please sign in to continue');
      return;
    }

    const controller = new AbortController();
    setCurrentController(controller);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDescription);

    try {
      setLoading(true);

      // console.log('Usage:', subscription?.usage, 'Limit:', subscription?.subscription?.plan.limit);
      if ((subscription?.usage ?? 0) >= (subscription?.subscription?.plan.limit ?? 0)) {
        setShowSubscriptionModal(true);
        return;
      }

      // Continue with file analysis
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal
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
          method: 'POST',
          signal: controller.signal
        });

        if (!usageResponse.ok) {
          console.error('Failed to increment usage');
        }

        const usageData = await usageResponse.json();
        setUsageCount((prevCount) => prevCount + 1);
        console.log('Updated usage:', usageData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error incrementing usage:', error);
        }
      }

      // Save scan to history
      try {
        await fetch('/api/scans/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            feedback: data.feedback,
            requirements: data.requirements,
            atsKeywords: data.atsKeywords,
            overallScore: data.overallScore,
            jobDescription: jobDescription,
            fileName: file.name
          }),
          signal: controller.signal
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error saving scan history:', error);
        } else {
          // Clean up on abort
          setLoading(false);
          setCurrentController(null);
          return; // Exit early if aborted
        }
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
      if ((error as Error).name === 'AbortError') {
        toast.error('Upload cancelled');
      } else {
        console.error('Upload failed:', error);
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
      setCurrentController(null);
    }
  };

  useEffect(() => {
    return () => {
      if (currentController) {
        currentController.abort();
      }
    };
  }, [currentController]);

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
      <header className="bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900 text-white pb-16 pt-4 px-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setShowPricingModal(true)}
            className="group inline-flex items-center border border-transparent text-base font-medium 
          rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 
          hover:from-blue-700 hover:to-indigo-700 px-0 py-0 transition-all duration-300 ease-in-out"
          >
            <SparklesIcon />
            <span
              className="w-0 whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out 
            group-hover:w-[260px] opacity-0 group-hover:opacity-100"
            >
              <span>Upgrade & Unlock Pro Features</span>
            </span>
          </button>

          <div className="flex items-center">
            <AuthButton />
            {session && <SubscriptionManager />}
          </div>
        </div>
        <div className="max-w-7xl mx-auto">
          {session?.user ? (
            <div className="space-y-8">
              {/* Personalized Greeting */}
              <div className="text-center">
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
                  Welcome back, {session.user.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-lg sm:text-xl text-blue-200 font-medium">
                  Let's optimize your next resume
                </p>
              </div>

              {/* Simplified Quick Stats */}
              <div className="flex justify-center mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 w-full max-w-3xl text-center shadow-lg">
                  {/* Plan Name */}
                  <p className="text-blue-200 text-sm mb-2">Plan</p>
                  <p className="text-2xl font-bold text-white mb-6">
                    {PLAN_DISPLAY_NAME[subscription?.subscription?.plan?.tier || 'free']}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/20 rounded-full h-4 mb-4">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 h-4 rounded-full"
                      style={{
                        width: `${(usageCount / (subscription?.subscription?.plan.limit || 3)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-blue-200 text-sm">
                    {usageCount}/{subscription?.subscription?.plan.limit || 3} Monthly Scans Used
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="inline-flex items-center px-4 py-0 text-lg font-semibold rounded-full shadow-lg 
                  bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 
                  focus:ring-2 focus:ring-indigo-400 w-full sm:w-auto justify-center"
                >
                  <Lottie animationData={aiIconAnimation} loop={true} className="w-12 pr-2 py-2" />
                  New Resume Scan
                </button>
              </div>
            </div>
          ) : (
            // Existing non-logged-in hero content
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16 py-16 px-6 lg:px-16 bg-gradient-to-r from-indigo-900 via-purple-900 to-blue-900">
              {/* Left Section: Text Content */}
              <div className="text-center lg:text-left max-w-lg">
                <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight text-white mb-6">
                  Analyze Your Resume with <span className="text-blue-400">AI-Powered Insights</span>
                </h1>
                <p className="text-lg lg:text-xl font-medium text-blue-200 mb-8">
                  Optimize your resume, get ATS-ready, and land your dream job faster.
                </p>
                <div className="relative inline-block">
                  <button
                    onClick={() => signIn()}
                    className="relative z-10 inline-flex items-center px-8 py-4 text-lg font-semibold rounded-full shadow-lg 
            bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:ring-2 focus:ring-indigo-400 text-white"
                  >
                    Get Started
                  </button>
                  <span className="absolute -inset-0.5 rounded-full bg-[radial-gradient(circle_at_center,theme(colors.purple.500),theme(colors.pink.500)_50%,theme(colors.indigo.500)_100%)] animate-shimmer"></span>
                </div>
              </div>

              {/* Right Section: Lottie Animation */}
              <div className="flex-shrink-0">
                <Lottie animationData={aiAnimation} loop={true} className="w-[300px] lg:w-[400px] mx-auto" />
              </div>
            </div>
          )}
        </div>
      </header>
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onUpgrade={() => {
          setShowSubscriptionModal(false);
          setShowPricingModal(true);
        }}
        currentTier={(subscription?.subscription?.plan?.tier as SubscriptionTier) || SubscriptionTier.FREE}
      />
      {showSuccessModal && (
        <SubscriptionSuccessModal
          onClose={() => {
            setShowSuccessModal(false);
            setTrialExpired(false);
          }}
        />
      )}
      <section className="py-12 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-8">
          {[
            {
              title: 'ATS Optimization',
              icon: '🚀',
              description: 'Get suggestions to optimize your resume for ATS systems.'
            },
            {
              title: 'Keyword Match Analysis',
              icon: '🔑',
              description: 'See which keywords your resume is missing.'
            },
            {
              title: 'Tailored Feedback',
              icon: '📋',
              description: 'Receive actionable insights for job applications.'
            }
          ].map((feature, idx) => (
            <div
              key={idx}
              className="bg-[var(--card-background)] p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{feature.title}</h3>
              <p className="text-[var(--text-secondary)]">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
      {!trialExpired && (
        <>
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Upload Form */}
            <div className="lg:col-span-1">
              <form
                onSubmit={handleUpload}
                className="bg-[var(--card-background)] border border-[var(--card-border)] backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6 space-y-6"
              >
                <div>
                  <label
                    htmlFor="file-upload"
                    className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                  >
                    Upload Resume
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-[var(--text-secondary)]
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 dark:file:bg-blue-950
                    file:text-blue-600 dark:file:text-blue-400
                    hover:file:bg-blue-100 dark:hover:file:bg-blue-900
                    cursor-pointer
                    focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="jobDescription"
                    className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
                  >
                    Job Description (Optional)
                  </label>
                  <textarea
                    id="jobDescription"
                    rows={4}
                    placeholder="Paste job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full p-3 text-sm text-[var(--text-secondary)] bg-[var(--gray-100)] rounded-lg focus:ring focus:ring-blue-500 focus:outline-none"
                  ></textarea>
                </div>
                {file && (
                  <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] bg-[var(--gray-50)] p-3 rounded-lg">
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
                  <div className="bg-[var(--card-background)] backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6 border border-[var(--card-border)]">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                      Requirements Analysis
                    </h2>
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
                              className="score-text text-[var(--text-primary)]"
                              textAnchor="middle"
                              fill="currentColor"
                              fontSize="8"
                            >
                              {response.overallScore}%
                            </text>
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg text-[var(--text-secondary)]">Overall Score</p>
                          <p
                            className="text-2xl font-semibold"
                            style={{ color: `hsl(${response.overallScore}, 70%, 50%)` }}
                          >
                            {response.overallScore}%
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-8 mt-4 md:mt-0">
                        <div>
                          <p className="text-sm text-[var(--text-secondary)]">Requirements Match:</p>
                          <p
                            className="text-lg font-semibold"
                            style={{ color: `hsl(${response.requirements.score}, 70%, 50%)` }}
                          >
                            {response.requirements.score}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[var(--text-secondary)]">Keywords Match:</p>
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
                              <li key={index} className="text-[var(--text-secondary)]">
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
                            <li key={index} className="flex items-center text-[var(--text-secondary)]">
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
                            <li key={index} className="flex items-center text-[var(--text-secondary)]">
                              <span className="text-red-500 mr-2">✗</span> {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* ATS Keywords Analysis */}
                  {response.atsKeywords && (
                    <div className="bg-[var(--card-background)] backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6">
                      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                        ATS Keywords Analysis
                      </h2>
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
                <div className="bg-[var(--card-background)] border border-[var(--card-border)] backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Resume Feedback</h2>
                  <div className="prose prose-sm prose-blue">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-3xl font-bold mb-4">{children}</h1>,
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-bold text-[var(--text-secondary)] mt-6 mb-2">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mt-4 mb-2">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => <p className="text-[var(--text-secondary)] mb-3">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-3">{children}</ul>,
                        li: ({ children }) => <li className="mb-2">{children}</li>,
                        strong: ({ children }) => (
                          <strong className="font-bold text-[var(--text-primary)]">{children}</strong>
                        )
                      }}
                    >
                      {response.feedback}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-[var(--card-background)] backdrop-blur-sm bg-opacity-90 shadow-md rounded-xl p-6">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">How It Works</h2>
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-xl font-semibold text-blue-600 mb-2">1. Upload Your Resume</h3>
                        <p className="text-[var(--text-secondary)]">
                          Upload your resume in PDF or DOCX format. Maximum file size is 10MB.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-blue-600 mb-2">
                          2. Add Job Description (Optional)
                        </h3>
                        <p className="text-[var(--text-secondary)]">
                          Paste the job description to receive tailored feedback and match analysis.
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-blue-600 mb-2">3. Get Instant Analysis</h3>
                        <p className="text-[var(--text-secondary)]">
                          Our AI will analyze your resume and provide detailed feedback on:
                        </p>
                        <ul className="list-disc list-inside mt-2 text-[var(--text-secondary)] space-y-1">
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
      <UploadAnimation
        isOpen={loading}
        onClose={() => {
          currentController?.abort();
          setLoading(false);
        }}
      />
    </div>
  );
}
