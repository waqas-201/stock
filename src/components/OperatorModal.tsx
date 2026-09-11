import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  User,
  Shield,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { OperatorProfile } from '../types';
import type { User as FirebaseUser } from '../lib/firebase';

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOperator?: OperatorProfile;
  currentProfile?: OperatorProfile;
  onSaveOperator?: (operator: OperatorProfile) => void;
  onSave?: (operator: OperatorProfile) => void;
  currentUser?: FirebaseUser | null;
}

const PRESET_ROLES = [
  'Store Manager',
  'Warehouse Staff',
  'Receiving Clerk',
  'Dispatch Team',
  'Inventory Auditor',
];

const DEFAULT_OPERATOR: OperatorProfile = {
  name: 'Waqas (Admin)',
  email: 'waqasvu892@gmail.com',
  role: 'Administrator',
};

export const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  onClose,
  currentOperator,
  currentProfile,
  onSaveOperator,
  onSave,
  currentUser,
}) => {
  const activeOp = currentOperator || currentProfile || DEFAULT_OPERATOR;
  const activeName = activeOp?.name || 'Waqas (Admin)';
  const activeRole = activeOp?.role || 'Administrator';

  const [name, setName] = useState(activeName);
  const [role, setRole] = useState(activeRole);

  useEffect(() => {
    if (isOpen) {
      const op = currentOperator || currentProfile || DEFAULT_OPERATOR;
      setName(op?.name || 'Waqas (Admin)');
      setRole(op?.role || 'Administrator');
    }
  }, [isOpen, currentOperator, currentProfile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const op = currentOperator || currentProfile || DEFAULT_OPERATOR;
    const updatedProfile: OperatorProfile = {
      name: trimmed,
      email: currentUser?.email || op?.email || '',
      photoURL: currentUser?.photoURL || op?.photoURL,
      role: role.trim() || 'Administrator',
    };

    if (onSaveOperator) {
      onSaveOperator(updatedProfile);
    } else if (onSave) {
      onSave(updatedProfile);
    }
    onClose();
  };

  const setGoogleName = () => {
    if (currentUser?.displayName) {
      setName(currentUser.displayName);
    } else if (currentUser?.email) {
      setName(currentUser.email.split('@')[0]);
    }
  };

  return (
    <div
      id="operator-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="operator-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="operator-modal-title"
        className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="operator-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate"
              >
                Who is Modifying Stock?
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Active Staff & Attribution Profile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Plain English Banner for Laymen */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-900 leading-relaxed">
              Every time you add stock, change quantities, edit items, or delete
              items, this name will be permanently stamped in the activity
              trail so all team members and clients know who did it.
            </p>
          </div>

          {/* Operator Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="operator-name-input"
              className="text-xs font-bold text-slate-700 uppercase tracking-wider block"
            >
              Your Name or Station
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="operator-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Waqas, Ali (Receiving), Desk 1"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Quick Google Account Name Shortcut */}
          {currentUser && (
            <button
              type="button"
              onClick={setGoogleName}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Use Google Account Name (
                {currentUser.displayName || currentUser.email?.split('@')[0]})
              </span>
            </button>
          )}

          {/* Quick Presets / Roles */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Quick Role / Desk Preset
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ROLES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setRole(preset);
                    if (!name.includes(preset)) {
                      // If name is just default, suggest preset
                      if (name === 'Store Operator' || name === 'Staff Member') {
                        setName(preset);
                      }
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    role === preset
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="min-h-[40px] px-5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Active Staff</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
