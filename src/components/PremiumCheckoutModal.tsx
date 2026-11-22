import React, { useEffect, useState } from 'react';
import { Check, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import { PremiumSubscription } from '../types/flux';

interface PremiumCheckoutModalProps {
  open: boolean;
  subscription: PremiumSubscription | null;
  defaultEmail?: string;
  onClose: () => void;
  onCompletePayment: (sub: PremiumSubscription) => void;
  onCancelSubscription: () => void;
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export const PremiumCheckoutModal: React.FC<PremiumCheckoutModalProps> = ({
  open,
  subscription,
  defaultEmail = '',
  onClose,
  onCompletePayment,
  onCancelSubscription,
}) => {
  const [plan, setPlan] = useState<'monthly' | 'lifetime'>('lifetime');
  const [method, setMethod] = useState<'card' | 'express'>('card');
  const [name, setName] = useState('Alex Mercer');
  const [email, setEmail] = useState(defaultEmail || 'user@example.com');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('08/29');
  const [cvc, setCvc] = useState('424');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, processing, onClose]);

  if (!open) return null;

  const amountLabel = plan === 'lifetime' ? '$29.00' : '$4.99 / mo';

  const submitCheckout = (isExpress: boolean) => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter a valid billing email address.');
      return;
    }

    let last4 = '8842';
    if (!isExpress) {
      const digits = cardNumber.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) {
        setError('Enter a valid 13–19 digit card number.');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        setError('Enter expiry in MM/YY format.');
        return;
      }
      if (!/^\d{3,4}$/.test(cvc)) {
        setError('Enter a 3 or 4 digit security code.');
        return;
      }
      if (!name.trim()) {
        setError('Enter the cardholder name.');
        return;
      }
      last4 = digits.slice(-4);
    }

    setProcessing(true);
    window.setTimeout(() => {
      const sub: PremiumSubscription = {
        active: true,
        plan,
        paidAt: new Date().toISOString(),
        transactionId: `TX-${Date.now().toString(36).toUpperCase()}`,
        amountLabel,
        cardLast4: last4,
        email: trimmedEmail,
      };
      setProcessing(false);
      onCompletePayment(sub);
    }, 900);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={() => !processing && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-modal-title"
    >
      <div
        className="w-full max-w-xl bg-[#0D1119] border border-[#1E293B] rounded-lg p-6 flex flex-col gap-5 text-slate-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#1E293B] pb-4">
          <div>
            <h2 id="premium-modal-title" className="text-xl font-semibold text-slate-100">
              {subscription?.active ? 'Flux Premium Active' : 'Upgrade to Flux Premium'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Unlock every laboratory, acoustic, offline caching, and preset feature.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            aria-label="Close checkout modal"
            className="p-2 rounded text-slate-400 hover:text-slate-100 hover:bg-[#161E2E] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Included Features */}
        <div className="grid sm:grid-cols-2 gap-2.5 text-xs bg-[#07090E] border border-[#1E293B] rounded p-3.5">
          {[
            'Ad-free playback (no voice ads after 5 songs)',
            'Lifetime offline song saving (no 12-day limit)',
            'Unlimited custom JSON configurations',
            'Full high-DPI PNG & JSON preset export',
          ].map((feat) => (
            <div key={feat} className="flex items-start gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {subscription?.active ? (
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-[#07090E] border border-emerald-500/40 rounded flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Payment Verified · All Features Unlocked</span>
                </span>
                <span className="font-mono text-slate-400">{subscription.transactionId}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1E293B] font-mono">
                <div>
                  <span className="text-slate-500">Plan:</span>{' '}
                  <span className="text-slate-200 capitalize">{subscription.plan}</span>
                </div>
                <div>
                  <span className="text-slate-500">Amount:</span>{' '}
                  <span className="text-slate-200">{subscription.amountLabel}</span>
                </div>
                <div>
                  <span className="text-slate-500">Card:</span>{' '}
                  <span className="text-slate-200">•••• {subscription.cardLast4}</span>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span>{' '}
                  <span className="text-slate-200 truncate">{subscription.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onCancelSubscription}
                className="px-3 py-2 text-xs font-medium rounded border border-[#1E293B] text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
              >
                Reset to Free Tier
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                Continue to Lab
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Plan Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPlan('monthly')}
                className={`p-3 rounded border text-left transition-colors cursor-pointer ${
                  plan === 'monthly'
                    ? 'bg-cyan-500/10 border-cyan-400 text-slate-100'
                    : 'bg-[#07090E] border-[#1E293B] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-medium">Monthly</div>
                <div className="font-mono text-base font-semibold text-slate-100 mt-0.5">
                  $4.99 <span className="text-xs font-normal text-slate-400">/ mo</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlan('lifetime')}
                className={`p-3 rounded border text-left transition-colors cursor-pointer ${
                  plan === 'lifetime'
                    ? 'bg-cyan-500/10 border-cyan-400 text-slate-100'
                    : 'bg-[#07090E] border-[#1E293B] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Lifetime Pass</span>
                  <span className="text-[10px] font-mono text-cyan-400">Best value</span>
                </div>
                <div className="font-mono text-base font-semibold text-slate-100 mt-0.5">
                  $29.00 <span className="text-xs font-normal text-slate-400">once</span>
                </div>
              </button>
            </div>

            {/* Payment Method Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#07090E] border border-[#1E293B] rounded">
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  method === 'card'
                    ? 'bg-[#162032] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Credit / Debit Card</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('express')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                  method === 'express'
                    ? 'bg-[#162032] text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Express Pay</span>
              </button>
            </div>

            {method === 'card' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitCheckout(false);
                }}
                className="flex flex-col gap-3"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Cardholder Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-[#07090E] border border-[#1E293B] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Billing Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-[#07090E] border border-[#1E293B] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                      placeholder="you@domain.com"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">Card Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="bg-[#07090E] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                    placeholder="4242 4242 4242 4242"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      className="bg-[#07090E] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                      placeholder="MM/YY"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400">CVC</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cvc}
                      onChange={(e) =>
                        setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))
                      }
                      className="bg-[#07090E] border border-[#1E293B] rounded px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                      placeholder="424"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-rose-400 font-medium">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={processing}
                  className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {processing ? 'Processing Payment…' : `Pay ${amountLabel}`}
                  </span>
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">Receipt Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#07090E] border border-[#1E293B] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                {error && (
                  <p className="text-xs text-rose-400 font-medium">{error}</p>
                )}
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => submitCheckout(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {processing
                      ? 'Authorizing Express Pay…'
                      : `Pay ${amountLabel} via Express Pay`}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
