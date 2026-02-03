/**
 * Demo Date Utility
 * 
 * This module provides dynamic date handling for DEMO MODE only.
 * It normalizes timestamps at the PRESENTATION/UI layer to make dates
 * appear relative to the current date without altering actual database timestamps.
 * 
 * DESIGN PRINCIPLES:
 * - UI-layer only transformation (database untouched)
 * - Easily reversible and safe for production
 * - Feature-flagged via environment variable or runtime config
 * - Maintains relative time differences between records
 * 
 * @module demo-date-utils
 */

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface DemoDateConfig {
  /** Whether demo mode is enabled */
  enabled: boolean;
  /** Reference date for demo (defaults to current date) */
  referenceDate?: Date;
  /** Anchor date - the oldest date in demo data that maps to referenceDate minus maxAgeDays */
  anchorDate?: Date;
  /** Maximum age in days for demo dates (older dates get compressed) */
  maxAgeDays: number;
  /** Preserve time of day when shifting dates */
  preserveTimeOfDay: boolean;
}

export interface DateFieldMapping {
  /** Original field name in the data */
  field: string;
  /** Whether this is a future date (e.g., expiry_date, needed_by) */
  isFutureDate?: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Default demo configuration
 * Can be overridden at runtime
 */
const DEFAULT_CONFIG: DemoDateConfig = {
  enabled: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  maxAgeDays: 14, // Demo data spans at most 14 days back
  preserveTimeOfDay: true,
};

/**
 * Common date fields found in the application
 */
export const COMMON_DATE_FIELDS: DateFieldMapping[] = [
  { field: 'created_at', isFutureDate: false },
  { field: 'updated_at', isFutureDate: false },
  { field: 'createdAt', isFutureDate: false },
  { field: 'updatedAt', isFutureDate: false },
  { field: 'posted_on', isFutureDate: false },
  { field: 'donation_date', isFutureDate: false },
  { field: 'request_date', isFutureDate: false },
  { field: 'matchedAt', isFutureDate: false },
  { field: 'pickup_time', isFutureDate: true },
  { field: 'pickupTime', isFutureDate: true },
  { field: 'expiry_date', isFutureDate: true },
  { field: 'expiryDate', isFutureDate: true },
  { field: 'needed_by', isFutureDate: true },
  { field: 'neededBy', isFutureDate: true },
  { field: 'delivery_time', isFutureDate: true },
  { field: 'deliveryTime', isFutureDate: true },
];

// =============================================================================
// RUNTIME CONFIG STATE
// =============================================================================

let currentConfig: DemoDateConfig = { ...DEFAULT_CONFIG };
let anchorTimestamp: number | null = null;
let referenceTimestamp: number | null = null;

/**
 * Update demo mode configuration at runtime
 * Useful for toggling demo mode without restart
 */
export function configureDemoMode(config: Partial<DemoDateConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  
  // Reset computed anchors when config changes
  anchorTimestamp = null;
  referenceTimestamp = null;
  
  console.log('[DemoDateUtils] Configuration updated:', {
    enabled: currentConfig.enabled,
    maxAgeDays: currentConfig.maxAgeDays,
  });
}

/**
 * Enable demo mode
 */
export function enableDemoMode(): void {
  configureDemoMode({ enabled: true });
}

/**
 * Disable demo mode (production mode)
 */
export function disableDemoMode(): void {
  configureDemoMode({ enabled: false });
}

/**
 * Check if demo mode is currently enabled
 */
export function isDemoModeEnabled(): boolean {
  return currentConfig.enabled;
}

// =============================================================================
// CORE DATE TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Calculate the time offset needed to shift dates to current time
 * This finds the oldest date in a dataset and calculates how much to shift
 * so that date becomes `maxAgeDays` ago from now.
 */
function calculateTimeOffset(oldestDate: Date): number {
  const now = currentConfig.referenceDate || new Date();
  const maxAgeMs = currentConfig.maxAgeDays * 24 * 60 * 60 * 1000;
  const targetOldestDate = new Date(now.getTime() - maxAgeMs);
  
  return targetOldestDate.getTime() - oldestDate.getTime();
}

/**
 * Shift a single date by the calculated offset
 * Optionally preserves the time of day
 */
function shiftDate(date: Date, offsetMs: number): Date {
  const shifted = new Date(date.getTime() + offsetMs);
  
  if (currentConfig.preserveTimeOfDay) {
    // Keep the same hours, minutes, seconds
    return shifted;
  }
  
  return shifted;
}

/**
 * Normalize a single timestamp to demo-relative time
 * 
 * @param timestamp - Original ISO timestamp string
 * @param isFutureDate - Whether this date is expected to be in the future
 * @param anchorOffsetMs - Pre-calculated offset (for batch processing)
 * @returns Normalized ISO timestamp string
 */
export function normalizeDemoTimestamp(
  timestamp: string | null | undefined,
  isFutureDate: boolean = false,
  anchorOffsetMs?: number
): string {
  if (!timestamp || !currentConfig.enabled) {
    return timestamp || '';
  }

  try {
    const originalDate = new Date(timestamp);
    
    if (isNaN(originalDate.getTime())) {
      return timestamp; // Invalid date, return as-is
    }

    const now = currentConfig.referenceDate || new Date();
    const offset = anchorOffsetMs ?? calculateTimeOffset(originalDate);
    
    let normalizedDate = shiftDate(originalDate, offset);
    
    // For future dates (expiry, pickup, etc.), ensure they remain in the future
    if (isFutureDate && normalizedDate < now) {
      // Calculate original relative offset from creation time
      // and apply that offset from current time
      const hoursInFuture = Math.max(
        2, // Minimum 2 hours in future
        Math.round((originalDate.getTime() - new Date(timestamp).getTime()) / (1000 * 60 * 60))
      );
      normalizedDate = new Date(now.getTime() + hoursInFuture * 60 * 60 * 1000);
    }

    return normalizedDate.toISOString();
  } catch (error) {
    console.warn('[DemoDateUtils] Failed to normalize timestamp:', timestamp, error);
    return timestamp;
  }
}

/**
 * Calculate the oldest date in a dataset for offset computation
 */
function findOldestDate<T extends Record<string, any>>(
  items: T[],
  dateFields: DateFieldMapping[] = COMMON_DATE_FIELDS
): Date | null {
  let oldest: Date | null = null;

  for (const item of items) {
    for (const { field, isFutureDate } of dateFields) {
      if (isFutureDate) continue; // Skip future dates for anchor calculation
      
      const value = item[field];
      if (!value) continue;

      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) continue;

        if (!oldest || date < oldest) {
          oldest = date;
        }
      } catch {
        continue;
      }
    }
  }

  return oldest;
}

