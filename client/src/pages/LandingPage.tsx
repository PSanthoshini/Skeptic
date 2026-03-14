import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { ArrowRight, Loader2, AlertTriangle, Search, Zap, Target, TrendingUp, CheckCircle, Shield, Users, BarChart } from 'lucide-react';
import { SEO } from '../components/SEO';

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

    // Visual loading steps solely for user experience
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => prev < 3 ? prev + 1 : prev); // Max fake step before completion
    }, 4000);

    try {
      // 1. Add job to background queue
      const startRes = await api.post('/api/analyze/start', { 
        url: targetUrl, 
        userId: user?.id 
      });
      const { jobId } = startRes.data;

      // 2. Recursively poll status every 3 seconds
      const pollStatus = async () => {
        try {
          const res = await api.get(`/api/analyze/status/${jobId}`);
          const data = res.data;
          
          if (data.status === 'completed') {
            clearInterval(stepInterval);
            setLoading(false);
            setLoadingStep(0);
            
            if (user && data.result?.reportId) {
              navigate(`/report/${data.result.reportId}`);
            } else {
              setPreview({
                score: data.result.analysis.score,
                first_impression: data.result.analysis.first_impression,
                preview: true,
                message: 'Create an account to unlock your full conversion analysis.'
              });
            }
          } else if (data.status === 'failed') {
            clearInterval(stepInterval);
            setLoading(false);
            setLoadingStep(0);
            setError(data.error || 'Failed to analyze website.');
          } else {
            // Still pending or processing, wait and poll again
            setTimeout(pollStatus, 3000); 
          }
        } catch (err: any) {
          clearInterval(stepInterval);
          setLoading(false);
          setLoadingStep(0);
          setError('Lost connection to analysis queue. Please try again.');
        }
      };

      // Start polling
      setTimeout(pollStatus, 3000);

    } catch (err: any) {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep(0);
      
      let errorMessage = err.response?.data?.error || err.message || 'Failed to start analysis.';
      if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('monthly limit reached')) {
        navigate('/pricing');
        return;
      }
      setError(errorMessage);
    }
  };

  return (
    <>
      <SEO 
        title="Skeptic | Website Conversion Audits" 
        description="AI tool that analyzes websites and finds UX, SEO, and conversion problems to improve performance. Uncover hidden issues and turn more visitors into paying customers."
      />
      
      <div className="relative overflow-hidden min-h-screen bg-zinc-950 flex flex-col items-center">
        {/* Background gradients */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

        <main className="w-full flex-grow relative z-10 space-y-32 pb-32">
          
          {/* HERO SECTION */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 mb-8 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Trusted by 10,000+ businesses</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-50 mb-6 leading-tight">
                Turn More Visitors Into <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  Paying Customers
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-zinc-400 mb-10 max-w-3xl mx-auto font-medium">
                Discover the hidden UX, SEO, and messaging mistakes killing your conversions. Get an instant, AI-powered audit of your website.
              </p>

              <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto space-y-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
                  <div className="relative flex flex-col md:flex-row items-center bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-2xl p-2 shadow-2xl transition-all">
                    <div className="hidden md:flex pl-4 pr-2 text-zinc-500">
                      <Search className="w-6 h-6" />
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste your website URL (e.g., razorpay.com)"
                      className="flex-1 w-full bg-transparent border-none focus:outline-none text-zinc-100 placeholder:text-zinc-600 py-4 px-4 md:px-0 text-lg"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full md:w-auto mt-2 md:mt-0 bg-emerald-500 text-zinc-950 px-8 py-4 rounded-xl font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[200px]"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {loadingStep === 1 && 'Fetching...'}
                          {loadingStep === 2 && 'Extracting...'}
                          {loadingStep === 3 && 'Analyzing...'}
                          {loadingStep >= 4 && 'Generating...'}
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
                  <motion.p 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-red-400 text-sm mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20"
                  >
                    {error}
                  </motion.p>
                )}
                
                <p className="text-zinc-500 text-sm mt-4 flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" /> Secure & private analysis. No credit card required.
                </p>
              </form>

            </motion.div>
          </section>

          {/* ANALYSIS PREVIEW (If generated) */}
          {preview && !user && (
            <section className="px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="relative rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 md:p-10 overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 backdrop-blur-sm z-10 flex flex-col items-center justify-center bg-zinc-950/70">
                    <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl text-center max-w-md shadow-2xl">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-zinc-50 mb-4">Analysis Complete!</h3>
                      <p className="text-zinc-400 mb-8 leading-relaxed">
                        {preview.message}
                      </p>
                      <button
                        onClick={() => navigate('/signup')}
                        className="w-full bg-emerald-500 text-zinc-950 font-bold py-4 rounded-xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        Unlock Full Report
                      </button>
                    </div>
                  </div>

                  <div className="opacity-30 blur-sm pointer-events-none select-none">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-8 border-b border-zinc-800 gap-4">
                      <div>
                        <h2 className="text-3xl font-bold text-zinc-50">Conversion Audit</h2>
                        <p className="text-zinc-400 font-mono mt-1">{url}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <div className="text-6xl font-black text-emerald-500">{preview.score}</div>
                        <div className="text-sm text-zinc-500 uppercase tracking-widest font-bold mt-2">Score</div>
                      </div>
                    </div>

                    <div className="space-y-8 text-left">
                      <div>
                        <h3 className="text-xl font-bold text-zinc-50 flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-6 h-6 text-orange-500" />
                          First Impression Analysis
                        </h3>
                        <p className="text-zinc-400 leading-relaxed text-lg">{preview.first_impression}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-800/50">
                        <div className="h-40 bg-zinc-800/50 rounded-2xl border border-zinc-700/50"></div>
                        <div className="h-40 bg-zinc-800/50 rounded-2xl border border-zinc-700/50"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>
          )}

          {/* VALUE PROPOSITION / FEATURES */}
          {!preview && (
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-zinc-50 mb-4">Why Websites Lose Money</h2>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                  Stop guessing why visitors aren't converting. Our AI detects the crucial elements you're missing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                {/* Feature 1 */}
                <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all p-8 rounded-3xl shadow-lg">
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                    <Search className="w-7 h-7 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-50 mb-3">Deep UX Analysis</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    We identify confusing navigation, poor layout choices, and hidden CTAs that frustrate your visitors and increase bounce rates.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all p-8 rounded-3xl shadow-lg">
                  <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-50 mb-3">Messaging & Value</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Get instant feedback on weak headlines, unclear value propositions, and copywriting that fails to convince users to take action.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all p-8 rounded-3xl shadow-lg">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                    <BarChart className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-50 mb-3">Growth Recommendations</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Receive a prioritized roadmap of immediate quick-wins and advanced strategic changes to systematically boost your conversion rate.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* HOW IT WORKS */}
          {!preview && (
             <section className="bg-zinc-900/50 border-y border-zinc-800 py-24">
               <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                 <h2 className="text-3xl md:text-4xl font-bold text-zinc-50 mb-16">How Skeptic Works</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                    <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" />
                    
                    <div className="relative z-10">
                      <div className="w-24 h-24 mx-auto bg-zinc-950 border-2 border-zinc-800 rounded-full flex items-center justify-center text-3xl font-black text-emerald-500 mb-6 shadow-xl">1</div>
                      <h3 className="text-xl font-bold text-zinc-50 mb-3">Enter Your URL</h3>
                      <p className="text-zinc-400">Paste your website link. No installation or coding required.</p>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="w-24 h-24 mx-auto bg-zinc-950 border-2 border-emerald-500/50 rounded-full flex items-center justify-center text-3xl font-black text-emerald-500 mb-6 shadow-xl shadow-emerald-500/20">2</div>
                      <h3 className="text-xl font-bold text-zinc-50 mb-3">AI Analysis</h3>
                      <p className="text-zinc-400">Our crawler analyzes your DOM structure, copy, and performance in seconds.</p>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="w-24 h-24 mx-auto bg-zinc-950 border-2 border-zinc-800 rounded-full flex items-center justify-center text-3xl font-black text-emerald-500 mb-6 shadow-xl">3</div>
                      <h3 className="text-xl font-bold text-zinc-50 mb-3">Apply Fixes</h3>
                      <p className="text-zinc-400">Get a detailed report with actionable steps to improve your conversion rate.</p>
                    </div>
                 </div>
                 
                 <div className="mt-16">
                  <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-2 text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
                    Start Your Free Audit <ArrowRight className="w-4 h-4" />
                  </button>
                 </div>
               </div>
             </section>
          )}

          {/* FINAL CTA */}
          {!preview && (
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-16">
              <div className="bg-gradient-to-br from-emerald-900/40 to-zinc-900 border border-emerald-500/20 rounded-3xl p-10 md:p-16 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
                <h2 className="text-3xl md:text-5xl font-bold text-zinc-50 mb-6 relative z-10">Ready to Increase Sales?</h2>
                <p className="text-xl text-zinc-300 mb-10 max-w-2xl mx-auto relative z-10">
                  Stop losing customers to poor UX and confusing copy. Find out exactly what to fix in the next 60 seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                  <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-full sm:w-auto bg-emerald-500 text-zinc-950 px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/25"
                  >
                    Analyze My Website
                  </button>
                  <button 
                    onClick={() => navigate('/pricing')}
                    className="w-full sm:w-auto bg-transparent text-zinc-50 border border-zinc-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition-all"
                  >
                    View Pricing
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
