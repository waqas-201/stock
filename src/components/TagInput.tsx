import React, { useState, KeyboardEvent, useMemo, useRef } from 'react';
import {
  Tag as TagIcon,
  X,
  Plus,
  Hash,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  CheckCircle2,
} from 'lucide-react';
import { getTagStyle, POPULAR_TAG_SUGGESTIONS } from '../lib/tagUtils';
import { TAG_COLOR_OPTIONS, getTagColorOption, saveManagedTags, loadManagedTags } from '../lib/tagStorage';
import { StockTag, StockLabel, StockTagColor } from '../types';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  availableTags?: string[];
  managedTags?: StockTag[];
  managedLabels?: StockLabel[];
  placeholder?: string;
  maxTags?: number;
  onCreateTag?: (name: string, color: StockTagColor, description?: string) => void;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  availableTags = [],
  managedTags,
  managedLabels = [],
  placeholder = 'Add a tag (e.g. Office, Food, Fragile)...',
  maxTags = 12,
  onCreateTag,
}) => {
  const effectiveTags: StockTag[] = managedTags || (managedLabels as unknown as StockTag[]) || [];

  // Main tag input
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Search through all tags
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [showAllTagsExpanded, setShowAllTagsExpanded] = useState(false);

  // Custom New Tag Creator Popover/Form
  const [isCreatingNewTag, setIsCreatingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<StockTagColor>('emerald');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagError, setNewTagError] = useState<string | null>(null);

  const mainInputRef = useRef<HTMLInputElement>(null);
  const newTagNameInputRef = useRef<HTMLInputElement>(null);

  // Add an existing or clean tag string to current product tags
  const addTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#+/, '').trim();
    if (!clean) return;
    if (clean.length > 35) return;

    // Check if tag already exists in current product (case-insensitive)
    const exists = tags.some((t) => t.toLowerCase() === clean.toLowerCase());
    if (!exists && tags.length < maxTags) {
      onChange([...tags, clean]);
    }
    setInputValue('');
  };

  // Toggle tag: if already added, remove it; if not, add it
  const toggleTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#+/, '').trim();
    if (!clean) return;

    const existingIndex = tags.findIndex((t) => t.toLowerCase() === clean.toLowerCase());
    if (existingIndex >= 0) {
      removeTag(existingIndex);
    } else {
      addTag(clean);
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  // Handle keyboard submission in the main tag input field
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  // Compile the master catalog of ALL known tags across managed catalog, existing items, and popular presets
  const allKnownTags = useMemo(() => {
    const tagMap = new Map<
      string,
      { name: string; color?: StockTagColor; isManaged: boolean; description?: string }
    >();

    // 1. First add managed tags (they carry specific colors and descriptions)
    effectiveTags.forEach((mt) => {
      if (mt && mt.name && mt.name.trim()) {
        const clean = mt.name.trim();
        tagMap.set(clean.toLowerCase(), {
          name: clean,
          color: mt.color,
          isManaged: true,
          description: mt.description,
        });
      }
    });

    // 2. Add available inventory tags
    availableTags.forEach((at) => {
      if (at && at.trim()) {
        const clean = at.trim();
        const lower = clean.toLowerCase();
        if (!tagMap.has(lower)) {
          tagMap.set(lower, {
            name: clean,
            isManaged: false,
          });
        }
      }
    });

    // 3. Add popular preset suggestions
    POPULAR_TAG_SUGGESTIONS.forEach((pt) => {
      const clean = pt.trim();
      const lower = clean.toLowerCase();
      if (!tagMap.has(lower)) {
        tagMap.set(lower, {
          name: clean,
          isManaged: false,
        });
      }
    });

    return Array.from(tagMap.values());
  }, [effectiveTags, availableTags]);

  // Combined search filter (from either the dedicated search bar or what the user is typing in the input)
  const activeSearchTerm = (tagSearchQuery.trim() || inputValue.trim()).toLowerCase();

  // Filtered tags based on active search
  const filteredAllTags = useMemo(() => {
    if (!activeSearchTerm) return allKnownTags;
    return allKnownTags.filter((item) =>
      item.name.toLowerCase().includes(activeSearchTerm) ||
      (item.description && item.description.toLowerCase().includes(activeSearchTerm))
    );
  }, [allKnownTags, activeSearchTerm]);

  // Check if activeSearchTerm matches an existing tag exactly
  const exactMatchExists = useMemo(() => {
    if (!activeSearchTerm) return true;
    return allKnownTags.some((t) => t.name.toLowerCase() === activeSearchTerm);
  }, [allKnownTags, activeSearchTerm]);

  // Handle creating a brand new tag in the system and attaching it to the product
  const handleCreateNewTagSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setNewTagError(null);

    const clean = newTagName.trim().replace(/^#+/, '').trim();
    if (!clean) {
      setNewTagError('Please enter a tag name');
      return;
    }

    if (clean.length > 35) {
      setNewTagError('Tag name cannot exceed 35 characters');
      return;
    }

    // Call external creator if available
    if (onCreateTag) {
      onCreateTag(clean, newTagColor, newTagDescription.trim() || undefined);
    } else {
      // Fallback: persist to local storage managed tags
      try {
        const currentStored = loadManagedTags();
        const alreadyInStored = currentStored.some(
          (t) => t.name.toLowerCase() === clean.toLowerCase()
        );
        if (!alreadyInStored) {
          const newManagedTag: StockTag = {
            id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: clean,
            color: newTagColor,
            description: newTagDescription.trim() || undefined,
            isDefault: false,
          };
          saveManagedTags([...currentStored, newManagedTag]);
        }
      } catch (err) {
        console.error('Failed to save new tag locally:', err);
      }
    }

    // Add to current product tags
    addTag(clean);

    // Reset and close creator
    setNewTagName('');
    setNewTagDescription('');
    setNewTagColor('emerald');
    setIsCreatingNewTag(false);
    setTagSearchQuery('');
  };

  // Quick 1-click create from search term
  const handleQuickCreateFromSearch = (rawName: string) => {
    const clean = rawName.trim().replace(/^#+/, '').trim();
    if (!clean) return;

    if (onCreateTag) {
      onCreateTag(clean, 'emerald');
    } else {
      try {
        const currentStored = loadManagedTags();
        if (!currentStored.some((t) => t.name.toLowerCase() === clean.toLowerCase())) {
          saveManagedTags([
            ...currentStored,
            {
              id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              name: clean,
              color: 'emerald',
              isDefault: false,
            },
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    }

    addTag(clean);
    setInputValue('');
    setTagSearchQuery('');
  };

  const isSelected = (tagName: string) =>
    tags.some((t) => t.toLowerCase() === tagName.toLowerCase());

  // Visible tag chips count limit when not searching
  const initialDisplayLimit = 14;
  const displayedTags =
    activeSearchTerm || showAllTagsExpanded
      ? filteredAllTags
      : filteredAllTags.slice(0, initialDisplayLimit);

  return (
    <div id="product-tag-input-container" className="space-y-2.5">
      {/* Label and counter */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="tag-input-field"
          className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5"
        >
          <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>Product Tags</span>
          <span className="text-xs font-normal text-slate-400">(Categorization)</span>
        </label>
        <span
          className={`text-[11px] font-medium ${
            tags.length >= maxTags ? 'text-amber-600 font-bold' : 'text-slate-400'
          }`}
        >
          {tags.length} / {maxTags} selected
        </span>
      </div>

      {/* Main Tag Selection & Typing Box */}
      <div
        id="tag-input-box"
        className={`min-h-[46px] p-2 bg-white border rounded-xl flex flex-wrap items-center gap-1.5 transition-all ${
          isFocused
            ? 'border-emerald-600 ring-2 ring-emerald-600/20'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        onClick={() => mainInputRef.current?.focus()}
      >
        {tags.map((tag, index) => {
          const style = getTagStyle(tag, effectiveTags);
          return (
            <span
              key={`${tag}-${index}`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border} transition-all animate-in zoom-in-95 duration-150`}
            >
              <Hash className="w-3 h-3 opacity-60" />
              <span>{tag}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 text-current ml-0.5 cursor-pointer"
                title={`Remove ${tag}`}
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        {tags.length < maxTags && (
          <div className="flex items-center gap-1 flex-1 min-w-[140px]">
            <input
              ref={mainInputRef}
              id="tag-input-field"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={tags.length === 0 ? placeholder : 'Type to add or filter tags...'}
              className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-none outline-hidden py-1 px-1"
            />
            {inputValue.trim() && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addTag(inputValue);
                }}
                className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-md shrink-0 cursor-pointer shadow-2xs"
              >
                Add
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline Create New Tag Panel (Expanded on Demand) */}
      {isCreatingNewTag && (
        <div
          id="inline-create-new-tag-panel"
          className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Palette className="w-3.5 h-3.5 text-emerald-600" />
              <span>Register New System Tag</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreatingNewTag(false);
                setNewTagError(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-emerald-100/60 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {newTagError && (
            <div className="text-[11px] font-medium text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
              {newTagError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="create-tag-name-input"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1"
              >
                Tag Name <span className="text-rose-500">*</span>
              </label>
              <input
                ref={newTagNameInputRef}
                id="create-tag-name-input"
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g., Electronics, Perishable"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateNewTagSubmit();
                  }
                }}
              />
            </div>

            <div>
              <label
                htmlFor="create-tag-desc-input"
                className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1"
              >
                Description (Optional)
              </label>
              <input
                id="create-tag-desc-input"
                type="text"
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                placeholder="e.g., Delicate or sensitive stock"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Color Palette Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Tag Color Theme
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TAG_COLOR_OPTIONS.map((c) => {
                const isCurrent = newTagColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewTagColor(c.id as StockTagColor)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                      isCurrent
                        ? `${c.activeBg} ring-2 ring-emerald-500/40 shadow-xs font-bold`
                        : `${c.bg} ${c.text} ${c.border} hover:opacity-80`
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsCreatingNewTag(false);
                setNewTagError(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-create-tag-btn"
              onClick={() => handleCreateNewTagSubmit()}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Create & Add Tag</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEARCHABLE SUGGESTIONS & ALL TAGS EXPLORER                                */}
      {/* ========================================================================= */}
      <div
        id="searchable-tags-explorer"
        className="p-3 bg-slate-50/80 border border-slate-200/90 rounded-xl space-y-2.5"
      >
        {/* Header toolbar: Search across all tags & New Tag button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Search & Suggested Tags</span>
            <span className="text-[11px] font-normal text-slate-400">
              ({allKnownTags.length} available)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isCreatingNewTag && (
              <button
                type="button"
                id="btn-open-create-new-tag"
                onClick={() => {
                  setIsCreatingNewTag(true);
                  setNewTagName(tagSearchQuery.trim() || inputValue.trim() || '');
                  setTimeout(() => newTagNameInputRef.current?.focus(), 60);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Create a custom new tag with color options"
              >
                <Plus className="w-3 h-3" />
                <span>New Tag</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Search Box across all tags */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-all-tags-input"
            type="text"
            value={tagSearchQuery}
            onChange={(e) => setTagSearchQuery(e.target.value)}
            placeholder="Search through all tags..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
          />
          {tagSearchQuery && (
            <button
              type="button"
              onClick={() => setTagSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Action Prompt: If user searches for a tag that doesn't exist yet, offer 1-click create */}
        {activeSearchTerm && !exactMatchExists && (
          <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg gap-2 animate-in fade-in duration-150">
            <div className="text-xs text-emerald-900 flex items-center gap-1.5 min-w-0">
              <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                Tag &ldquo;<strong className="font-bold">{activeSearchTerm}</strong>&rdquo; not found.
              </span>
            </div>
            <button
              type="button"
              id="quick-add-new-tag-from-search"
              onClick={() => handleQuickCreateFromSearch(activeSearchTerm)}
              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-md shrink-0 shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add &ldquo;{activeSearchTerm}&rdquo;</span>
            </button>
          </div>
        )}

        {/* Tags List Container */}
        {displayedTags.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap max-h-48 overflow-y-auto pr-1">
            {displayedTags.map((item) => {
              const selected = isSelected(item.name);
              const style = getTagStyle(item.name, effectiveTags);

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => toggleTag(item.name)}
                  className={`group relative text-xs font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                    selected
                      ? `${style.activeBg} ring-1 ring-emerald-600/30 shadow-2xs`
                      : `${style.bg} ${style.text} ${style.border} ${style.hover}`
                  }`}
                  title={
                    item.description
                      ? `${item.name}: ${item.description}`
                      : selected
                      ? `Click to remove "${item.name}"`
                      : `Click to add "${item.name}"`
                  }
                >
                  {selected ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <Plus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  )}
                  <span>{item.name}</span>
                  {item.isManaged && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ml-0.5 ${
                        selected ? 'bg-white' : getTagColorOption(item.color).dot
                      }`}
                      title="Managed catalog tag"
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-3 text-xs text-slate-500">
            No tags found matching &ldquo;{activeSearchTerm}&rdquo;.
          </div>
        )}

        {/* Expand / Collapse All Tags Footer Toggle */}
        {!activeSearchTerm && allKnownTags.length > initialDisplayLimit && (
          <div className="pt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowAllTagsExpanded((prev) => !prev)}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer py-0.5 px-2 rounded-md hover:bg-emerald-50 transition-colors"
            >
              {showAllTagsExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Show fewer tags</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Show all {allKnownTags.length} tags</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
