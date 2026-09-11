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
import { StockUnit } from '../types';

interface UnitManagementModalProps {
  isOpen: boolean;
  units: StockUnit[];
  onClose: () => void;
  onAddUnit: (name: string, code?: string) => void;
  onUpdateUnit: (id: string, name: string, code?: string) => void;
  onDeleteUnit: (id: string) => void;
  onResetUnits: () => void;
}

export const UnitManagementModal: React.FC<UnitManagementModalProps> = ({
  isOpen,
  units,
  onClose,
  onAddUnit,
  onUpdateUnit,
  onDeleteUnit,
  onResetUnits,
}) => {
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Unit name is required');
      return;
    }
    setError(null);
    onAddUnit(newName.trim(), newCode.trim() || undefined);
    setNewName('');
    setNewCode('');
  };

  const startEdit = (unit: StockUnit) => {
    setEditingUnitId(unit.id);
    setEditName(unit.name);
    setEditCode(unit.code || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateUnit(id, editName.trim(), editCode.trim() || undefined);
    setEditingUnitId(null);
  };

  return (
    <div
      id="unit-management-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="unit-management-modal-box"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto sm:hidden mt-2.5 shrink-0" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Unit Management
              </h3>
              <p className="text-xs text-slate-500">
                Measurement units for your inventory items
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full active:bg-slate-200/60 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
          {/* Add New Unit Form */}
          <form
            onSubmit={handleAdd}
            className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3"
          >
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Add New Unit</span>
            </h4>

            {error && (
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kilogram, Carton, Box"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Abbreviation / Symbol (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., kg, ctn, box"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-emerald-600 active:bg-emerald-700 rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Save New Unit</span>
              </button>
            </div>
          </form>

          {/* Existing Units List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Configured Units ({units.length})
              </h4>
              <button
                type="button"
                onClick={onResetUnits}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer rounded-lg active:bg-slate-100"
                title="Restore default standard units"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
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
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Unit Name"
                        className="flex-1 px-3 py-2 min-h-[44px] text-base sm:text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        placeholder="Code (e.g. kg)"
                        className="w-full sm:w-32 px-3 py-2 min-h-[44px] text-base sm:text-xs bg-white border border-slate-300 rounded-xl text-slate-900"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(unit.id)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-emerald-600 text-white rounded-xl active:bg-emerald-700 cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUnitId(null)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-200 text-slate-700 rounded-xl active:bg-slate-300 cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={unit.id}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {unit.name}
                      </span>
                      {unit.code && (
                        <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-100 text-slate-600 rounded-md border border-slate-200/80">
                          {unit.code}
                        </span>
                      )}
                      {unit.isDefault && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Standard
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(unit)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800 active:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Edit unit name"
                        aria-label={`Edit ${unit.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteUnit(unit.id)}
                        disabled={units.length <= 1}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-500 hover:text-rose-700 active:bg-rose-50 disabled:opacity-20 disabled:pointer-events-none rounded-xl transition-colors cursor-pointer"
                        title="Delete unit"
                        aria-label={`Delete ${unit.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl active:bg-slate-100 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
