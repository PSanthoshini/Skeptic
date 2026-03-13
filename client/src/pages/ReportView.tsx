import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Download, ArrowLeft, CheckCircle2, AlertTriangle, Zap, Target, Search, Layout, FileText, ExternalLink, Lock, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function ReportView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report && searchParams.get('print') === 'true') {
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [report, searchParams]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const { data } = await api.get(`/api/reports/${id}`);
        setReport(data);
      } catch (err) {
        setError('Report not found or you do not have permission to view it.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const handleDownloadPDF = () => {
    if (user?.subscription_plan === 'free') return;
    
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch (e) {
      inIframe = true;
    }

    if (inIframe) {
      const url = new URL(window.location.href);
      url.searchParams.set('print', 'true');
      const newWindow = window.open(url.toString(), '_blank');
      if (!newWindow) alert("Please allow popups to download the PDF.");
    } else {
      window.print();
    }
  };



  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-50 mb-2">Error</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <Link to="/" className="text-emerald-400 hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const analysis = report.full_analysis ? JSON.parse(report.full_analysis) : {
    score: report.score,
    first_impression: report.clarity,
    value_proposition: "Not available in older reports.",
    ux_problems: [{ issue: report.ux, explanation: "Legacy report format." }],
    messaging_problems: [{ issue: report.copywriting, original: "N/A", suggested_improvement: "N/A" }],
    seo_issues: [report.seo],
    trust_signals: [],
    conversion_blockers: [{ issue: report.conversion, explanation: "Legacy report format." }],
    quick_wins: typeof report.quick_wins === 'string' ? JSON.parse(report.quick_wins) : report.quick_wins,
    advanced_recommendations: [report.competitor_advice]
  };

  const renderList = (items: string[], icon: React.ReactNode, colorClass: string, bgClass: string) => {
    if (!items || items.length === 0) return null;
    return (
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-4">
            <span className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm", bgClass, colorClass)}>
              {icon || (i + 1)}
            </span>
            <span className="text-zinc-300 leading-relaxed pt-1">{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderObjectList = (items: any[], icon: React.ReactNode, colorClass: string, bgClass: string, type: 'ux' | 'messaging' | 'conversion') => {
    if (!items || items.length === 0) return null;
    return (
      <ul className="space-y-6">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-4">
            <span className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mt-1", bgClass, colorClass)}>
              {icon || (i + 1)}
            </span>
            <div className="flex-1 space-y-2">
              <h4 className="text-zinc-50 font-semibold text-lg">{item.issue}</h4>
              {type === 'messaging' && item.original && item.suggested_improvement && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Original</div>
                    <p className="text-zinc-300 text-sm italic">"{item.original}"</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Suggested</div>
                    <p className="text-zinc-50 text-sm font-medium">"{item.suggested_improvement}"</p>
                  </div>
                </div>
              )}
              {(type === 'ux' || type === 'conversion') && item.explanation && (
                <p className="text-zinc-400 leading-relaxed">{item.explanation}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 print:p-0 print:m-0 print:max-w-none">
      <div className="flex items-center justify-between mb-8 print:hidden">
        <Link to="/dashboard" className="text-zinc-400 hover:text-zinc-50 flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-4">

          <div className="tooltip-container">
            <button
              onClick={handleDownloadPDF}
              disabled={user?.subscription_plan === 'free'}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors relative",
                user?.subscription_plan === 'free' ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
              )}
            >
              {user?.subscription_plan === 'free' ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              Download PDF
            </button>
            
            {user?.subscription_plan === 'free' && (
              <div className="tooltip-content bottom-full right-0 mb-2 w-48 p-3 text-center pointer-events-auto">
                <p className="text-xs text-zinc-300 mb-2 font-medium">Upgrade to Pro to download PDF reports</p>
                <Link 
                  to="/pricing" 
                  className="block w-full py-1.5 bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-md text-center hover:bg-emerald-400 transition-colors"
                >
                  Upgrade Now
                </Link>
                <div className="absolute top-full right-6 w-2 h-2 bg-zinc-900 border-r border-b border-zinc-800 rotate-45 -mt-1"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={reportRef} className="bg-zinc-950 text-zinc-50 p-8 md:p-12 rounded-3xl border border-zinc-800 relative overflow-hidden print:border-none print:rounded-none print:p-0 print:shadow-none">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-12 border-b border-zinc-800/50">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 mb-6 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              The Skeptic's Site Audit
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-zinc-50 mb-4 tracking-tight">Website Audit Report</h1>
            <div className="flex items-center gap-4 mt-6">
              <img src={`https://logo.clearbit.com/${new URL(report.url).hostname}`} alt="Favicon" className="w-8 h-8 rounded-md bg-zinc-800" onError={(e) => e.currentTarget.style.display = 'none'} />
              <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-xl text-emerald-400 hover:underline flex items-center gap-2">
                {report.url}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="mt-8 md:mt-0 text-right">
            <div className={cn("text-7xl font-black mb-2", analysis.score >= 80 ? "text-emerald-400" : analysis.score >= 50 ? "text-orange-400" : "text-red-400")}>
              {analysis.score}
            </div>
            <div className="flex items-center justify-end gap-2 group relative">
              <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Conversion Score</div>
              <div className="tooltip-container">
                <Info className="w-4 h-4 text-zinc-600 hover:text-zinc-400 cursor-help transition-colors" />
                <div className="tooltip-content bottom-full right-0 mb-2 w-64 text-left font-normal normal-case tracking-normal">
                  This score (0-100) represents how ready your website is to convert visitors into customers based on AI analysis of your UX, messaging, and trust signals.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
          <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <div className="ml-4 text-xs font-mono text-zinc-500 bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800 flex-1 max-w-md truncate">{report.url}</div>
          </div>
          <img src={`https://image.thum.io/get/width/1200/crop/800/${report.url}`} alt="Website Snapshot" className="w-full h-auto object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
        </div>

        <div className="space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Target className="w-5 h-5 text-blue-400" /></div>
                First Impression
              </h2>
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 md:p-8 rounded-2xl h-full"><p className="text-lg text-zinc-300 leading-relaxed">{analysis.first_impression}</p></div>
            </section>
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center"><Zap className="w-5 h-5 text-indigo-400" /></div>
                Value Proposition
              </h2>
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 md:p-8 rounded-2xl h-full"><p className="text-lg text-zinc-300 leading-relaxed">{analysis.value_proposition}</p></div>
            </section>
          </div>

          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"><Layout className="w-5 h-5 text-purple-400" /></div>
              UX Problems
            </h2>
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 md:p-8 rounded-2xl">
              {renderObjectList(analysis.ux_problems, <AlertTriangle className="w-4 h-4" />, "text-purple-400", "bg-purple-500/20", "ux")}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center"><FileText className="w-5 h-5 text-orange-400" /></div>
              Messaging & Copywriting
            </h2>
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 md:p-8 rounded-2xl">
              {renderObjectList(analysis.messaging_problems, <AlertTriangle className="w-4 h-4" />, "text-orange-400", "bg-orange-500/20", "messaging")}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center"><Zap className="w-5 h-5 text-rose-400" /></div>
              Conversion Blockers
            </h2>
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 md:p-8 rounded-2xl">
              {renderObjectList(analysis.conversion_blockers, <AlertTriangle className="w-4 h-4" />, "text-rose-400", "bg-rose-500/20", "conversion")}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center"><Search className="w-5 h-5 text-cyan-400" /></div>
                SEO Analysis
              </h2>
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl h-full">
                {renderList(analysis.seo_analysis || analysis.seo_issues, <AlertTriangle className="w-4 h-4" />, "text-cyan-400", "bg-cyan-500/20")}
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-blue-400" /></div>
                Trust Signals
              </h2>
              <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl h-full">
                {renderList(analysis.trust_signals, <CheckCircle2 className="w-4 h-4" />, "text-blue-400", "bg-blue-500/20")}
              </div>
            </section>
          </div>

          <section>
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>
              5 Quick Fixes
            </h2>
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 md:p-8 rounded-2xl">
              {renderList(analysis.quick_wins || analysis.quick_fixes, null, "text-emerald-400", "bg-emerald-500/20")}
            </div>
          </section>

          <section className="relative group">
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"><Target className="w-5 h-5 text-zinc-400" /></div>
              Advanced Recommendations
            </h2>
            <div className={cn("bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl transition-all duration-500", user?.subscription_plan === 'free' && "blur-md select-none pointer-events-none opacity-50")}>
              {renderList(analysis.advanced_recommendations, <Target className="w-4 h-4" />, "text-zinc-400", "bg-zinc-800")}
            </div>
            {user?.subscription_plan === 'free' && (
              <div className="absolute inset-0 flex items-center justify-center z-10 px-6 pt-16">
                <div className="bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm p-8 rounded-2xl text-center max-w-sm shadow-2xl transition-transform duration-300 group-hover:scale-105">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Lock className="w-6 h-6 text-emerald-500" /></div>
                  <h3 className="text-xl font-bold text-zinc-50 mb-2">Unlock Full Report</h3>
                  <p className="text-zinc-400 mb-6 text-sm">Advanced optimization suggestions are only available for Pro and Agency members.</p>
                  <Link to="/pricing" className="inline-block bg-emerald-500 text-zinc-950 px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-colors">Upgrade Now</Link>
                </div>
              </div>
            )}
          </section>

          <section className="relative group">
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center"><Search className="w-5 h-5 text-cyan-400" /></div>
              Competitor Comparison
            </h2>
            <div className={cn("bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-2xl transition-all duration-500", user?.subscription_plan !== 'agency' && "blur-md select-none pointer-events-none opacity-50")}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-zinc-50 mb-4">Your Site</h4>
                  <ul className="space-y-2 text-sm text-zinc-400"><li>• Industry standard value prop</li><li>• Clear navigation hierarchy</li><li>• Mobile responsive design</li></ul>
                </div>
                <div>
                  <h4 className="font-bold text-zinc-50 mb-4">Main Competitors</h4>
                  <ul className="space-y-2 text-sm text-zinc-400"><li>• Better social proof placement</li><li>• Faster checkout experience</li><li>• More aggressive discounting</li></ul>
                </div>
              </div>
            </div>
            {user?.subscription_plan !== 'agency' && (
              <div className="absolute inset-0 flex items-center justify-center z-10 px-6 pt-16">
                <div className="bg-zinc-950/80 border border-zinc-800 backdrop-blur-sm p-8 rounded-2xl text-center max-w-sm shadow-2xl transition-transform duration-300 group-hover:scale-105">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4"><Lock className="w-6 h-6 text-cyan-400" /></div>
                  <h3 className="text-xl font-bold text-zinc-50 mb-2">Agency Only Feature</h3>
                  <p className="text-zinc-400 mb-6 text-sm">Detailed competitor benchmarks and comparisons are only available on the Agency plan.</p>
                  <Link to="/pricing" className="inline-block bg-cyan-500 text-zinc-950 px-6 py-2 rounded-xl font-bold text-sm hover:bg-cyan-400 transition-colors">Upgrade to Agency</Link>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="mt-20 pt-8 border-t border-zinc-800/50 text-center text-zinc-500 text-sm">
          Generated by Skeptic • {new Date(report.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
