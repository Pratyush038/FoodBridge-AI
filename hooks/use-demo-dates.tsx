'use client';

/**
 * Demo Date React Hooks
 * 
 * React hooks for easy integration of demo date normalization.
 * These hooks make it simple to apply demo mode date transforms in components.
 * 
 * @module hooks/use-demo-dates
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  isDemoModeEnabled,
  enableDemoMode,
  disableDemoMode,
  normalizeDemoItem,
  normalizeDemoItems,
  formatDemoDate,
  getRelativeTime,
  getExpiryInfo,
  DateFieldMapping,
  COMMON_DATE_FIELDS,
  configureDemoMode
} from '@/lib/demo-date-utils';

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to check and control demo mode state
 * 
 * @example
 * ```tsx
 * const { isDemoMode, toggleDemoMode, setDemoMode } = useDemoMode();
 * 
 * return (
 *   <Switch
 *     checked={isDemoMode}
 *     onCheckedChange={setDemoMode}
 *   />
 * );
 * ```
 */
export function useDemoMode() {
  const [isDemoMode, setIsDemoModeState] = useState(isDemoModeEnabled());

  const setDemoMode = useCallback((enabled: boolean) => {
    if (enabled) {
      enableDemoMode();
    } else {
      disableDemoMode();
    }
    setIsDemoModeState(enabled);
  }, []);

  const toggleDemoMode = useCallback(() => {
    setDemoMode(!isDemoMode);
  }, [isDemoMode, setDemoMode]);

  return {
    isDemoMode,
    setDemoMode,
    toggleDemoMode,
    enableDemoMode: () => setDemoMode(true),
    disableDemoMode: () => setDemoMode(false),
  };
}

/**
 * Hook to normalize a single item's dates for demo display
 * 
 * @param item - The data item containing date fields
 * @param fields - Optional custom date field mappings
 * @returns Normalized item (or original if demo mode is off)
 * 
 * @example
 * ```tsx
 * const normalizedDonation = useDemoItem(donation);
 * 
 * return (
 *   <span>Created: {normalizedDonation.created_at}</span>
 * );
 * ```
 */
export function useDemoItem<T extends Record<string, any>>(
  item: T | null | undefined,
  fields?: DateFieldMapping[]
): T | null {
  const { isDemoMode } = useDemoMode();

  return useMemo(() => {
    if (!item) return null;
    if (!isDemoMode) return item;
    return normalizeDemoItem(item, fields);
  }, [item, isDemoMode, fields]);
}

/**
 * Hook to normalize an array of items' dates for demo display
 * Maintains relative time differences between items
 * 
 * @param items - Array of data items
 * @param fields - Optional custom date field mappings
 * @returns Normalized array (or original if demo mode is off)
 * 
 * @example
 * ```tsx
 * const normalizedDonations = useDemoItems(donations);
 * 
 * return (
 *   <ul>
 *     {normalizedDonations.map(d => (
 *       <li key={d.id}>{d.created_at}</li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useDemoItems<T extends Record<string, any>>(
  items: T[] | null | undefined,
  fields?: DateFieldMapping[]
): T[] {
  const { isDemoMode } = useDemoMode();

  return useMemo(() => {
    if (!items || items.length === 0) return [];
    if (!isDemoMode) return items;
    return normalizeDemoItems(items, fields);
  }, [items, isDemoMode, fields]);
}

/**
 * Hook for formatted date display with demo normalization
 * 
 * @param timestamp - ISO timestamp string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 * 
 * @example
 * ```tsx
 * const formattedDate = useDemoFormattedDate(donation.created_at);
 * 
 * return <span>{formattedDate}</span>;
 * ```
 */
export function useDemoFormattedDate(
  timestamp: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const { isDemoMode } = useDemoMode();

  return useMemo(() => {
    if (!timestamp) return '';
    return formatDemoDate(timestamp, options);
  }, [timestamp, options, isDemoMode]);
}

/**
 * Hook for relative time display with demo normalization
 * 
 * @param timestamp - ISO timestamp string
 * @returns Human-readable relative time (e.g., "2 hours ago")
 * 
 * @example
 * ```tsx
 * const relativeTime = useDemoRelativeTime(donation.created_at);
 * 
 * return <span>Posted {relativeTime}</span>;
 * ```
 */
