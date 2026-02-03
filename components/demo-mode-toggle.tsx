'use client';

/**
 * Demo Mode Toggle Component
 * 
 * A UI control for toggling demo mode on/off.
 * When enabled, dates in the UI appear relative to the current date.
 * 
 * This component can be placed in settings, admin panel, or header.
 * It's a non-invasive, optional addition to the existing UI.
 * 
 * @module components/demo-mode-toggle
 */

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Beaker, Info, Calendar, Settings } from 'lucide-react';
import { 
  isDemoModeEnabled, 
  enableDemoMode, 
  disableDemoMode,
  configureDemoMode
} from '@/lib/demo-date-utils';

// =============================================================================
// TYPES
// =============================================================================

interface DemoModeToggleProps {
  /** Compact mode for toolbar display */
  compact?: boolean;
  /** Show label text */
  showLabel?: boolean;
  /** Callback when demo mode changes */
  onChange?: (enabled: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

interface DemoModeSettingsProps {
  /** Initial demo mode state */
  initialEnabled?: boolean;
  /** Callback when settings change */
  onSettingsChange?: (settings: { enabled: boolean; maxAgeDays: number }) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// MAIN TOGGLE COMPONENT
// =============================================================================

/**
 * Simple toggle for demo mode
 * 
 * @example
 * ```tsx
 * // In header or settings
 * <DemoModeToggle showLabel />
 * 
 * // Compact for toolbar
 * <DemoModeToggle compact />
 * ```
 */
export default function DemoModeToggle({
  compact = false,
  showLabel = true,
  onChange,
  className = '',
}: DemoModeToggleProps) {
  const [enabled, setEnabled] = useState(false);

  // Sync with actual demo mode state
  useEffect(() => {
    setEnabled(isDemoModeEnabled());
  }, []);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      enableDemoMode();
    } else {
      disableDemoMode();
    }
    setEnabled(checked);
    onChange?.(checked);
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={enabled ? 'default' : 'ghost'}
              size="sm"
              className={`gap-1.5 ${className}`}
              onClick={() => handleToggle(!enabled)}
            >
              <Beaker className={`h-4 w-4 ${enabled ? 'text-primary-foreground' : ''}`} />
              {enabled && <span className="text-xs">Demo</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Demo Mode: {enabled ? 'ON' : 'OFF'}</p>
            <p className="text-xs text-muted-foreground">
              Click to toggle
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Switch
        id="demo-mode-toggle"
        checked={enabled}
        onCheckedChange={handleToggle}
      />
      {showLabel && (
        <Label 
          htmlFor="demo-mode-toggle" 
          className="flex items-center gap-2 cursor-pointer"
        >
          <Beaker className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
          <span>Demo Mode</span>
          {enabled && (
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          )}
        </Label>
      )}
    </div>
  );
}

// =============================================================================
// DEMO MODE INDICATOR
// =============================================================================

/**
 * Visual indicator showing when demo mode is active
 * Useful for reminding users that data is being transformed
 * 
 * @example
 * ```tsx
 * // Show in corner when demo mode is active
 * <DemoModeIndicator />
 * ```
 */
export function DemoModeIndicator({ className = '' }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isDemoModeEnabled());
    
    // Check periodically in case it changes elsewhere
    const interval = setInterval(() => {
      setEnabled(isDemoModeEnabled());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!enabled) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-md text-xs font-medium ${className}`}
          >
            <Beaker className="h-3.5 w-3.5" />
            Demo Mode
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Demo mode is active</p>
          <p className="text-xs text-muted-foreground">
            Dates are normalized for demonstration purposes
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// DEMO MODE SETTINGS PANEL
// =============================================================================

/**
 * Full settings panel for demo mode configuration
 * Useful for admin settings page
 * 
 * @example
 * ```tsx
 * <DemoModeSettings onSettingsChange={(s) => console.log(s)} />
 * ```
 */
export function DemoModeSettings({
  initialEnabled,
  onSettingsChange,
  className = '',
}: DemoModeSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled ?? isDemoModeEnabled());
  const [maxAgeDays, setMaxAgeDays] = useState(14);

  useEffect(() => {
    setEnabled(isDemoModeEnabled());
  }, []);

  const handleEnabledChange = (checked: boolean) => {
    if (checked) {
      enableDemoMode();
    } else {
      disableDemoMode();
    }
    setEnabled(checked);
    onSettingsChange?.({ enabled: checked, maxAgeDays });
  };

  const handleMaxAgeChange = (value: number) => {
    setMaxAgeDays(value);
    configureDemoMode({ maxAgeDays: value });
    onSettingsChange?.({ enabled, maxAgeDays: value });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Beaker className="h-5 w-5" />
          Demo Mode Settings
        </CardTitle>
        <CardDescription>
          Configure how dates appear during demonstrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="demo-settings-toggle">Enable Demo Mode</Label>
            <p className="text-sm text-muted-foreground">
              Normalize dates to appear current
            </p>
          </div>
          <Switch
            id="demo-settings-toggle"
            checked={enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {enabled && (
          <>
            {/* Max Age Days */}
            <div className="space-y-2">
              <Label htmlFor="max-age-days">Date Range (days)</Label>
              <p className="text-sm text-muted-foreground">
                How many days back demo dates can appear
              </p>
              <div className="flex items-center gap-2">
                <input
                  id="max-age-days"
                  type="range"
                  min={7}
                  max={30}
                  value={maxAgeDays}
                  onChange={(e) => handleMaxAgeChange(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {maxAgeDays} days
                </span>
              </div>
            </div>

            {/* Info Notice */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Info className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">How Demo Mode Works</p>
                <ul className="mt-1 text-xs space-y-1 list-disc list-inside">
                  <li>Dates are transformed at the UI layer only</li>
                  <li>Database timestamps remain unchanged</li>
                  <li>Future dates (expiry, pickup) stay in the future</li>
                  <li>Relative time order between items is preserved</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// POPOVER VERSION FOR TOOLBAR
// =============================================================================

/**
 * Popover with demo mode settings
 * Useful for quick access from a toolbar
 * 
 * @example
 * ```tsx
 * <DemoModePopover />
 * ```
 */
export function DemoModePopover({ className = '' }: { className?: string }) {
  const [enabled, setEnabled] = useState(isDemoModeEnabled());

  useEffect(() => {
    setEnabled(isDemoModeEnabled());
  }, []);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      enableDemoMode();
    } else {
      disableDemoMode();
    }
    setEnabled(checked);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant={enabled ? 'secondary' : 'ghost'} 
          size="sm"
          className={className}
        >
          <Beaker className={`h-4 w-4 mr-1.5 ${enabled ? 'text-primary' : ''}`} />
          Demo
          {enabled && (
            <Badge variant="default" className="ml-1.5 text-xs px-1.5">
              ON
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Demo Mode</h4>
              <p className="text-xs text-muted-foreground">
                Normalize dates for live demos
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
            />
          </div>

          {enabled && (
            <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
              <p className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Dates now appear relative to today
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Database timestamps remain unchanged.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Export all components
export { DemoModeToggle };
