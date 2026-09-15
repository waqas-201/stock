import React, { useState, KeyboardEvent } from 'react';
import { Tag as TagIcon, X, Plus, Hash } from 'lucide-react';
import { getTagStyle, POPULAR_TAG_SUGGESTIONS } from '../lib/tagUtils';
import { StockTag, StockLabel } from '../types';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  availableTags?: string[];
  managedTags?: StockTag[];
  managedLabels?: StockLabel[];
  placeholder?: string;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  availableTags = [],
  managedTags,
  managedLabels = [],
  placeholder = 'Add a tag (e.g. Office, Food, Fragile)...',
  maxTags = 12,
}) => {
  const effectiveTags: StockTag[] = managedTags || (managedLabels as unknown as StockTag[]) || [];
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const addTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#+/, '').trim();
    if (!clean) return;
    if (clean.length > 30) return;

    // Check if tag already exists (case-insensitive)
    const exists = tags.some((t) => t.toLowerCase() === clean.toLowerCase());
    if (!exists && tags.length < maxTags) {
      onChange([...tags, clean]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  // Compile recommended suggestions from managed tags, available inventory tags + popular presets
  const managedNames = effectiveTags.map((l) => l.name);
  const combinedSuggestions = Array.from(
    new Set([...managedNames, ...availableTags, ...POPULAR_TAG_SUGGESTIONS])
  ).filter(
    (suggested) => !tags.some((t) => t.toLowerCase() === suggested.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="space-y-2">
      {/* Label and counter */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="tag-input-field"
          className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5"
        >
          <TagIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>Product Tags</span>
          <span className="text-xs font-normal text-slate-400">(Optional)</span>
        </label>
        <span className="text-[11px] text-slate-400 font-medium">
          {tags.length} / {maxTags} tags
        </span>
      </div>

      {/* Main input & tag pill container */}
      <div
        className={`min-h-[44px] p-2 bg-white border rounded-xl flex flex-wrap items-center gap-1.5 transition-all ${
          isFocused
            ? 'border-emerald-600 ring-2 ring-emerald-600/20'
            : 'border-slate-300 hover:border-slate-400'
        }`}
        onClick={() => {
          const inputEl = document.getElementById('tag-input-field');
          inputEl?.focus();
        }}
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
              id="tag-input-field"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                if (inputValue.trim()) {
                  addTag(inputValue);
                }
              }}
              placeholder={tags.length === 0 ? placeholder : 'Add another tag...'}
              className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-none outline-hidden py-1 px-1"
            />
            {inputValue.trim() && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addTag(inputValue);
                }}
                className="px-2 py-0.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shrink-0 cursor-pointer"
              >
                Add
              </button>
            )}
          </div>
        )}
      </div>

      {/* Suggested Quick-Pick Tags */}
      {combinedSuggestions.length > 0 && tags.length < maxTags && (
        <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-0.5">
            <Plus className="w-3 h-3" />
            <span>Suggested:</span>
          </span>
          {combinedSuggestions.map((suggested) => {
            const style = getTagStyle(suggested);
            return (
              <button
                key={suggested}
                type="button"
                onClick={() => addTag(suggested)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border} ${style.hover} cursor-pointer transition-colors`}
              >
                +{suggested}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