// =============================================================================
// MAIN PUBLIC API
// =============================================================================

/**
 * Normalize all date fields in a single object for demo display
 * 
 * @param item - The data object containing date fields
 * @param fields - Which fields to normalize (defaults to common date fields)
 * @returns New object with normalized dates (original unchanged)
 * 
 * @example
 * ```typescript
 * const donation = {
 *   id: '123',
 *   food_type: 'Vegetables',
 *   created_at: '2024-11-15T10:00:00Z',
 *   expiry_date: '2024-11-16T18:00:00Z',
 * };
 * 
 * const normalized = normalizeDemoItem(donation);
 * // created_at is now relative to today
 * // expiry_date remains in the future
 * ```
 */
export function normalizeDemoItem<T extends Record<string, any>>(
  item: T,
  fields: DateFieldMapping[] = COMMON_DATE_FIELDS
): T {
  if (!currentConfig.enabled || !item) {
    return item;
  }

  // Find the created_at to use as anchor for this item
  let anchorDate: Date | null = null;
  for (const { field, isFutureDate } of fields) {
    if (!isFutureDate && item[field]) {
      try {
        const date = new Date(item[field]);
        if (!isNaN(date.getTime())) {
          anchorDate = date;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (!anchorDate) {
    return item;
  }

  const offset = calculateTimeOffset(anchorDate);
  const normalized = { ...item };

  for (const { field, isFutureDate } of fields) {
    if (normalized[field]) {
      (normalized as any)[field] = normalizeDemoTimestamp(
        normalized[field],
        isFutureDate,
        offset
      );
    }
  }

  return normalized;
}

/**
 * Normalize all date fields in an array of objects
 * Maintains relative time differences between items
 * 
 * @param items - Array of data objects
 * @param fields - Which fields to normalize
 * @returns New array with normalized dates (originals unchanged)
 * 
 * @example
 * ```typescript
 * const donations = await fetchDonations();
 * const normalizedDonations = normalizeDemoItems(donations);
 * // All dates are now current-looking while maintaining relative order
 * ```
 */
export function normalizeDemoItems<T extends Record<string, any>>(
  items: T[],
  fields: DateFieldMapping[] = COMMON_DATE_FIELDS
): T[] {
  if (!currentConfig.enabled || !items || items.length === 0) {
    return items;
  }

  // Find the global oldest date across all items
  const oldestDate = findOldestDate(items, fields);
  
  if (!oldestDate) {
    return items;
  }

  const globalOffset = calculateTimeOffset(oldestDate);

  return items.map(item => {
    const normalized = { ...item };

    for (const { field, isFutureDate } of fields) {
      if (normalized[field]) {
        (normalized as any)[field] = normalizeDemoTimestamp(
          normalized[field],
          isFutureDate,
          globalOffset
        );
      }
    }

    return normalized;
  });
}

// =============================================================================
// DISPLAY HELPERS
// =============================================================================

/**
 * Format a date for display with optional demo normalization
 * Automatically applies demo mode transformation if enabled
 * 
 * @param timestamp - ISO timestamp string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDemoDate(
  timestamp: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!timestamp) return '';

  const normalized = currentConfig.enabled
    ? normalizeDemoTimestamp(timestamp)
    : timestamp;

  try {
    const date = new Date(normalized);
    return date.toLocaleString(undefined, options);
  } catch {
    return timestamp;
  }
}

/**
 * Get relative time string ("2 hours ago", "in 3 days")
 * Works correctly in demo mode
 * 
 * @param timestamp - ISO timestamp string
 * @returns Human-readable relative time string
 */
export function getRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '';

  const normalized = currentConfig.enabled
    ? normalizeDemoTimestamp(timestamp)
    : timestamp;

  try {
    const date = new Date(normalized);
    const now = currentConfig.referenceDate || new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (Math.abs(diffMins) < 60) {
      if (diffMins === 0) return 'just now';
      if (diffMins > 0) return `in ${diffMins} minute${diffMins === 1 ? '' : 's'}`;
      return `${Math.abs(diffMins)} minute${Math.abs(diffMins) === 1 ? '' : 's'} ago`;
    }

    if (Math.abs(diffHours) < 24) {
      if (diffHours > 0) return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
      return `${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? '' : 's'} ago`;
    }

    if (diffDays > 0) return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  } catch {
    return '';
  }
}

/**
 * Get time until expiry with demo normalization
 * 
 * @param expiryTimestamp - Expiry date ISO string
 * @returns Object with hours remaining and urgency level
 */
export function getExpiryInfo(expiryTimestamp: string | null | undefined): {
  hoursRemaining: number;
  urgencyLevel: 'critical' | 'urgent' | 'normal' | 'expired';
  displayText: string;
} {
  if (!expiryTimestamp) {
    return {
      hoursRemaining: 0,
      urgencyLevel: 'expired',
      displayText: 'No expiry set',
    };
  }

  const normalized = currentConfig.enabled
    ? normalizeDemoTimestamp(expiryTimestamp, true)
    : expiryTimestamp;

  try {
    const expiry = new Date(normalized);
    const now = currentConfig.referenceDate || new Date();
    const hoursRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

    let urgencyLevel: 'critical' | 'urgent' | 'normal' | 'expired';
    let displayText: string;

    if (hoursRemaining <= 0) {
      urgencyLevel = 'expired';
      displayText = 'Expired';
    } else if (hoursRemaining <= 2) {
      urgencyLevel = 'critical';
      displayText = `${Math.round(hoursRemaining * 60)} mins left`;
    } else if (hoursRemaining <= 6) {
      urgencyLevel = 'urgent';
      displayText = `${Math.round(hoursRemaining)} hours left`;
    } else if (hoursRemaining <= 24) {
      urgencyLevel = 'normal';
      displayText = `${Math.round(hoursRemaining)} hours left`;
    } else {
      urgencyLevel = 'normal';
      const days = Math.round(hoursRemaining / 24);
      displayText = `${days} day${days === 1 ? '' : 's'} left`;
    }

    return {
      hoursRemaining: Math.max(0, hoursRemaining),
      urgencyLevel,
      displayText,
    };
  } catch {
    return {
      hoursRemaining: 0,
      urgencyLevel: 'expired',
      displayText: 'Invalid date',
    };
  }
}

// =============================================================================
// REACT HOOK (Optional - for use in components)
// =============================================================================

/**
 * Custom hook for demo date formatting
 * Re-normalizes dates when demo mode changes
 */
export function useDemoDate<T extends Record<string, any>>(
  item: T | null,
  fields?: DateFieldMapping[]
): T | null {
  if (!item) return null;
  return normalizeDemoItem(item, fields);
}

/**
 * Custom hook for demo date formatting of arrays
 */
export function useDemoDates<T extends Record<string, any>>(
  items: T[],
  fields?: DateFieldMapping[]
): T[] {
  return normalizeDemoItems(items, fields);
}

// =============================================================================
// EXPORTS
// =============================================================================

// Note: Types DemoDateConfig and DateFieldMapping are already exported via interface declarations above
export {
  DEFAULT_CONFIG,
  currentConfig as demoConfig,
};
