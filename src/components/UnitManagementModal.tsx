import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Scale,
  RotateCcw,
} from 'lucide-react';
import { StockUnit, AppLanguage } from '../types';
import { DEFAULT_PAKISTANI_UNITS } from '../lib/unitStorage';
import { AppStrings } from '../lib/translations';

interface UnitManagementModalProps {
  isOpen: boolean;
  units: StockUnit[];
  lang: AppLanguage;
  t: AppStrings;
  onClose: () => void;
  onAddUnit: (nameUrdu: string, nameEnglish?: string) => void;
  onUpdateUnit: (id: string, nameUrdu: string, nameEnglish?: string) => void;
  onDeleteUnit: (id: string) => void;
  onResetUnits: () => void;
}

export const UnitManagementModal: React.FC<UnitManagementModalProps> = ({
  isOpen,
  units,
  lang,
  t,
  onClose,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  onResetUnits,
}) => {
  const [newUrdu, setNewUrdu] = useState('');
  const [newEnglish, setNewEnglish] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUrdu, setEditUrdu] = useState('');
  const [editEnglish, setEditEnglish] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrdu.trim()) {
      setError(lang === 'ur' ? 'اکائی کا نام درج کریں' : 'Unit name is required');
      return;
    }
    setError(null);
    onAddUnit(newUrdu.trim(), newEnglish.trim() || undefined);
    setNewUrdu('');
    setNewEnglish('');
  };

  const startEdit = (unit: StockUnit) => {
    setEditingUnitId(unit.id);
    setEditUrdu(unit.nameUrdu);
    setEditEnglish(unit.nameEnglish || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editUrdu.trim()) return;
    onUpdateUnit(id, editUrdu.trim(), editEnglish.trim() || undefined);
    setEditingUnitId(null);
  };

  return (
    <div
      id="unit-management-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="unit-management-modal-box"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {t.unitManagementTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.unitManagementSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Add New Unit Form */}
          <form
            onSubmit={handleAdd}
            className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>{t.addNewUnit}</span>
              </h4>
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.unitNameUrdu} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.unitPlaceholderUrdu}
                  value={newUrdu}
                  onChange={(e) => setNewUrdu(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.unitNameEnglish}
                </label>
                <input
                  type="text"
                  placeholder={t.unitPlaceholderEnglish}
                  value={newEnglish}
                  onChange={(e) => setNewEnglish(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.saveUnit}</span>
              </button>
            </div>
          </form>

          {/* Existing Units List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === 'ur' ? 'دستیاب اکائیاں' : 'Available Units'} ({units.length})
              </h4>
              <button
                type="button"
                onClick={onResetUnits}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700 font-medium cursor-pointer"
                title="Reset to default Pakistani commerce units"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lang === 'ur' ? 'ڈیفالٹ بحال کریں' : 'Reset Defaults'}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {units.map((unit) => {
                const isEditing = editingUnitId === unit.id;

                if (isEditing) {
                  return (
                    <div
                      key={unit.id}
                      className="p-3 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                    >
                      <input
                        type="text"
                        value={editUrdu}
                        onChange={(e) => setEditUrdu(e.target.value)}
                        placeholder="نام (اردو)"
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editEnglish}
                        onChange={(e) => setEditEnglish(e.target.value)}
                        placeholder="English Name"
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
                      />
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(unit.id)}
                          className="p-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUnitId(null)}
                          className="p-1.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={unit.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900">
                        {unit.nameUrdu}
                      </span>
                      {unit.nameEnglish && (
                        <span className="text-xs text-slate-500 font-medium">
                          ({unit.nameEnglish})
                        </span>
                      )}
                      {unit.isDefault ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full">
                          {t.defaultBadge}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                          {t.customBadge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(unit)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        title="Edit unit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!unit.isDefault && (
                        <button
                          type="button"
                          onClick={() => onDeleteUnit(unit.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {lang === 'ur'
              ? 'یہ تمام اکائیاں نیا آئٹم شامل کرتے ہوئے دستیاب ہوں گی'
              : 'These units will be selectable when adding or editing items'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
