import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ArrowRight, Loader2, AlertTriangle, Search, Zap, Target, TrendingUp, Info } from 'lucide-react';

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate('/login');
      return;
    }

    if (!url) return;

    // Basic URL validation
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    // Check limits before starting (if logged in)
    if (user && user.subscription_plan === 'free' && user.analysis_count >= 2) {
      navigate('/pricing');
      return;
    }

    setLoading(true);
    setLoadingStep(1);
    setError('');
    setPreview(null);

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => prev < 4 ? prev + 1 : prev);
    }, 2500);

    try {
      // 1. Scrape
      const scrapeRes = await api.post('/api/analyze/scrape', { url: targetUrl });
      const content = scrapeRes.data.content;

      setLoadingStep(3);

      // 2. Generate Analysis via Backend
      const analysisRes = await api.post('/api/analyze/generate-report', { content });
      const analysis = analysisRes.data;

      setLoadingStep(4);

      if (user) {
        const { data } = await api.post('/api/analyze/save', { url: targetUrl, analysis });
        navigate(`/report/${data.id}`);
      } else {
        setPreview({
          score: analysis.score,
          first_impression: analysis.first_impression,
          preview: true,
          message: 'Create an account to unlock your full conversion analysis.'
        });
      }
    } catch (err: any) {
      let errorMessage = err.response?.data?.error || err.message || 'Failed to analyze website. Please try again.';

      if (typeof errorMessage === 'string') {
        if (errorMessage.toLowerCase().includes('monthly limit reached')) {
          navigate('/pricing');
          return;
        }
        if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
          errorMessage = 'Invalid API key. Please check your Gemini API key configuration.';
        } else if (errorMessage.startsWith('{')) {
          try {
            const parsed = JSON.parse(errorMessage);
            if (parsed.error && parsed.error.message) {
              errorMessage = parsed.error.message;
            }
          } catch (e) {
            // Ignore parse error
          }
        }
      }

      setError(errorMessage);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      {/* Background gradients */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            Skeptic: The AI Website Auditor
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-50 mb-6 leading-[1.1]">
            Turn More Visitors Into <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Paying Customers
            </span>
          </h1>

          <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto">
            Discover the UX, SEO, and messaging mistakes killing your conversions. Paste your URL below for an instant, actionable business audit.
          </p>

          <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-2">
                <div className="pl-4 pr-2 text-zinc-500">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste your website URL (e.g., razorpay.com)"
                  className="flex-1 bg-transparent border-none focus:outline-none text-zinc-100 placeholder:text-zinc-600 py-4 text-lg"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-zinc-50 text-zinc-950 px-8 py-4 rounded-xl font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[200px] justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {loadingStep === 1 && 'Fetching website content...'}
                      {loadingStep === 2 && 'Extracting page elements...'}
                      {loadingStep === 3 && 'Analyzing UX & messaging...'}
                      {loadingStep >= 4 && 'Generating recommendations...'}
                    </>
                  ) : (
                    <>
                      Analyze Website
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </form>

          {/* Preview State for non-logged in users */}
          {preview && !user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-16 max-w-3xl mx-auto"
            >
              <div className="relative rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center bg-zinc-950/60">
                  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center max-w-md shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Zap className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-50 mb-4">Analysis Complete!</h3>
                    <p className="text-zinc-400 mb-8">
                      {preview.message}
                    </p>
                    <button
                      onClick={() => navigate('/signup')}
                      className="w-full bg-emerald-500 text-zinc-950 font-bold py-4 rounded-xl hover:bg-emerald-400 transition-colors"
                    >
                      Unlock Full Report
                    </button>
                  </div>
                </div>

                {/* Blurred content behind */}
                <div className="opacity-40 blur-sm pointer-events-none select-none">
                  <div className="flex items-center justify-between mb-8 pb-8 border-b border-zinc-800">
                    <div>
                      <h2 className="text-3xl font-bold text-zinc-50">Conversion Audit</h2>
                      <p className="text-zinc-400">{url}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-black text-emerald-500">{preview.score}</div>
                      <div className="text-sm text-zinc-500 uppercase tracking-wider font-bold mt-1">Conversion Score</div>
                    </div>
                  </div>

                  <div className="space-y-6 text-left">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-50 flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        First Impression
                      </h3>
                      <p className="text-zinc-400 leading-relaxed">{preview.first_impression}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-6">
                      <div className="h-32 bg-zinc-800/50 rounded-xl"></div>
                      <div className="h-32 bg-zinc-800/50 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Features grid */}
          {!preview && (
            <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl tooltip-container">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">Deep UX Analysis</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  We identify confusing navigation, poor layout choices, and hidden CTAs that frustrate your visitors.
                </p>
                <div className="tooltip-content bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 text-left">
                  Our AI examines your DOM structure to find common friction points in the user journey.
                </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">Messaging & Value</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Get feedback on weak headlines, unclear value propositions, and messaging that fails to convert.
                </p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl tooltip-container">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-50 mb-2">Growth Recommendations</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Receive a prioritized list of immediate changes and advanced strategies to boost your conversion rate.
                </p>
                <div className="tooltip-content bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 text-left">
                  Get actionable steps ranked by impact and effort, so you know exactly what to fix first.
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
