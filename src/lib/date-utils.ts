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
