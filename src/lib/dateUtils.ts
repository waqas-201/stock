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
 * Audit Trail Elapsed Time Formatter:
 * Computes exact hours elapsed (or "minutes ago" if under 1 hour).
 * Never formats as "yesterday", "X days ago", or calendar dates,
 * preventing redundancy with the explicit timestamp shown directly below it in audit trail boxes.
 *
 * Output examples:
 * - Event within the last hour: "minutes ago"
 * - Event 1 hr ago: "1 hour ago"
 * - Event 2 hrs ago: "2 hours ago"
 * - Event 10 hrs ago: "10 hours ago"
 * - Event 50 hrs ago: "50 hours ago"
 * - Event 100 hrs ago: "100 hours ago"
 * - Event 1000 hrs ago: "1000 hours ago"
 */
export function formatAuditTrailElapsedTime(
  dateInput: Date | string | number | undefined | null
): string {
  if (!dateInput) return '';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    // If less than 1 hour (including very recent actions)
    if (diffMs < 3600000) {
      return 'minutes ago';
    }

    const diffHours = Math.floor(diffMs / 3600000);
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } catch {
    return '';
  }
}

/**
 * Computes an exact Date representing the boundary of a calendar date in the active timezone.
 * When isEndOfDay is false: 00:00:00.000 in the target timezone.
 * When isEndOfDay is true:  23:59:59.999 in the target timezone.
 */
export function getTimezoneBoundaryDate(
  dateStr: string,
  isEndOfDay: boolean = false,
  tz?: string
): Date {
  const resolved = getResolvedTimezone(tz);
  const cleanStr = (dateStr || '').trim();
  if (!cleanStr.includes('-')) {
    const fallback = new Date();
    if (isEndOfDay) fallback.setHours(23, 59, 59, 999);
    else fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  const [yStr, mStr, dStr] = cleanStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    const fallback = new Date();
    if (isEndOfDay) fallback.setHours(23, 59, 59, 999);
    else fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  // If auto or system timezone, use local Date constructor
  if (tz === 'auto' || resolved === Intl.DateTimeFormat().resolvedOptions().timeZone) {
    const localD = new Date(y, m - 1, d);
    if (isEndOfDay) localD.setHours(23, 59, 59, 999);
    else localD.setHours(0, 0, 0, 0);
    return localD;
  }

  // For specific timezone: extract GMT offset for this date in resolved timezone
  try {
    const testDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: resolved,
      timeZoneName: 'longOffset',
    }).formatToParts(testDate);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;

    let offset = '+00:00';
    if (tzPart) {
      const match = tzPart.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
      if (match) {
        const sign = match[1][0];
        const hours = Math.abs(parseInt(match[1], 10)).toString().padStart(2, '0');
        const mins = match[2] || '00';
        offset = `${sign}${hours}:${mins}`;
      }
    }

    const timePart = isEndOfDay ? '23:59:59.999' : '00:00:00.000';
    const isoString = `${cleanStr}T${timePart}${offset}`;
    const parsed = new Date(isoString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (err) {
    console.warn('Error calculating timezone boundary:', err);
  }

  // Fallback
  const fallback = new Date(y, m - 1, d);
  if (isEndOfDay) fallback.setHours(23, 59, 59, 999);
  else fallback.setHours(0, 0, 0, 0);
  return fallback;
}

/**
 * Returns a date range spanning `days` past days up to Today in the active timezone.
 * Both `startStr` and `endStr` are returned as 'YYYY-MM-DD' strings in local time.
 * `startDate` and `endDate` are exact Date timestamps bounded to 00:00:00.000 and 23:59:59.999 in that timezone.
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
  
  // 1. Get today's calendar date string strictly in the user's active timezone
  const todayStr = getTodayDateString(resolved); // 'YYYY-MM-DD'
  const [y, m, d] = todayStr.split('-').map(Number);

  // 2. Compute start calendar date `days - 1` days prior using UTC date math
  const pastUtc = new Date(Date.UTC(y, m - 1, d - (Math.max(1, days) - 1), 12, 0, 0));
  const startFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolved,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const startStr = startFormatter.format(pastUtc);
  const endStr = todayStr;

  const startDate = getTimezoneBoundaryDate(startStr, false, resolved);
  const endDate = getTimezoneBoundaryDate(endStr, true, resolved);

  return {
    startDate,
    endDate,
    startStr,
    endStr,
  };
}

/**
 * Returns a time boundary range for a given number of past hours (e.g. 10h, 20h, 48h, 72h)
 * calculated relative to the exact current moment.
 */
export function getRecentHoursRange(
  hours: number,
  tz?: string
): {
  startDate: Date;
  endDate: Date;
  startStr: string;
  endStr: string;
} {
  const resolved = getResolvedTimezone(tz);
  const now = new Date();
  const pastMs = now.getTime() - Math.max(1, hours) * 60 * 60 * 1000;
  const startDate = new Date(pastMs);
  const endDate = now;
  const startStr = getLocalDateString(startDate, resolved);
  const endStr = getLocalDateString(endDate, resolved);
  return {
    startDate,
    endDate,
    startStr,
    endStr,
  };
}

/**
 * Safely parses a 'YYYY-MM-DD' date string into a Date object representing
 * the start of day (00:00:00.000) or end of day (23:59:59.999) in the active timezone.
 */
export function parseLocalDateBoundary(
  dateStr: string,
  isEndOfDay: boolean = false,
  tz?: string
): Date {
  return getTimezoneBoundaryDate(dateStr, isEndOfDay, tz);
}

/**
 * Returns a given date formatted strictly as 'YYYY-MM-DD' in the active timezone.
 */
export function getLocalDateString(date?: string | Date | null, tz?: string): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const resolved = getResolvedTimezone(tz);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: resolved,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Checks if an event timestamp matches "Today" in the specified timezone.
 * Completely immune to UTC midnight rollover discrepancies.
 */
export function isDateMatchingToday(timestamp?: string | null, tz?: string): boolean {
  if (!timestamp) return false;
  const eventDate = getLocalDateString(timestamp, tz);
  const todayDate = getTodayDateString(tz);
  return Boolean(eventDate && todayDate && eventDate === todayDate);
}

/**
 * Checks if an event timestamp falls within [startStr, endStr] in the specified timezone.
 */
export function isDateInLocalRange(
  timestamp?: string | null,
  startStr?: string | null,
  endStr?: string | null,
  tz?: string
): boolean {
  if (!timestamp) return false;
  if (!startStr && !endStr) return true;
  const eventDate = getLocalDateString(timestamp, tz);
  if (!eventDate) return false;
  if (startStr && eventDate < startStr) return false;
  if (endStr && eventDate > endStr) return false;
  return true;
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
