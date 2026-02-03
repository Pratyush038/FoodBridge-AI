'use client';

/**
 * Hunger Hotspot Overlay Component
 * 
 * An OPTIONAL overlay for the existing map component that displays
 * predicted hunger hotspots as colored circles.
 * 
 * This is a NEW, ADDITIVE component that can be toggled on/off
 * without affecting existing map functionality.
 * 
 * @module components/hotspot-overlay
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  Flame,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Info,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  HotspotPrediction,
  RiskLevel,
  generateHotspotPredictions,
  getHotspotSummary
} from '@/lib/hunger-hotspot-engine';

// =============================================================================
// TYPES
// =============================================================================

interface HotspotOverlayProps {
  /** Google Maps instance reference */
  map: any;
  /** Whether the overlay is initially visible */
  initiallyVisible?: boolean;
  /** Callback when a hotspot is clicked */
  onHotspotClick?: (hotspot: HotspotPrediction) => void;
  /** Additional CSS classes for the control panel */
  className?: string;
}

interface HotspotCircle {
  circle: any;
  marker: any;
  prediction: HotspotPrediction;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'HIGH':
      return '#ef4444'; // red-500
    case 'MEDIUM':
      return '#f59e0b'; // amber-500
    case 'LOW':
      return '#10b981'; // green-500
    default:
      return '#6b7280'; // gray-500
  }
}

function getRiskOpacity(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case 'HIGH':
      return 0.35;
    case 'MEDIUM':
      return 0.25;
    case 'LOW':
      return 0.15;
    default:
      return 0.2;
  }
}

function getBadgeVariant(riskLevel: RiskLevel): 'default' | 'secondary' | 'destructive' {
  switch (riskLevel) {
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'secondary';
    case 'LOW':
      return 'default';
    default:
      return 'secondary';
  }
}

// =============================================================================
// CONTROL PANEL COMPONENT
// =============================================================================

interface HotspotControlPanelProps {
  visible: boolean;
  onToggle: (visible: boolean) => void;
  predictions: HotspotPrediction[];
  loading: boolean;
  onRefresh: () => void;
  onHotspotSelect: (hotspot: HotspotPrediction) => void;
  className?: string;
}

