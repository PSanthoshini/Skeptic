import React, { useState } from 'react';
import { Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Pricing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setLoading(plan);
    try {
      const { data } = await api.post('/api/razorpay/create-subscription', { plan });
      
      const options = {
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'Skeptic',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
        image: '/logo.png',
        handler: async (response: any) => {
          try {
            await api.post('/api/razorpay/verify-payment', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              plan
            });
            window.location.href = '/dashboard?payment=success';
          } catch (error) {
            console.error('Payment verification failed:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.name || '',
          email: user.email || '',
        },
        theme: {
          color: '#10b981',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error('Failed to create subscription:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      id: 'free',
      price: '$0',
      description: 'Perfect for getting started and testing the waters.',
      features: [
        '2 website analyses per month',
        'Basic conversion score',
        'Limited recommendations',
        'Access to dashboard history'
      ],
      cta: 'Current Plan',
      highlighted: false
    },
    {
      name: 'Pro',
      id: 'pro',
      price: '$19',
      interval: '/month',
      description: 'The sweet spot for growing individual websites.',
      features: [
        'Unlimited website analyses',
        'Full AI conversion report',
        'Advanced optimization recommendations',
        'Downloadable PDF report',
        'Priority analysis speed'
      ],
      cta: 'Upgrade to Pro',
      highlighted: true
    },
    {
      name: 'Agency',
      id: 'agency',
      price: '$49',
      interval: '/month',
      description: 'Power features for professionals handling multiple clients.',
      features: [
        'Everything in Pro',
        'Unlimited analyses',
        'Competitor comparison',
        'Team access',
        'Export reports',
        'Advanced growth suggestions'
      ],
      cta: 'Go Agency',
      highlighted: false
    }
  ];

  return (
    <div className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Simple, Transparent Pricing
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Choose the plan that's right for you. Boost your conversion rates with AI-powered insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`relative rounded-2xl p-8 border transition-all duration-300 ${
              plan.highlighted 
                ? 'bg-zinc-900 border-emerald-500/50 shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)] scale-105 z-10' 
                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </span>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.interval && <span className="text-zinc-500">{plan.interval}</span>}
              </div>
              <p className="text-zinc-400 text-sm mt-4">{plan.description}</p>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => plan.id !== 'free' && handleUpgrade(plan.id)}
              disabled={loading === plan.id || (user?.subscription_plan === plan.id) || (plan.id === 'free')}
              className={`w-full py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                user?.subscription_plan === plan.id
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : plan.highlighted
                  ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-50 hover:bg-zinc-700'
              }`}
            >
              {loading === plan.id ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {user?.subscription_plan === plan.id ? 'Current Plan' : plan.cta}
                  {plan.id !== 'free' && user?.subscription_plan !== plan.id && <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center justify-center gap-4 text-zinc-500 text-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500/50" />
          <span>Secure payments powered by Razorpay</span>
        </div>
        <div className="flex gap-4">
          <img src="https://razorpay.com/assets/razorpay-logo-white.svg" alt="Razorpay" className="h-6 opacity-50" />
        </div>
      </div>
    </div>
  );
}
