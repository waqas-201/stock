import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Users,
  Search,
  Trash2,
  Edit2,
  Check,
  Truck,
  Building2,
  ShoppingBag,
  PackageCheck,
  FileText,
} from 'lucide-react';
import { CustomerParty, CustomerPartyType } from '../types';

interface CustomerManagementModalProps {
  isOpen: boolean;
  customers: CustomerParty[];
  onClose: () => void;
  onSaveCustomer: (customer: CustomerParty) => void;
  onDeleteCustomer: (id: string) => void;
  onSelectForDispatch?: (customerName: string, deliveryAddress?: string) => void;
  onSelectForReceive?: (vendorName: string) => void;
  onOpenLedger?: (partyName: string) => void;
}

export const CustomerManagementModal: React.FC<CustomerManagementModalProps> = ({
  isOpen,
  customers,
  onClose,
  onSaveCustomer,
  onDeleteCustomer,
  onSelectForDispatch,
  onSelectForReceive,
  onOpenLedger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'vendor'>('all');

  // Fast Add form state: just Name and Type (Customer / Vendor)
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CustomerPartyType>('customer');
  const [formError, setFormError] = useState<string | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<CustomerPartyType>('customer');

  // Inline delete confirmation state (No window.confirm!)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reset Add Form
  const handleAddParty = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError('Please enter a party name');
      return;
    }

    const now = new Date().toISOString();
    const newParty: CustomerParty = {
      id: `party-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      partyType: newType,
      createdAt: now,
      updatedAt: now,
    };

    onSaveCustomer(newParty);
    setNewName('');
    setFormError(null);
  };

  const handleStartEdit = (party: CustomerParty) => {
    setEditingId(party.id);
    setEditName(party.name);
    setEditType(party.partyType === 'vendor' ? 'vendor' : 'customer');
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = (party: CustomerParty) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    onSaveCustomer({
      ...party,
      name: trimmed,
      partyType: editType,
      updatedAt: new Date().toISOString(),
    });
    setEditingId(null);
  };

  // Filtered parties
  const filteredParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'customer' && c.partyType !== 'vendor') ||
        (typeFilter === 'vendor' && c.partyType === 'vendor');

      if (!matchType) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [customers, searchQuery, typeFilter]);

  const customerCount = customers.filter((c) => c.partyType !== 'vendor').length;
  const vendorCount = customers.filter((c) => c.partyType === 'vendor').length;

  if (!isOpen) return null;

  return (
    <div
      id="customer-management-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="customer-management-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="parties-modal-title"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="parties-modal-title" className="text-base font-bold tracking-tight">
                  Parties Directory
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {customers.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Manage Customers & Vendors with fast 1-click addition and deletion
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimal Fast Add Row (Just Name and Type) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <form onSubmit={handleAddParty} className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Name Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Enter Party Name (e.g. Apex Traders, Metro Corp)..."
                  className="w-full px-3.5 py-2 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Type Switcher: Only 2 types: Customer or Vendor */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setNewType('customer')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    newType === 'customer'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Customer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('vendor')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    newType === 'vendor'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Vendor</span>
                </button>
              </div>

              {/* Add Button */}
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Party</span>
              </button>
            </div>

            {formError && (
              <p className="text-xs text-rose-600 font-medium">{formError}</p>
            )}
          </form>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('customer')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'customer'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Customers ({customerCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('vendor')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'vendor'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Vendors ({vendorCount})
            </button>
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search party..."
              className="w-full pl-8 pr-2.5 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Party List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredParties.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-600">No parties found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {searchQuery ? 'Try clearing your search query' : 'Type a name above to add your first party'}
              </p>
            </div>
          ) : (
            filteredParties.map((party) => {
              const isEditing = editingId === party.id;
              const isDeleting = confirmDeleteId === party.id;
              const isVendor = party.partyType === 'vendor';

              return (
                <div
                  key={party.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDeleting
                      ? 'bg-rose-50 border-rose-300'
                      : isEditing
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                  }`}
                >
                  {isEditing ? (
                    // Inline Edit Mode
                    <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />

                      <div className="flex items-center bg-slate-200 p-0.5 rounded-lg shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditType('customer')}
                          className={`px-2 py-1 text-xs font-bold rounded cursor-pointer ${
                            editType === 'customer'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600'
                          }`}
                        >
                          Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditType('vendor')}
                          className={`px-2 py-1 text-xs font-bold rounded cursor-pointer ${
                            editType === 'vendor'
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600'
                          }`}
                        >
                          Vendor
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(party)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    // Inline Delete Confirmation (Guaranteed to work, no window.confirm!)
                    <div className="w-full flex items-center justify-between gap-3 py-0.5">
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-xs font-bold text-rose-800">
                          Delete "{party.name}" permanently?
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCustomer(party.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-xs cursor-pointer"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Standard Row
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md shrink-0 ${
                            isVendor
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isVendor ? 'Vendor' : 'Customer'}
                        </span>
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {party.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        {!isVendor && onSelectForDispatch && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectForDispatch(party.name);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            title="Dispatch order to this customer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Dispatch</span>
                          </button>
                        )}

                        {isVendor && onSelectForReceive && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectForReceive(party.name);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            title="Receive stock from this vendor"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Receive</span>
                          </button>
                        )}

                        {onOpenLedger && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenLedger(party.name);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                            title={`View delivery challans & ledger statement for ${party.name}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            <span>Ledger</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(party)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Rename or change type"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(party.id);
                            setEditingId(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete party"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {customers.length} total parties registered ({customerCount} Customers, {vendorCount} Vendors)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
