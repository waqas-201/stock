import React, { useState } from 'react';
import {
  X,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Check,
  Star,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileBadge,
  Package,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { CompanyProfile, StockItem } from '../types';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyProfile[];
  activeCompanyId: string;
  onSelectCompany: (companyId: string) => void;
  onSaveCompany: (company: CompanyProfile) => void;
  onDeleteCompany: (companyId: string) => void;
  onSetDefault?: (companyId: string) => void;
  items?: StockItem[];
}

const COLOR_OPTIONS = [
  { id: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'blue', label: 'Classic Blue', bg: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-700', badge: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'indigo', label: 'Deep Indigo', bg: 'bg-indigo-500', ring: 'ring-indigo-500', text: 'text-indigo-700', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'violet', label: 'Purple / Violet', bg: 'bg-violet-500', ring: 'ring-violet-500', text: 'text-violet-700', badge: 'bg-violet-50 text-violet-800 border-violet-200' },
  { id: 'amber', label: 'Warm Amber', bg: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'rose', label: 'Rose Pink', bg: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-700', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'cyan', label: 'Cyan Ocean', bg: 'bg-cyan-500', ring: 'ring-cyan-500', text: 'text-cyan-700', badge: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { id: 'slate', label: 'Slate Steel', bg: 'bg-slate-600', ring: 'ring-slate-500', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800 border-slate-300' },
];

const CURRENCIES = [
  { symbol: '$', label: 'USD ($)' },
  { symbol: '€', label: 'EUR (€)' },
  { symbol: '£', label: 'GBP (£)' },
  { symbol: 'PKR', label: 'PKR (Rs)' },
  { symbol: '₹', label: 'INR (₹)' },
  { symbol: 'AED', label: 'AED (د.إ)' },
  { symbol: 'SAR', label: 'SAR (﷼)' },
  { symbol: '¥', label: 'JPY/CNY (¥)' },
  { symbol: 'C$', label: 'CAD (C$)' },
  { symbol: 'A$', label: 'AUD (A$)' },
];

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  companies = [],
  activeCompanyId = 'all',
  onSelectCompany,
  onSaveCompany,
  onDeleteCompany,
  onSetDefault,
  items = [],
}) => {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [tagline, setTagline] = useState('');
  const [currency, setCurrency] = useState('$');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [color, setColor] = useState('emerald');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyProfile | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setCode('');
    setTagline('');
    setCurrency('$');
    setTaxId('');
    setEmail('');
    setPhone('');
    setAddress('');
    setColor('emerald');
    setIsDefault(false);
    setError(null);
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setView('create');
  };

  const handleOpenEdit = (comp: CompanyProfile) => {
    setEditingId(comp.id);
    setName(comp.name);
    setCode(comp.code || '');
    setTagline(comp.tagline || '');
    setCurrency(comp.currency || '$');
    setTaxId(comp.taxId || '');
    setEmail(comp.email || '');
    setPhone(comp.phone || '');
    setAddress(comp.address || '');
    setColor(comp.color || 'emerald');
    setIsDefault(!!comp.isDefault);
    setError(null);
    setView('edit');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Company name is required.');
      return;
    }

    const companyId = editingId || 'comp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const existing = companies.find((c) => c.id === editingId);

    const updatedCompany: CompanyProfile = {
      id: companyId,
      name: trimmedName,
      code: code.trim().toUpperCase() || undefined,
      tagline: tagline.trim() || undefined,
      currency: currency.trim() || '$',
      taxId: taxId.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      color: color || 'emerald',
      isDefault: isDefault || (companies.length === 0),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveCompany(updatedCompany);
    if (!editingId || editingId === activeCompanyId) {
      onSelectCompany(companyId);
    }
    resetForm();
    setView('list');
  };

  const handleDeleteConfirm = () => {
    if (!companyToDelete) return;
    if (companies.length <= 1) {
      setError('You must have at least one company profile.');
      setCompanyToDelete(null);
      return;
    }

    onDeleteCompany(companyToDelete.id);
    if (activeCompanyId === companyToDelete.id) {
      const remaining = companies.filter((c) => c.id !== companyToDelete.id);
      if (remaining.length > 0) {
        onSelectCompany(remaining[0].id);
      }
    }
    setCompanyToDelete(null);
  };

  const getItemCountForCompany = (comp: CompanyProfile) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.filter((item) => {
      if (item.companyId) {
        return item.companyId === comp.id;
      }
      // If no companyId, it belongs to the default or first company
      return comp.isDefault || comp.id === companies[0]?.id;
    }).length;
  };

  const getColorMeta = (colorId?: string) => {
    return COLOR_OPTIONS.find((c) => c.id === colorId) || COLOR_OPTIONS[0];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {view === 'list' && 'Company & Branch Profiles'}
                {view === 'create' && 'Add New Company Profile'}
                {view === 'edit' && 'Edit Company Profile'}
              </h2>
              <p className="text-xs text-slate-500">
                {view === 'list' && 'Manage multiple corporate accounts, branches, and dedicated inventories'}
                {view === 'create' && 'Register a new business entity or warehouse branch'}
                {view === 'edit' && 'Update business profile, contact details, and currency'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {view === 'list' && (
            <div className="space-y-4">
              {/* Top Action & Subhead */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Registered Companies ({companies.length})
                  </span>
                  <p className="text-xs text-slate-500">
                    Switch active profile to segregate stock lists, metrics, and audit logs.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Company</span>
                </button>
              </div>

              {/* Company Profiles Cards List */}
              <div className="grid grid-cols-1 gap-3">
                {companies.map((comp) => {
                  const isActive = comp.id === activeCompanyId;
                  const colorMeta = getColorMeta(comp.color);
                  const itemCount = getItemCountForCompany(comp);

                  return (
                    <div
                      key={comp.id}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Company Identity */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-2xs ${colorMeta.bg}`}
                          >
                            {comp.code ? comp.code.substring(0, 3) : comp.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 truncate">
                                {comp.name}
                              </h3>
                              {comp.code && (
                                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                  {comp.code}
                                </span>
                              )}
                              {comp.isDefault && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  Default
                                </span>
                              )}
                              {isActive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Check className="w-2.5 h-2.5" />
                                  Active Profile
                                </span>
                              )}
                            </div>

                            {comp.tagline && (
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {comp.tagline}
                              </p>
                            )}

                            {/* Details Chips */}
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Package className="w-3 h-3 text-slate-400" />
                                <strong className="text-slate-700">{itemCount}</strong> items
                              </span>

                              {comp.currency && (
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <span>Currency:</span>
                                  <strong className="text-slate-700">{comp.currency}</strong>
                                </span>
                              )}

                              {comp.taxId && (
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <FileBadge className="w-3 h-3 text-slate-400" />
                                  <span>Tax ID:</span> {comp.taxId}
                                </span>
                              )}

                              {comp.phone && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {comp.phone}
                                </span>
                              )}

                              {comp.address && (
                                <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{comp.address}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => onSelectCompany(comp.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 rounded-xl transition-colors cursor-pointer"
                              title="Switch active inventory to this company"
                            >
                              <span>Switch</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(comp)}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Edit company profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {companies.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setCompanyToDelete(comp)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete company profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create or Edit Form */}
          {(view === 'create' || view === 'edit') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Company Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company / Entity Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Industrial Supplies Ltd."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Company Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Short Code (3-6 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="e.g. AIS or BR-1"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm uppercase font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Tagline / Subtitle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline / Business Nature
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wholesale Hardware & Heavy Machine Parts"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Currency & Tax ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standard Currency
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.symbol} value={c.symbol}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Custom"
                      maxLength={6}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-20 px-2.5 py-2 text-sm text-center border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      title="Or enter custom currency symbol"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tax / VAT / Registration Number
                  </label>
                  <div className="relative">
                    <FileBadge className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. VAT-9920194 or NTN-12345"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="e.g. accounts@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / Mobile
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 019-2834"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Physical Address / Warehouse Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Plot 18, Commercial Zone, Industrial Estate"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Visual Color Theme */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Company Badge Color Theme
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`h-9 rounded-xl flex items-center justify-center transition-transform cursor-pointer ${c.bg} ${
                        color === c.id ? 'ring-3 ring-offset-2 ring-slate-800 scale-105' : 'hover:scale-102'
                      }`}
                      title={c.label}
                    >
                      {color === c.id && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Company Option */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-default-company"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="chk-default-company" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  Set this company as my default primary organization
                </label>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setView('list');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{view === 'create' ? 'Create Company Profile' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Delete Confirmation Overlay */}
        {companyToDelete && (
          <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Delete "{companyToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove this company profile? Existing inventory items tagged to this company will be retained and reassigned to the primary profile.
              </p>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setCompanyToDelete(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