export function useDemoRelativeTime(
  timestamp: string | null | undefined
): string {
  const { isDemoMode } = useDemoMode();
  const [now, setNow] = useState(new Date());

  // Update every minute for live relative times
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!timestamp) return '';
    return getRelativeTime(timestamp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timestamp, isDemoMode, now]);
}

/**
 * Hook for expiry information with demo normalization
 * 
 * @param expiryTimestamp - Expiry date ISO string
 * @returns Expiry info with hours remaining and urgency level
 * 
 * @example
 * ```tsx
 * const { urgencyLevel, displayText } = useDemoExpiryInfo(donation.expiry_date);
 * 
 * return (
 *   <Badge variant={urgencyLevel === 'critical' ? 'destructive' : 'default'}>
 *     {displayText}
 *   </Badge>
 * );
 * ```
 */
export function useDemoExpiryInfo(
  expiryTimestamp: string | null | undefined
): {
  hoursRemaining: number;
  urgencyLevel: 'critical' | 'urgent' | 'normal' | 'expired';
  displayText: string;
} {
  const { isDemoMode } = useDemoMode();
  const [now, setNow] = useState(new Date());

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    return getExpiryInfo(expiryTimestamp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiryTimestamp, isDemoMode, now]);
}

/**
 * Hook that provides all demo date utilities in one object
 * Useful when multiple date operations are needed in a component
 * 
 * @example
 * ```tsx
 * const { 
 *   isDemoMode,
 *   normalizeItem,
 *   formatDate,
 *   getRelative 
 * } = useDemoDateUtils();
 * 
 * const normalized = normalizeItem(donation);
 * ```
 */
export function useDemoDateUtils() {
  const { isDemoMode, setDemoMode, toggleDemoMode } = useDemoMode();

  const normalizeItem = useCallback(<T extends Record<string, any>>(
    item: T,
    fields?: DateFieldMapping[]
  ): T => {
    if (!isDemoMode) return item;
    return normalizeDemoItem(item, fields);
  }, [isDemoMode]);

  const normalizeItems = useCallback(<T extends Record<string, any>>(
    items: T[],
    fields?: DateFieldMapping[]
  ): T[] => {
    if (!isDemoMode) return items;
    return normalizeDemoItems(items, fields);
  }, [isDemoMode]);

  const formatDate = useCallback((
    timestamp: string | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    return formatDemoDate(timestamp, options);
  }, []);

  const getRelative = useCallback((
    timestamp: string | null | undefined
  ): string => {
    return getRelativeTime(timestamp);
  }, []);

  const getExpiry = useCallback((
    timestamp: string | null | undefined
  ) => {
    return getExpiryInfo(timestamp);
  }, []);

  return {
    isDemoMode,
    setDemoMode,
    toggleDemoMode,
    normalizeItem,
    normalizeItems,
    formatDate,
    getRelative,
    getExpiry,
  };
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface DemoDateProps {
  /** ISO timestamp string */
  timestamp: string | null | undefined;
  /** Format options */
  options?: Intl.DateTimeFormatOptions;
  /** Show relative time instead of absolute */
  relative?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Simple component for displaying dates with demo mode support
 * 
 * @example
 * ```tsx
 * <DemoDate timestamp={donation.created_at} relative />
 * ```
 */
export function DemoDate({ 
  timestamp, 
  options, 
  relative = false,
  className = ''
}: DemoDateProps) {
  const formattedDate = useDemoFormattedDate(timestamp, options);
  const relativeTime = useDemoRelativeTime(timestamp);

  return (
    <span className={className}>
      {relative ? relativeTime : formattedDate}
    </span>
  );
}

interface DemoExpiryBadgeProps {
  /** Expiry timestamp */
  expiryTimestamp: string | null | undefined;
  /** Additional CSS class */
  className?: string;
}

/**
 * Badge component showing expiry status with appropriate styling
 * 
 * @example
 * ```tsx
 * <DemoExpiryBadge expiryTimestamp={donation.expiry_date} />
 * ```
 */
export function DemoExpiryBadge({ 
  expiryTimestamp, 
  className = '' 
}: DemoExpiryBadgeProps) {
  const { urgencyLevel, displayText } = useDemoExpiryInfo(expiryTimestamp);

  const colorClasses = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    urgent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    normal: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <span 
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorClasses[urgencyLevel]} ${className}`}
    >
      {displayText}
    </span>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  COMMON_DATE_FIELDS,
  configureDemoMode
};

export type { DateFieldMapping };