function HotspotControlPanel({
  visible,
  onToggle,
  predictions,
  loading,
  onRefresh,
  onHotspotSelect,
  className = ''
}: HotspotControlPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const summary = {
    high: predictions.filter(p => p.riskLevel === 'HIGH').length,
    medium: predictions.filter(p => p.riskLevel === 'MEDIUM').length,
    low: predictions.filter(p => p.riskLevel === 'LOW').length,
    avgScore: predictions.length > 0
      ? Math.round(predictions.reduce((sum, p) => sum + p.predictedDemandScore, 0) / predictions.length)
      : 0
  };

  return (
    <Card className={`w-80 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Hunger Hotspots
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="hotspot-toggle"
              checked={visible}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
        <CardDescription className="text-xs">
          Predicted demand for next 7 days
        </CardDescription>
      </CardHeader>

      {visible && (
        <CardContent className="space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <div className="text-lg font-bold text-red-600">{summary.high}</div>
              <div className="text-xs text-red-600">High Risk</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <div className="text-lg font-bold text-amber-600">{summary.medium}</div>
              <div className="text-xs text-amber-600">Medium</div>
            </div>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <div className="text-lg font-bold text-green-600">{summary.low}</div>
              <div className="text-xs text-green-600">Low</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500/50" />
              High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-500/50" />
              Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500/50" />
              Low
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide List
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show List
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Hotspot List */}
          {expanded && (
            <div className="max-h-60 overflow-y-auto space-y-2 pt-2 border-t">
              {predictions
                .sort((a, b) => b.predictedDemandScore - a.predictedDemandScore)
                .slice(0, 10)
                .map((hotspot) => (
                  <button
                    key={hotspot.regionId}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => onHotspotSelect(hotspot)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1">
                        {hotspot.regionName}
                      </span>
                      <Badge variant={getBadgeVariant(hotspot.riskLevel)} className="text-xs">
                        {hotspot.predictedDemandScore}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress 
                        value={hotspot.predictedDemandScore} 
                        className="h-1 flex-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        {Math.round(hotspot.confidenceScore * 100)}% conf
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Info Notice */}
          <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs">
            <Info className="h-3.5 w-3.5 mt-0.5 text-blue-500 flex-shrink-0" />
            <span className="text-blue-700 dark:text-blue-300">
              Predictions based on historical request patterns and NGO capacity.
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// HOTSPOT DETAIL POPUP
// =============================================================================

interface HotspotDetailPopupProps {
  hotspot: HotspotPrediction;
  onClose: () => void;
}

export function HotspotDetailPopup({ hotspot, onClose }: HotspotDetailPopupProps) {
  return (
    <Card className="w-72 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{hotspot.regionName}</CardTitle>
          <Badge variant={getBadgeVariant(hotspot.riskLevel)}>
            {hotspot.riskLevel} RISK
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score */}
        <div className="text-center py-3 rounded-lg" style={{ 
          backgroundColor: `${getRiskColor(hotspot.riskLevel)}20` 
        }}>
          <div className="text-3xl font-bold" style={{ color: getRiskColor(hotspot.riskLevel) }}>
            {hotspot.predictedDemandScore}
          </div>
          <div className="text-xs text-muted-foreground">Predicted Demand Score</div>
        </div>

        {/* Factors */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recent Trend</span>
            <span>{hotspot.factors.recentDemandTrend.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Week-over-Week</span>
            <span className={hotspot.factors.weekOverWeekGrowth > 0 ? 'text-red-500' : 'text-green-500'}>
              {hotspot.factors.weekOverWeekGrowth > 0 ? '+' : ''}{hotspot.factors.weekOverWeekGrowth.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unfulfilled Rate</span>
            <span>{(hotspot.factors.unfulfilledRatio * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confidence</span>
            <span>{(hotspot.confidenceScore * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Valid Until */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Valid until {new Date(hotspot.validUntil).toLocaleDateString()}
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
          Close
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN OVERLAY COMPONENT
// =============================================================================

export default function HotspotOverlay({
  map,
  initiallyVisible = false,
  onHotspotClick,
  className = ''
}: HotspotOverlayProps) {
  const [visible, setVisible] = useState(initiallyVisible);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<HotspotPrediction[]>([]);
  const [circles, setCircles] = useState<HotspotCircle[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPrediction | null>(null);

  // Fetch predictions
  const fetchPredictions = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await generateHotspotPredictions(forceRefresh);
      setPredictions(data);
    } catch (error) {
      console.error('[HotspotOverlay] Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  // Render circles on map
  useEffect(() => {
    if (!map || !visible || !window.google) {
      // Clear existing circles when hidden
      circles.forEach(({ circle, marker }) => {
        circle?.setMap(null);
        marker?.setMap(null);
      });
      setCircles([]);
      return;
    }

    const google = window.google;

    // Clear existing circles
    circles.forEach(({ circle, marker }) => {
      circle?.setMap(null);
      marker?.setMap(null);
    });

    // Create new circles
    const newCircles: HotspotCircle[] = predictions.map((prediction) => {
      // Create circle
      const circle = new google.maps.Circle({
        map,
        center: prediction.center,
        radius: prediction.radiusKm * 1000, // Convert to meters
        fillColor: getRiskColor(prediction.riskLevel),
        fillOpacity: getRiskOpacity(prediction.riskLevel),
        strokeColor: getRiskColor(prediction.riskLevel),
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: true,
      });

      // Create center marker
      const marker = new google.maps.Marker({
        map,
        position: prediction.center,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: getRiskColor(prediction.riskLevel),
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: `${prediction.regionName} - ${prediction.riskLevel} RISK (${prediction.predictedDemandScore})`,
      });

      // Info window
      const infoContent = `
        <div style="padding: 12px; max-width: 220px;">
          <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: ${getRiskColor(prediction.riskLevel)};">
            ${prediction.regionName}
          </h3>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: ${getRiskColor(prediction.riskLevel)}20; color: ${getRiskColor(prediction.riskLevel)}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
              ${prediction.riskLevel} RISK
            </span>
            <span style="font-size: 14px; font-weight: 600;">
              Score: ${prediction.predictedDemandScore}
            </span>
          </div>
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            Predicted high demand area for the next 7 days.
          </p>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
            Confidence: ${Math.round(prediction.confidenceScore * 100)}%
          </p>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({ content: infoContent });

      // Click handlers
      circle.addListener('click', () => {
        infoWindow.setPosition(prediction.center);
        infoWindow.open(map);
        setSelectedHotspot(prediction);
        onHotspotClick?.(prediction);
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        setSelectedHotspot(prediction);
        onHotspotClick?.(prediction);
      });

      return { circle, marker, prediction };
    });

    setCircles(newCircles);

    // Cleanup
    return () => {
      newCircles.forEach(({ circle, marker }) => {
        circle?.setMap(null);
        marker?.setMap(null);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, visible, predictions]);

  // Handle hotspot selection from list
  const handleHotspotSelect = useCallback((hotspot: HotspotPrediction) => {
    if (map && window.google) {
      map.setCenter(hotspot.center);
      map.setZoom(12);
      setSelectedHotspot(hotspot);
      onHotspotClick?.(hotspot);
    }
  }, [map, onHotspotClick]);

  return (
    <HotspotControlPanel
      visible={visible}
      onToggle={setVisible}
      predictions={predictions}
      loading={loading}
      onRefresh={() => fetchPredictions(true)}
      onHotspotSelect={handleHotspotSelect}
      className={className}
    />
  );
}

// Export sub-components
export { HotspotControlPanel };
