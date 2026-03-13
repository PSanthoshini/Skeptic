import React, { useState } from 'react';
import { CreditCard, ExternalLink, Settings, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Billing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/stripe/create-portal-session', {});
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      alert('Failed to open billing portal. If you are on the FREE plan, you do not have a billing customer yet.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-zinc-400">Manage your plan, payment methods, and billing history.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Current Plan Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CreditCard className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold capitalize">{user?.subscription_plan || 'Free'} Plan</h2>
                  <p className="text-sm text-zinc-500">Status: <span className="text-emerald-500 capitalize">{user?.subscription_status || 'Active'}</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {user?.subscription_plan === 'pro' ? '$19' : user?.subscription_plan === 'agency' ? '$49' : '$0'}
                  <span className="text-sm font-normal text-zinc-500">/mo</span>
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span>Next billing date: {user?.subscription_plan === 'free' ? 'None' : 'Calculated by Stripe'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                <span>Subscribed since: {formatDate(user?.subscription_start_date)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleManageSubscription}
                disabled={loading || user?.subscription_plan === 'free'}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-50 py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Manage Subscription
                  </>
                )}
              </button>
              
              {user?.subscription_plan === 'free' && (
                <a
                  href="/pricing"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3 px-6 rounded-xl font-medium transition-all duration-200 text-center"
                >
                  Upgrade Now
                </a>
              )}
            </div>
          </div>
          
          <div className="bg-zinc-950/50 border-t border-zinc-800 p-6">
            <p className="text-xs text-zinc-500 text-center">
              Subscriptions are managed securely via Stripe. You can cancel at any time.
            </p>
          </div>
        </div>

        {/* Usage Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            Usage This Period
          </h3>
          
          <div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-zinc-400">Website Analyses</span>
              <span className="text-zinc-50 font-medium">
                {user?.analysis_count || 0} / {user?.subscription_plan === 'free' ? '2' : '∞'}
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ 
                  width: user?.subscription_plan === 'free' 
                    ? `${Math.min(((user?.analysis_count || 0) / 2) * 100, 100)}%` 
                    : '20%' 
                }}
              />
            </div>
            {user?.subscription_plan === 'free' && (user?.analysis_count || 0) >= 2 && (
              <p className="text-xs text-amber-500 mt-2">
                You've reached your monthly limit. Upgrade to continue.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
