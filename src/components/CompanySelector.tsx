import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CompanyProfile, StockItem } from '../types';

interface CompanySelectorProps {
  companies: CompanyProfile[];
  activeCompanyId: string; // 'all' or specific company id
  onSelectCompany: (companyId: string) => void;
  onOpenManageModal?: () => void;
  onManageCompanies?: () => void;
  items?: StockItem[];
  compact?: boolean;
}

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', ring: 'ring-emerald-500' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-700', ring: 'ring-blue-500' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-700', ring: 'ring-indigo-500' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-700', ring: 'ring-violet-500' },
  amber: { bg: 'bg-amber-600', text: 'text-amber-700', ring: 'ring-amber-500' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-700', ring: 'ring-rose-500' },
  cyan: { bg: 'bg-cyan-600', text: 'text-cyan-700', ring: 'ring-cyan-500' },
  slate: { bg: 'bg-slate-700', text: 'text-slate-700', ring: 'ring-slate-500' },
};

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies = [],
  activeCompanyId = 'all',
  onSelectCompany,
  onOpenManageModal,
  onManageCompanies,
  items = [],
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const handleOpenManage = onOpenManageModal || onManageCompanies || (() => {});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAllSelected = activeCompanyId === 'all';
  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  const getCompanyColor = (colorKey?: string) => {
    return COLOR_MAP[colorKey || 'emerald'] || COLOR_MAP.emerald;
  };

  const getItemCount = (comp: CompanyProfile) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.filter((item) => {
      if (item.companyId) {
        return item.companyId === comp.id;
      }
      return comp.isDefault || comp.id === companies[0]?.id;
    }).length;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btn-company-profile-selector"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
          compact
            ? 'px-2.5 py-1.5 text-xs bg-white border-slate-200 hover:border-emerald-300'
            : 'px-3 py-2 text-xs font-semibold bg-white/95 hover:bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xs'
        }`}
        title="Switch Company Profile"
      >
        {isAllSelected ? (
          <div className="w-6 h-6 rounded-xl bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div
            className={`w-6 h-6 rounded-xl text-white flex items-center justify-center text-[10px] font-black shadow-2xs shrink-0 ${
              getCompanyColor(activeCompany?.color).bg
            }`}
          >
            {activeCompany?.code
              ? activeCompany.code.substring(0, 3)
              : (activeCompany?.name || 'CO').substring(0, 2).toUpperCase()}
          </div>
        )}

        <div className="text-left leading-none min-w-0">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Company
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[150px] text-xs">
              {isAllSelected ? 'All Companies' : activeCompany?.name || 'Select Company'}
            </span>
            {!isAllSelected && activeCompany?.code && (
              <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-slate-100 text-slate-600 rounded">
                {activeCompany.code}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 origin-top-left sm:origin-top-right bg-white rounded-2xl shadow-xl border border-slate-200 divide-y divide-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Menu Header */}
          <div className="p-3 bg-slate-50/70 rounded-t-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Switch Company</span>
              <span className="text-[10px] text-slate-500">
                Filter inventory & metrics by company
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenManageModal();
              }}
              className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer"
              title="Manage company profiles"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Companies List */}
          <div className="py-1 max-h-64 overflow-y-auto">
            {companies.map((comp) => {
              const isSelected = !isAllSelected && comp.id === activeCompanyId;
              const colorInfo = getCompanyColor(comp.color);
              const count = getItemCount(comp);

              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    onSelectCompany(comp.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 text-emerald-950 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-xl text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-2xs ${colorInfo.bg}`}
                    >
                      {comp.code ? comp.code.substring(0, 3) : comp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate block">{comp.name}</span>
                        {comp.code && (
                          <span className="px-1 py-0.2 text-[9px] font-mono uppercase bg-slate-100 text-slate-600 rounded">
                            {comp.code}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {count} item{count !== 1 ? 's' : ''} • {comp.currency || '$'}
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              );
            })}

            {/* Consolidated View (All Companies) */}
            <button
              type="button"
              onClick={() => {
                onSelectCompany('all');
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer border-t border-slate-100 ${
                isAllSelected
                  ? 'bg-emerald-50/70 text-emerald-950 font-semibold'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold truncate block">All Companies (Consolidated)</span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Combined view of all {items?.length ?? 0} items
                  </span>
                </div>
              </div>

              {isAllSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            </button>
          </div>

          {/* Footer Action */}
          <div className="p-2 bg-slate-50/50 rounded-b-2xl">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                handleOpenManage();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/70 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage or Add Company Profiles</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
