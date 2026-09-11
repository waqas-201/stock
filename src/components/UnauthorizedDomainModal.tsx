import React, { useState } from 'react';
import {
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Zap,
  LogIn,
  X,
  Database,
  Info,
} from 'lucide-react';
import { getFirebaseProjectId } from '../lib/firebase';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  onRetryGoogleSignIn: () => void;
  onQuickConnect: () => void;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  domain,
  onRetryGoogleSignIn,
  onQuickConnect,
}) => {
  const [copied, setCopied] = useState(false);
  const projectId = getFirebaseProjectId();
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  if (!isOpen) return null;

  const currentHost =
    domain ||
    (typeof window !== 'undefined' ? window.location.hostname : 'your-app-domain.run.app');

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentHost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-domain-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="auth-domain-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight"
              >
                Domain Authorization Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Firebase security requires authorizing your app's web domain for Google Sign-In.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Connect Alternative Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Instant Access: Connect Cloud DB Right Now
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                  Connect without domain setup using Quick Team Pass. Full Firestore database sync enabled immediately!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onQuickConnect();
                onClose();
              }}
              className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Connect Now (Quick Pass)</span>
            </button>
          </div>

          {/* Domain Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Domain to Authorize in Firebase Console
            </label>
            <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <code className="text-xs sm:text-sm font-mono text-emerald-800 truncate flex-1 font-semibold select-all">
                {currentHost}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Domain</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Easy 3-Step Setup (Takes 30 seconds):</span>
            </h3>
            <ol className="space-y-2 text-xs sm:text-sm text-slate-700 list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Click <strong>Copy Domain</strong> above to copy your current app URL.
              </li>
              <li className="leading-relaxed">
                Click the button below to open Firebase Authentication <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.
              </li>
              <li className="leading-relaxed">
                Click <strong>Add domain</strong>, paste the domain, click <strong>Save</strong>, then return here!
              </li>
            </ol>

            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
              <a
                href={consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs"
              >
                <span>Open Firebase Authorized Domains</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>
          </div>

          {/* Local storage note */}
          <p className="text-xs text-slate-500 leading-relaxed">
            💡 <strong>Note:</strong> All your current items and changes are safely stored in your browser's local cache. You can also export to Excel or CSV at any time.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50/80 border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer text-center"
          >
            Continue with Local Storage
          </button>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onRetryGoogleSignIn();
                onClose();
              }}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Retry Google Sign-In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
