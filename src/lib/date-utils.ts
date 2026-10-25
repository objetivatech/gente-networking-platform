import { parseISO } from 'date-fns';

/**
 * Parse a date string (YYYY-MM-DD) to a Date object in local timezone.
 * This avoids the UTC midnight issue where dates appear 1 day behind.
 */
export function parseLocalDate(dateString: string): Date {
  // If it's already an ISO string with time, use parseISO
  if (dateString.includes('T')) {
    return parseISO(dateString);
  }
  
  // For date-only strings (YYYY-MM-DD), parse as local date
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date string for display, handling timezone correctly.
 */
export function formatLocalDate(dateString: string, formatFn: (date: Date) => string): string {
  const date = parseLocalDate(dateString);
  return formatFn(date);
}

/**
 * Today's date as YYYY-MM-DD in the America/Sao_Paulo timezone.
 * Use this instead of `new Date().toISOString().slice(0, 10)`, which returns
 * the UTC date and drifts one day ahead after 21h (BRT) — making records
 * created at night appear to start "tomorrow".
 */
export function todayLocalISODate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/**
 * Format an ISO date string (YYYY-MM-DD or full timestamp) as DD/MM/AAAA.
 * Returns the original value when it cannot be parsed as a date.
 */
export function formatDateBR(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const isoDate = dateString.slice(0, 10);
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day || year.length !== 4) return dateString;
  return `${day}/${month}/${year}`;
}
