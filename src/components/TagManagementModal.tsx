import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag as TagIcon,
  RotateCcw,
  Search,
  Hash,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { StockTag, StockItem } from '../types';
import {
  TAG_COLOR_OPTIONS,
  getTagColorOption,
} from '../lib/tagStorage';

interface TagManagementModalProps {
  isOpen: boolean;
  tags: StockTag[];
  items: StockItem[];
  onClose: () => void;
  onAddTag?: (name: string, color?: any, description?: string) => void;
  onCreateTag?: (name: string, color?: any, description?: string) => void;
  onUpdateTag: (
    id: string,
    name: string,
    color?: any,
    description?: string,
    updateItemsWithName?: { oldName: string; newName: string }
  ) => void;
  onDeleteTag: (id: string, removeTagFromItems?: boolean) => void;
  onResetTags: () => void;
  onSelectTagToFilter?: (tagName: string) => void;
}

export const TagManagementModal: React.FC<TagManagementModalProps> = ({
  isOpen,
  tags,
  items,
  onClose,
  onAddTag,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onResetTags,
  onSelectTagToFilter,
}) => {
  const addTagFn = onAddTag || onCreateTag;
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('emerald');
  const [newDescription, setNewDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Inline edit state
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('emerald');
  const [editDescription, setEditDescription] = useState('');
  const [updateTaggedItemsOnRename, setUpdateTaggedItemsOnRename] = useState(true);

  // Delete confirmation state
  const [tagPendingDelete, setTagPendingDelete] = useState<StockTag | null>(null);
  const [removeTagFromItemsOnDelete, setRemoveTagFromItemsOnDelete] = useState(false);

  // Calculate usage count for each tag in current inventory items
  const tagUsageMap = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach((tag) => {
          const clean = tag.trim().toLowerCase();
          if (clean) {
            map.set(clean, (map.get(clean) || 0) + 1);
          }
        });
      }
    });
    return map;
  }, [items]);

  // Find tags present on items that are not yet registered in managed tags list
  const untrackedItemTags = useMemo(() => {
    const managedNamesSet = new Set(tags.map((t) => t.name.trim().toLowerCase()));
    const untracked = new Set<string>();
    items.forEach((item) => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach((tag) => {
          const clean = tag.trim();
          if (clean && !managedNamesSet.has(clean.toLowerCase())) {
            untracked.add(clean);
          }
        });
      }
    });
    return Array.from(untracked);
  }, [items, tags]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim().replace(/^#+/, '').trim();
    if (!trimmed) {
      setError('Tag name is required');
      return;
    }

    const exists = tags.some(
      (t) => t.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setError(`A tag named "${trimmed}" already exists.`);
      return;
    }

    setError(null);
    if (addTagFn) {
      addTagFn(trimmed, newColor, newDescription.trim() || undefined);
    }
    setNewName('');
    setNewDescription('');
    setNewColor('emerald');
  };

  const startEdit = (tag: StockTag) => {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || 'emerald');
    setEditDescription(tag.description || '');
    setUpdateTaggedItemsOnRename(true);
  };

  const handleSaveEdit = (id: string, originalName: string) => {
    const trimmed = editName.trim().replace(/^#+/, '').trim();
    if (!trimmed) return;

    // Duplicate check if name changed
    if (trimmed.toLowerCase() !== originalName.toLowerCase()) {
      const exists = tags.some(
        (t) => t.id !== id && t.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        setError(`A tag named "${trimmed}" already exists.`);
        return;
      }
    }

    setError(null);
    onUpdateTag(
      id,
      trimmed,
      editColor,
      editDescription.trim() || undefined,
      updateTaggedItemsOnRename && trimmed.toLowerCase() !== originalName.toLowerCase()
        ? { oldName: originalName, newName: trimmed }
        : undefined
    );
    setEditingTagId(null);
  };

  const handleConfirmDelete = () => {
    if (!tagPendingDelete) return;
    onDeleteTag(tagPendingDelete.id, removeTagFromItemsOnDelete);
    setTagPendingDelete(null);
    setRemoveTagFromItemsOnDelete(false);
  };

  const filteredTags = tags.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tag-modal-title" className="text-base sm:text-lg font-bold text-slate-800">
                Tag Management
              </h2>
              <p className="text-xs text-slate-500">
                Create, color-code, and organize inventory tags
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick adopt untracked tags (if any exist on stock items) */}
          {untrackedItemTags.length > 0 && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Found {untrackedItemTags.length} tags in inventory not yet in Tag Manager:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {untrackedItemTags.map((ut) => (
                  <button
                    key={ut}
                    type="button"
                    onClick={() => {
                      if (addTagFn) {
                        addTagFn(ut, 'emerald');
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white text-slate-700 border border-amber-200 hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer shadow-2xs"
                    title={`Click to add "${ut}" to managed tags`}
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>#{ut}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Tag Form */}
          <form
            onSubmit={handleAdd}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add New Tag</span>
              </h3>
              <span className="text-[11px] text-slate-400">Custom Colors & Notes</span>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tag Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                    #
                  </span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Office, Fragile, Bakery"
                    maxLength={30}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Stationery, equipment & admin"
                  maxLength={120}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Visual Color Palette Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tag Color Badge Style
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {TAG_COLOR_OPTIONS.map((c) => {
                  const isSelected = newColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewColor(c.id)}
                      className={`h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? `${c.activeBg} ring-2 ring-emerald-500/40 ring-offset-1 font-bold shadow-xs scale-105`
                          : `${c.bg} ${c.text} ${c.border} hover:scale-102`
                      }`}
                      title={c.name}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.dot} mr-1`} />
                      <span className="text-[10px] font-semibold truncate px-0.5">
                        {c.name.slice(0, 3)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!newName.trim()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Tag</span>
              </button>
            </div>
          </form>

          {/* Existing Tags Header & Search */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Configured Tags ({filteredTags.length})
                </h3>
                <span className="text-xs text-slate-400">
                  • {items.length} total inventory items
                </span>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Tags List */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden shadow-2xs">
              {filteredTags.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm font-medium">No tags match your search</p>
                  <p className="text-xs mt-1">Add a new tag above or clear your search term.</p>
                </div>
              ) : (
                filteredTags.map((tag) => {
                  const isEditing = editingTagId === tag.id;
                  const colorOpt = getTagColorOption(tag.color);
                  const usageCount = tagUsageMap.get(tag.name.toLowerCase()) || 0;

                  if (isEditing) {
                    return (
                      <div
                        key={tag.id}
                        className="p-3.5 bg-emerald-50/40 space-y-3 animate-in fade-in"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Tag Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-emerald-500 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Optional description"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-emerald-500 outline-hidden"
                            />
                          </div>
                        </div>

                        {/* Color Picker inside Edit */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Color Palette
                          </label>
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                            {TAG_COLOR_OPTIONS.map((c) => {
                              const isSelected = editColor === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setEditColor(c.id)}
                                  className={`h-7 rounded-md border text-[9px] font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                    isSelected
                                      ? `${c.activeBg} ring-2 ring-emerald-500/40`
                                      : `${c.bg} ${c.text} ${c.border}`
                                  }`}
                                  title={c.name}
                                >
                                  {c.name.slice(0, 3)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Auto-rename items checkbox */}
                        {usageCount > 0 && editName.trim().toLowerCase() !== tag.name.toLowerCase() && (
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={updateTaggedItemsOnRename}
                              onChange={(e) => setUpdateTaggedItemsOnRename(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                            />
                            <span>
                              Automatically rename this tag on <strong>{usageCount}</strong> active stock item(s)
                            </span>
                          </label>
                        )}

                        {/* Edit Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingTagId(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(tag.id, tag.name)}
                            disabled={!editName.trim()}
                            className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={tag.id}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Styled Tag Chip */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 ${colorOpt.bg} ${colorOpt.text} ${colorOpt.border}`}
                        >
                          <Hash className="w-3 h-3 opacity-60" />
                          <span>{tag.name}</span>
                        </span>

                        {/* Description & Usage count */}
                        <div className="min-w-0">
                          {tag.description ? (
                            <p className="text-xs text-slate-600 truncate">{tag.description}</p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No description</p>
                          )}
                        </div>
                      </div>

                      {/* Right controls: Usage count, Filter, Edit, Delete */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Usage badge & filter button */}
                        {usageCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectTagToFilter) {
                                onSelectTagToFilter(tag.name);
                                onClose();
                              }
                            }}
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title={`Filter table by #${tag.name}`}
                          >
                            {usageCount} item{usageCount !== 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-normal text-slate-400 bg-slate-50 border border-slate-100">
                            0 items
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => startEdit(tag)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          aria-label={`Edit tag ${tag.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setTagPendingDelete(tag)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          aria-label={`Delete tag ${tag.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onResetTags}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Restore original standard tag presets"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default Tags</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Delete Confirmation Sub-Dialog */}
      {tagPendingDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Delete #{tagPendingDelete.name} Tag?
                </h3>
                <p className="text-xs text-slate-500">
                  Are you sure you want to remove this tag from your configured tags?
                </p>
              </div>
            </div>

            {/* Checkbox: Remove tag from tagged items if any */}
            {(tagUsageMap.get(tagPendingDelete.name.toLowerCase()) || 0) > 0 && (
              <label className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={removeTagFromItemsOnDelete}
                  onChange={(e) => setRemoveTagFromItemsOnDelete(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <span>
                  Also remove tag <strong>#{tagPendingDelete.name}</strong> from all{' '}
                  <strong>{tagUsageMap.get(tagPendingDelete.name.toLowerCase())}</strong> stock items
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTagPendingDelete(null);
                  setRemoveTagFromItemsOnDelete(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                Delete Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
