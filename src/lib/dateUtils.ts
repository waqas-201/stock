// ==========================================
// Date & Timezone Utilities
// Provides timezone-accurate date formatting, parsing,
// and "Today" calculations (resolving UTC vs Local discrepancies
// for users in Pakistan (PKT, UTC+5), Malaysia (MYT, UTC+8), etc.)
// ==========================================

import { useState, useEffect } from 'react';

export interface TimezoneOption {
  id: string;
  name: string;
  country: string;
  offset: string;
  abbr: string;
}

export const TIMEZONE_STORAGE_KEY = 'stock_preferred_timezone_v2';
export const TIMEZONE_CHANGE_EVENT = 'stock_timezone_changed';

export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  { id: 'auto', name: 'Auto (System / Device Time)', country: '🌐', offset: 'Auto', abbr: 'Local' },
  { id: 'Asia/Karachi', name: 'Pakistan Standard Time (PKT)', country: '🇵🇰', offset: 'UTC+5:00', abbr: 'PKT' },
  { id: 'Asia/Kuala_Lumpur', name: 'Malaysia Time (MYT)', country: '🇲🇾', offset: 'UTC+8:00', abbr: 'MYT' },
  { id: 'Asia/Dubai', name: 'Gulf Standard Time (GST)', country: '🇦🇪', offset: 'UTC+4:00', abbr: 'GST' },
  { id: 'Asia/Riyadh', name: 'Arabia Standard Time (AST)', country: '🇸🇦', offset: 'UTC+3:00', abbr: 'AST' },
  { id: 'UTC', name: 'Coordinated Universal Time (UTC)', country: '🌍', offset: 'UTC+0:00', abbr: 'UTC' },
  { id: 'Europe/London', name: 'London Time (GMT/BST)', country: '🇬🇧', offset: 'UTC+0/+1', abbr: 'UK' },
  { id: 'America/New_York', name: 'Eastern Time (US / Canada)', country: '🇺🇸', offset: 'UTC-5/-4', abbr: 'EST' },
];

/**
 * Returns the user's stored timezone or defaults to 'auto'
 */
export function getStoredTimezone(): string {
  try {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Ignore localStorage access errors
  }
  return 'auto';
}

/**
 * Persists the user's selected timezone and notifies listeners
 */
export function setStoredTimezone(tz: string): void {
  try {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TIMEZONE_CHANGE_EVENT, { detail: tz }));
    }
  } catch (err) {
    console.error('Failed to save preferred timezone:', err);
  }
}

/**
 * Resolves 'auto' into the actual browser/system IANA timezone identifier
 */
export function getResolvedTimezone(tz?: string): string {
  const chosen = tz || getStoredTimezone();
  if (chosen && chosen !== 'auto') {
    return chosen;
  }
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) return detected;
  } catch {
    // Fallback if Intl fails
  }
  return 'UTC';
}

/**
 * Gets a clean, formatted abbreviation for the active timezone (e.g. "PKT", "MYT")
 */
export function getTimezoneAbbreviation(tz?: string, date = new Date()): string {
  const resolved = getResolvedTimezone(tz);
  const found = SUPPORTED_TIMEZONES.find((t) => t.id === (tz || getStoredTimezone()));
  if (found && found.id !== 'auto') {
    return found.abbr;
  }
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      timeZoneName: 'short',
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : resolved.split('/').pop()?.replace('_', ' ') || 'Local';
  } catch {
    return 'Local';
  }
}

/**
 * Returns today's date formatted strictly as 'YYYY-MM-DD' in the active timezone.
 * CRITICAL FIX: NEVER uses new Date().toISOString().split('T')[0] because that forces
 * UTC, which causes late-night/early-morning dates in Pakistan (UTC+5) or Malaysia (UTC+8)
 * to be stamped with yesterday's date.
 */
export function getTodayDateString(tz?: string): string {
  const resolved = getResolvedTimezone(tz);
  try {
    // en-CA produces YYYY-MM-DD
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: resolved,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Formats a calendar date (e.g. productionDate '2026-09-22' or ISO string)
 * into a human-readable date (e.g. "Sep 22, 2026").
 * CRITICAL FIX: Avoids new Date("YYYY-MM-DD") which parses as UTC midnight
 * and shifts to the previous day in western timezones.
 */
export function formatLocalDate(
  dateInput: Date | string | number | undefined | null,
  tz?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'Not set';

  // 1. If it's a simple YYYY-MM-DD string (like productionDate), parse calendar parts directly
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [yStr, mStr, dStr] = dateInput.trim().split('-');
    const year = parseInt(yStr, 10);
    const monthIndex = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);

    const MONTH_NAMES = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
      return `${MONTH_NAMES[monthIndex]} ${day}, ${year}`;
    }
    return dateInput;
  }

  // 2. Otherwise parse as standard Date or timestamp
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const resolved = getResolvedTimezone(tz);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats full date and time in the active timezone (e.g., "Sep 22, 2026, 09:30 PM PKT")
 */
