import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { FileText, Trash2, ExternalLink, Plus, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [reports, setReports] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    
    const checkPaymentStatus = async () => {
      if (searchParams.get('payment') === 'success') {
        await refreshUser();
        navigate('/dashboard', { replace: true });
      }
    };

    if (searchParams.get('payment') === 'success') {
      checkPaymentStatus();
    }
  }, [user, loading, navigate, searchParams, refreshUser]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data } = await api.get('/api/reports');
        setReports(data);
      } catch (err) {
        setError('Failed to load reports');
      } finally {
        setFetching(false);
      }
    };

    if (user) fetchReports();
  }, [user]);

  const confirmDelete = async (id: string) => {
    try {
      await api.delete(`/api/reports/${id}`);
      setReports(reports.filter(r => r.id !== id));
      setDeletingId(null);
    } catch (err) {
      alert('Failed to delete report');
      setDeletingId(null);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="md:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-zinc-50 mb-2">Your Dashboard</h1>
          <p className="text-zinc-400 mb-6">
            Welcome back, {user?.email}.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="tooltip-container">
              <Link 
                to={user?.subscription_plan === 'free' && (user?.analysis_count || 0) >= 2 ? "/pricing" : "/"} 
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all transition-colors",
                  user?.subscription_plan === 'free' && (user?.analysis_count || 0) >= 2 
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                    : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                )}
              >
                <Plus className="w-5 h-5" />
                New Analysis
              </Link>
              
              {user?.subscription_plan === 'free' && (user?.analysis_count || 0) >= 2 && (
                <div className="tooltip-content top-full left-0 mt-2 w-48 p-3 text-center pointer-events-auto">
                  <p className="text-xs text-zinc-300 mb-2 font-medium">Monthly limit reached (2/2)</p>
                  <Link 
                    to="/pricing" 
                    className="block w-full py-1.5 bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider rounded-md text-center hover:bg-emerald-400 transition-colors pointer-events-auto"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              )}
            </div>
          </div>

          {user?.subscription_plan === 'free' && (
            <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Plus className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-50">Locked Version</h4>
                  <p className="text-sm text-zinc-400">You are on the Free plan. {2 - (user?.analysis_count || 0)} analyses left.</p>
                </div>
              </div>
              <Link 
                to="/pricing" 
                className="w-full sm:w-auto px-6 py-2 bg-emerald-500 text-zinc-950 rounded-lg font-bold text-sm hover:bg-emerald-400 transition-colors text-center"
              >
                Upgrade to Pro
              </Link>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold text-zinc-50 mb-6">Your Reports</h2>

      {reports.length === 0 ? (
        <div className="text-center py-24 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-50 mb-2">No reports yet</h3>
          <p className="text-zinc-400 mb-8">Analyze your first website to see the results here.</p>
          <Link 
            to="/" 
            className="bg-zinc-50 text-zinc-950 px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors"
          >
            Start Analysis
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors group relative flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-sm text-zinc-500 mb-1">
                    {new Date(report.created_at).toLocaleDateString()}
                  </div>
                  <h3 className="font-bold text-zinc-50 truncate max-w-[200px]" title={report.url}>
                    {report.url.replace(/^https?:\/\//, '')}
                  </h3>
                </div>
                <div className="tooltip-container">
                  <div className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full font-black text-lg cursor-help",
                    report.score >= 80 ? "bg-emerald-500/10 text-emerald-400" :
                    report.score >= 50 ? "bg-orange-500/10 text-orange-400" :
                    "bg-red-500/10 text-red-400"
                  )}>
                    {report.score}
                  </div>
                  <div className="tooltip-content bottom-full right-0 mb-2 w-32 text-center">
                    {report.score >= 80 ? 'Excellent' : report.score >= 50 ? 'Needs Work' : 'Poor'}
                  </div>
                </div>
              </div>
              
              <div className="mt-auto flex items-center justify-between pt-6 border-t border-zinc-800/50">
                {deletingId === report.id ? (
                  <div className="flex items-center gap-2 w-full justify-end">
                    <span className="text-sm text-zinc-400 mr-auto">Delete?</span>
                    <button 
                      onClick={() => setDeletingId(null)} 
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => confirmDelete(report.id)} 
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <>
                    <Link 
                      to={`/report/${report.id}`}
                      className="text-sm font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      View Report
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    
                    <button 
                      onClick={() => setDeletingId(report.id)}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10 opacity-0 group-hover:opacity-100"
                      title="Delete report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
