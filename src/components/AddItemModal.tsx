import React, { useState } from 'react';
import { X, Plus, PackagePlus, Settings2 } from 'lucide-react';
import { StockUnit, AppLanguage } from '../types';
import { AppStrings } from '../lib/translations';

interface AddItemModalProps {
  isOpen: boolean;
  units: StockUnit[];
  lang: AppLanguage;
  t: AppStrings;
  onClose: () => void;
  onOpenUnitManagement: () => void;
  onAdd: (item: { itemName: string; unit: string; quantity: number }) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  units,
  lang,
  t,
  onClose,
  onOpenUnitManagement,
  onAdd,
}) => {
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState(units[0]?.nameUrdu || 'عدد / نَگ');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    onAdd({
      itemName: itemName.trim(),
      unit: unit.trim(),
      quantity: numQty,
    });
    setItemName('');
    setQuantity(1);
    onClose();
  };

  return (
    <div
      id="add-item-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="add-item-modal-box"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.addItem}</h3>
              <p className="text-xs text-slate-500">
                {t.itemNameCol} • {t.unitCol} • {t.quantityCol}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer transition-colors"
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
              htmlFor="new-item-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              {t.itemNameCol} <span className="text-rose-500">*</span>
            </label>
            <input
              id="new-item-name"
              type="text"
              required
              placeholder={lang === 'ur' ? 'مثلاً: باسمتی چاول، کوکنگ آئل، کاپیاں' : 'e.g., Basmati Rice, Cooking Oil, Paper'}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {/* Column 2: Unit (Integrated Unit Management) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="new-item-unit"
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

            <div className="flex gap-2">
              <select
                id="new-item-unit-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.nameUrdu}>
                    {u.nameUrdu} {u.nameEnglish ? `(${u.nameEnglish})` : ''}
                  </option>
                ))}
              </select>
            </div>

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
              htmlFor="new-item-quantity"
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
                id="new-item-quantity"
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
              id="btn-add-item-cancel"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              id="btn-add-item-submit"
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addToStock}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