export function formatLocalDateTime(
  dateInput: Date | string | number | undefined | null,
  tz?: string,
  includeTimezoneLabel = true
): string {
  if (!dateInput) return 'Unknown';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const resolved = getResolvedTimezone(tz);
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);

    if (includeTimezoneLabel) {
      const abbr = getTimezoneAbbreviation(tz, d);
      return `${formatted} ${abbr}`;
    }
    return formatted;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats time only in the active timezone (e.g., "09:30 PM")
 */
export function formatLocalTime(
  dateInput: Date | string | number | undefined | null,
  tz?: string
): string {
  if (!dateInput) return '';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const resolved = getResolvedTimezone(tz);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Calendar-aware relative time calculation.
 * Compares event day against "Today" and "Yesterday" in the user's active timezone.
 * Returns:
 * - "Just now" (if within 60s)
 * - "Xm ago" (if within 60m)
 * - "Today, 2:30 PM" (if done earlier today)
 * - "Yesterday, 10:15 PM" (if done yesterday)
 * - "Sep 18, 2026, 4:00 PM" (if older)
 */
export function formatCalendarRelativeTime(
  dateInput: Date | string | number | undefined | null,
  tz?: string
): string {
  if (!dateInput) return '';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    // If within 1 minute
    if (diffMins < 1 && diffMs >= 0) return 'Just now';
    // If within 59 minutes
    if (diffMins < 60 && diffMs >= 0) return `${diffMins}m ago`;

    // Compare calendar days in the resolved timezone
    const resolved = getResolvedTimezone(tz);
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: resolved,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const eventDayStr = dateFormatter.format(d);
    const todayStr = dateFormatter.format(now);

    const timeStr = formatLocalTime(d, tz);

    if (eventDayStr === todayStr) {
      return `Today, ${timeStr}`;
    }

    // Check if it was yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dateFormatter.format(yesterday);

    if (eventDayStr === yesterdayStr) {
      return `Yesterday, ${timeStr}`;
    }

    // Older events: Show Date and Time
    return `${formatLocalDate(d, tz)}, ${timeStr}`;
  } catch {
    return '';
  }
}

/**
 * Returns a date range spanning `days` past days up to Today in the active timezone.
 * Both `startStr` and `endStr` are returned as 'YYYY-MM-DD' strings in local time.
 */
export function getLocalDateRange(
  days: number,
  tz?: string
): {
  startDate: Date;
  endDate: Date;
  startStr: string;
  endStr: string;
} {
  const resolved = getResolvedTimezone(tz);
  const now = new Date();

  // End date is today at 23:59:59.999
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  // Start date is `days - 1` days ago at 00:00:00.000
  const start = new Date(now);
  start.setDate(start.getDate() - (Math.max(1, days) - 1));
  start.setHours(0, 0, 0, 0);

  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolved,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const endStr = dateFormatter.format(end);
  const startStr = dateFormatter.format(start);

  return {
    startDate: start,
    endDate: end,
    startStr,
    endStr,
  };
}

/**
 * Safely parses a 'YYYY-MM-DD' date string into a Date object representing
 * the start of day (00:00:00.000) or end of day (23:59:59.999).
 * Prevents UTC string parsing shifts (which cause dates to show 1 day before).
 */
export function parseLocalDateBoundary(
  dateStr: string,
  isEndOfDay: boolean = false,
  _tz?: string
): Date {
  if (!dateStr || !dateStr.includes('-')) {
    const fallback = new Date();
    if (isEndOfDay) fallback.setHours(23, 59, 59, 999);
    else fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  const parts = dateStr.trim().split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  if (isEndOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

/**
 * React hook to listen for active timezone changes
 */
export function useActiveTimezone(): {
  timezone: string;
  resolvedTimezone: string;
  timezoneAbbr: string;
  setTimezone: (tz: string) => void;
} {
  const [tz, setTz] = useState<string>(() => getStoredTimezone());

  useEffect(() => {
    const handleTzChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setTz(customEvent.detail || getStoredTimezone());
    };

    window.addEventListener(TIMEZONE_CHANGE_EVENT, handleTzChange);
    return () => {
      window.removeEventListener(TIMEZONE_CHANGE_EVENT, handleTzChange);
    };
  }, []);

  const changeTimezone = (newTz: string) => {
    setTz(newTz);
    setStoredTimezone(newTz);
  };

  const resolved = getResolvedTimezone(tz);
  const abbr = getTimezoneAbbreviation(tz);

  return {
    timezone: tz,
    resolvedTimezone: resolved,
    timezoneAbbr: abbr,
    setTimezone: changeTimezone,
  };
}
