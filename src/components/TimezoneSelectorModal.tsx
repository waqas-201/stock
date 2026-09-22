import React, { useState, useEffect } from 'react';
import {
  Clock,
  Globe,
  Check,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  SUPPORTED_TIMEZONES,
  useActiveTimezone,
  formatLocalDateTime,
} from '../lib/dateUtils';

interface TimezoneSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const TimezoneSelectorModal: React.FC<TimezoneSelectorModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { timezone, resolvedTimezone, timezoneAbbr, setTimezone } = useActiveTimezone();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep live clock ticking every second when open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTimezone = (tzId: string, name: string) => {
    setTimezone(tzId);
    if (onShowToast) {
      onShowToast(`Timezone synchronized to ${name}`, 'success');
    }
  };

  return (
    <div
      id="timezone-selector-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="timezone-selector-modal-card"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <Clock className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Timezone & Date Sync</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                  Live
                </span>
              </h2>
              <p className="text-xs text-emerald-100">
                Synchronize stock logs, 'Today' buttons, and audit timestamps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Live Time Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Current Synced System Clock</span>
            <span className="text-emerald-700 font-mono font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              {timezoneAbbr}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight font-mono">
            {formatLocalDateTime(currentTime, timezone, true)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              Active Zone: <strong className="text-slate-700">{resolvedTimezone}</strong>
            </span>
          </div>
        </div>

        {/* Quick Sync Notice */}
        <div className="px-5 pt-3 pb-1">
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Eliminate Off-By-One Day Discrepancies:</span>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Selecting <strong>Pakistan Standard Time (PKT)</strong> or <strong>Malaysia Time (MYT)</strong> locks all '+ Today' production date stamps, filters, and activity records strictly to your local day, preventing UTC midnight shifts.
              </p>
            </div>
          </div>
        </div>

        {/* Supported Timezones List */}
        <div className="p-5 space-y-2 max-h-[50vh] overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Select Your Region
          </div>

          {SUPPORTED_TIMEZONES.map((tz) => {
            const isSelected = timezone === tz.id;
            const isSpecialTarget = tz.id === 'Asia/Karachi' || tz.id === 'Asia/Kuala_Lumpur';

            return (
              <button
                key={tz.id}
                type="button"
                onClick={() => handleSelectTimezone(tz.id, tz.name)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-50/90 border-emerald-500 shadow-2xs'
                    : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{tz.country}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {tz.name}
                      </span>
                      {isSpecialTarget && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded border border-emerald-300">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Offset: {tz.offset}</span>
                      <span>•</span>
                      <span>Code: {tz.abbr}</span>
                      {tz.id !== 'auto' && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-600">
                            {formatLocalDateTime(currentTime, tz.id, false)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-slate-300 hover:border-slate-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Changes take effect instantly</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const TimezonePill: React.FC<{
  onOpenModal: () => void;
  className?: string;
}> = ({ onOpenModal, className = '' }) => {
  const { timezone, timezoneAbbr } = useActiveTimezone();

  const isSpecial = timezone === 'Asia/Karachi' || timezone === 'Asia/Kuala_Lumpur';

  return (
    <button
      id="btn-header-timezone-pill"
      type="button"
      onClick={onOpenModal}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
        isSpecial
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
      } ${className}`}
      title={`Timezone: ${timezoneAbbr}. Click to synchronize local Pakistani / Malaysian time`}
    >
      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="font-mono font-bold text-[11px]">{timezoneAbbr}</span>
      <span className="text-[10px] text-slate-500 hidden sm:inline">Sync</span>
    </button>
  );
};
