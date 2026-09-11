import React, { useState, useEffect } from 'react';
import { X, Check, Edit3, Settings2 } from 'lucide-react';
import { StockItem, StockUnit, AppLanguage } from '../types';
import { AppStrings } from '../lib/translations';

interface EditItemModalProps {
  isOpen: boolean;
  item: StockItem | null;
  units: StockUnit[];
  lang: AppLanguage;
  t: AppStrings;
  onClose: () => void;
  onOpenUnitManagement: () => void;
  onSave: (
    id: string,
    updated: { itemName: string; unit: string; quantity: number }
  ) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  item,
  units,
  lang,
  t,
  onClose,
  onOpenUnitManagement,
  onSave,
}) => {
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('عدد / نَگ');
  const [quantity, setQuantity] = useState<number | string>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setItemName(item.itemName);
      setUnit(item.unit);
      setQuantity(item.quantity);
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setError(lang === 'ur' ? 'اشیاء کا نام لازمی ہے' : 'Item name is required');
      return;
    }
    if (!unit.trim()) {
      setError(lang === 'ur' ? 'اکائی کا انتخاب لازمی ہے' : 'Unit is required');
      return;
    }
    const numQty = typeof quantity === 'number' ? quantity : parseFloat(String(quantity));
    if (isNaN(numQty) || numQty < 0) {
      setError(lang === 'ur' ? 'تعداد درست اور مثبت ہونی چاہیے' : 'Quantity must be a valid number');
      return;
    }

    setError(null);
    onSave(item.id, {
      itemName: itemName.trim(),
      unit: unit.trim(),
      quantity: numQty,
    });
    onClose();
  };

  return (
    <div
      id="edit-item-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="edit-item-modal-box"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.editItem}</h3>
              <p className="text-xs text-slate-500">
                {item.itemName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Column 1: Item Name */}
          <div>
            <label
              htmlFor="edit-item-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              {t.itemNameCol} <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-item-name"
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
            />
          </div>

          {/* Column 2: Unit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-item-unit"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                {t.unitCol} <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={onOpenUnitManagement}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
              >
                <Settings2 className="w-3 h-3" />
                <span>{t.manageUnits}</span>
              </button>
            </div>

            <select
              id="edit-item-unit-select"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
            >
              {/* If current unit is not in managed list, still show it */}
              {!units.some((u) => u.nameUrdu === unit) && (
                <option value={unit}>{unit}</option>
              )}
              {units.map((u) => (
                <option key={u.id} value={u.nameUrdu}>
                  {u.nameUrdu} {u.nameEnglish ? `(${u.nameEnglish})` : ''}
                </option>
              ))}
            </select>

            {/* Quick unit pills */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">{t.quickUnits}</span>
              {units.slice(0, 7).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUnit(u.nameUrdu)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                    unit === u.nameUrdu
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {u.nameUrdu}
                </button>
              ))}
            </div>
          </div>

          {/* Column 3: Quantity */}
          <div>
            <label
              htmlFor="edit-item-quantity"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              {t.quantityCol} <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(0, (Number(q) || 0) - 1))}
                className="px-3.5 py-2.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-sm cursor-pointer"
              >
                -1
              </button>
              <input
                id="edit-item-quantity"
                type="number"
                min="0"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-base text-center font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-mono"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => (Number(q) || 0) + 1)}
                className="px-3.5 py-2.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-sm cursor-pointer"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setQuantity((q) => (Number(q) || 0) + 10)}
                className="px-3 py-2.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-bold cursor-pointer"
              >
                +10
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              id="btn-edit-item-cancel"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              id="btn-edit-item-submit"
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t.saveChanges}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
