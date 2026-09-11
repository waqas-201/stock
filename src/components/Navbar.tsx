import React, { useRef } from 'react';
import {
  Boxes,
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  Scale,
  Languages,
} from 'lucide-react';
import { AppLanguage } from '../types';
import { AppStrings } from '../lib/translations';

interface NavbarProps {
  itemCount: number;
  lang: AppLanguage;
  t: AppStrings;
  onToggleLanguage: () => void;
  onOpenUnitManagement: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onImportFile: (file: File) => void;
  onResetSampleData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  itemCount,
  lang,
  t,
  onToggleLanguage,
  onOpenUnitManagement,
  onExportExcel,
  onExportCsv,
  onImportFile,
  onResetSampleData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header
      id="app-header"
      className="bg-white border-b border-slate-200 sticky top-0 z-40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & App Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {t.appName}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t.itemsCount(itemCount)}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Hidden File Input for Excel/CSV Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Actions: Unit Management, Export, Import, Language Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Unit Management Button */}
            <button
              id="btn-nav-manage-units"
              type="button"
              onClick={onOpenUnitManagement}
              title={t.manageUnits}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t.manageUnits}</span>
            </button>

            {/* Import Button */}
            <button
              id="btn-import-sheet"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={t.importExcel}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.importExcel}</span>
            </button>

            {/* Export CSV */}
            <button
              id="btn-export-csv"
              type="button"
              onClick={onExportCsv}
              disabled={itemCount === 0}
              title={t.exportCsv}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.exportCsv}</span>
            </button>

            {/* Export Excel (.xlsx) */}
            <button
              id="btn-export-excel"
              type="button"
              onClick={onExportExcel}
              disabled={itemCount === 0}
              title={t.exportExcel}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t.exportExcel}</span>
              <Download className="w-3 h-3 opacity-80" />
            </button>

            {/* Language Switcher (Urdu / English) */}
            <button
              id="btn-toggle-language"
              type="button"
              onClick={onToggleLanguage}
              title={lang === 'ur' ? 'Switch to English' : 'اردو میں تبدیل کریں'}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl cursor-pointer transition-colors"
            >
              <Languages className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-sans">{lang === 'ur' ? 'EN' : 'اردو'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
