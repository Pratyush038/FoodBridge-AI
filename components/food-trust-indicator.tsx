'use client';

/**
 * Food Trust Score Indicator Component
 * 
 * A visual indicator displaying the trust score for a food donation.
 * Shows score, label, and optionally a detailed breakdown.
 * 
 * This is a NEW, ADDITIVE component that can be placed in existing UIs
 * without affecting existing functionality.
 * 
 * @module components/food-trust-indicator
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  Clock,
  User,
  Truck,
  AlertTriangle,
  Leaf
} from 'lucide-react';
import { 
  calculateFoodTrustScore,
  calculateFoodTrustScoreSync,
  FoodTrustScore,
  TrustLabel,
  FoodItemInput,
  DonorHistoryStats
} from '@/lib/food-trust-engine';

// =============================================================================
// TYPES
// =============================================================================

interface FoodTrustIndicatorProps {
  /** Food item data for score calculation */
  foodItem: FoodItemInput;
  /** Pre-computed trust score (optional - will calculate if not provided) */
  trustScore?: FoodTrustScore;
  /** Pre-fetched donor stats for sync calculation */
  donorStats?: DonorHistoryStats | null;
  /** Whether to show detailed breakdown by default */
  showDetails?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Callback when score is calculated */
  onScoreCalculated?: (score: FoodTrustScore) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function getScoreColor(label: TrustLabel): string {
  switch (label) {
    case 'SAFE':
      return 'text-green-600 dark:text-green-400';
    case 'CAUTION':
      return 'text-amber-600 dark:text-amber-400';
    case 'HIGH_RISK':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

function getScoreBgColor(label: TrustLabel): string {
  switch (label) {
    case 'SAFE':
      return 'bg-green-100 dark:bg-green-900/30';
    case 'CAUTION':
      return 'bg-amber-100 dark:bg-amber-900/30';
    case 'HIGH_RISK':
      return 'bg-red-100 dark:bg-red-900/30';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30';
  }
}

function getBadgeVariant(label: TrustLabel): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (label) {
    case 'SAFE':
      return 'default';
    case 'CAUTION':
      return 'secondary';
    case 'HIGH_RISK':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getShieldIcon(label: TrustLabel) {
  switch (label) {
    case 'SAFE':
      return <ShieldCheck className="h-5 w-5 text-green-600" />;
    case 'CAUTION':
      return <Shield className="h-5 w-5 text-amber-600" />;
    case 'HIGH_RISK':
      return <ShieldAlert className="h-5 w-5 text-red-600" />;
    default:
      return <Shield className="h-5 w-5 text-gray-600" />;
  }
}

function BreakdownItem({ 
  icon, 
  label, 
  score, 
  maxScore, 
  color 
}: { 
  icon: React.ReactNode;
  label: string;
  score: number;
  maxScore: number;
  color: string;
}) {
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={`font-medium ${color}`}>
          {score}/{maxScore}
        </span>
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FoodTrustIndicator({
  foodItem,
  trustScore: providedScore,
  donorStats,
  showDetails = false,
  compact = false,
  onScoreCalculated,
  className = '',
}: FoodTrustIndicatorProps) {
  const [score, setScore] = useState<FoodTrustScore | null>(providedScore || null);
  const [loading, setLoading] = useState(!providedScore);
  const [expanded, setExpanded] = useState(showDetails);

  useEffect(() => {
    if (providedScore) {
      setScore(providedScore);
      setLoading(false);
      return;
    }

    // Calculate score
    const calculateScore = async () => {
      try {
        let trustScore: FoodTrustScore;
        
        // Use sync version if we have donor stats
        if (donorStats !== undefined) {
          trustScore = calculateFoodTrustScoreSync(foodItem, donorStats);
        } else {
          trustScore = await calculateFoodTrustScore(foodItem);
        }
        
        setScore(trustScore);
        onScoreCalculated?.(trustScore);
      } catch (error) {
        console.error('[FoodTrustIndicator] Error calculating score:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateScore();
  }, [foodItem, providedScore, donorStats, onScoreCalculated]);

  if (loading) {
    return (
      <div className={`animate-pulse ${compact ? 'inline-flex items-center gap-2' : ''} ${className}`}>
        {compact ? (
          <div className="h-6 w-20 bg-gray-200 rounded" />
        ) : (
          <Card className="w-full">
            <CardContent className="p-4">
              <div className="h-8 w-32 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (!score) {
    return null;
  }

  // Compact inline display
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${getScoreBgColor(score.label)} cursor-help ${className}`}
            >
              {getShieldIcon(score.label)}
              <span className={`text-sm font-semibold ${getScoreColor(score.label)}`}>
                {score.score}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant(score.label)}>
                  {score.label}
                </Badge>
                <span className="text-sm">Trust Score: {score.score}/100</span>
              </div>
              <ul className="text-xs space-y-1">
                {score.explanations.slice(0, 3).map((exp, i) => (
                  <li key={i} className="text-muted-foreground">• {exp}</li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full card display
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getShieldIcon(score.label)}
            Food Trust Score
          </CardTitle>
          <Badge variant={getBadgeVariant(score.label)}>
            {score.label}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Computed at {new Date(score.computedAt).toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className={`text-center py-4 rounded-lg ${getScoreBgColor(score.label)}`}>
          <div className={`text-4xl font-bold ${getScoreColor(score.label)}`}>
            {score.score}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            out of 100
          </div>
        </div>

        {/* Key Explanation */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {score.explanations[0]}
          </p>
        </div>

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show Details
            </>
          )}
        </Button>

        {/* Detailed Breakdown */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium">Score Breakdown</h4>
            
            <BreakdownItem
              icon={<User className="h-3.5 w-3.5" />}
              label="Donor Reliability"
              score={score.breakdown.donorReliability}
              maxScore={25}
              color={score.breakdown.donorReliability >= 15 ? 'text-green-600' : score.breakdown.donorReliability >= 10 ? 'text-amber-600' : 'text-red-600'}
            />
            
            <BreakdownItem
              icon={<Leaf className="h-3.5 w-3.5" />}
              label="Food Type Safety"
              score={score.breakdown.foodTypeRisk}
              maxScore={20}
              color={score.breakdown.foodTypeRisk >= 14 ? 'text-green-600' : score.breakdown.foodTypeRisk >= 8 ? 'text-amber-600' : 'text-red-600'}
            />
            
            <BreakdownItem
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Freshness"
              score={score.breakdown.freshnessScore}
              maxScore={20}
              color={score.breakdown.freshnessScore >= 14 ? 'text-green-600' : score.breakdown.freshnessScore >= 8 ? 'text-amber-600' : 'text-red-600'}
            />
            
            <BreakdownItem
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label="Expiry Window"
              score={score.breakdown.expiryScore}
              maxScore={25}
              color={score.breakdown.expiryScore >= 18 ? 'text-green-600' : score.breakdown.expiryScore >= 10 ? 'text-amber-600' : 'text-red-600'}
            />
            
            <BreakdownItem
              icon={<Truck className="h-3.5 w-3.5" />}
              label="Transport Risk"
              score={score.breakdown.transportRisk}
              maxScore={10}
              color={score.breakdown.transportRisk >= 7 ? 'text-green-600' : score.breakdown.transportRisk >= 4 ? 'text-amber-600' : 'text-red-600'}
            />

            {/* All Explanations */}
            <div className="mt-4 pt-3 border-t">
              <h4 className="text-sm font-medium mb-2">Analysis Notes</h4>
              <ul className="space-y-1.5">
                {score.explanations.map((explanation, index) => (
                  <li 
                    key={index}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary">•</span>
                    {explanation}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MINI BADGE VARIANT (for lists/tables)
// =============================================================================

export function TrustScoreBadge({ 
  score, 
  label 
}: { 
  score: number; 
  label: TrustLabel;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getBadgeVariant(label)}
            className="cursor-help"
          >
            {getShieldIcon(label)}
            <span className="ml-1">{score}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Trust Score: {score}/100 ({label})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Export types
export type { FoodTrustIndicatorProps };
