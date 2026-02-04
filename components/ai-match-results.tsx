'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  MapPin, 
  Phone, 
  ChevronDown, 
  ChevronUp,
  Utensils,
  Scale,
  Clock,
  Target
} from 'lucide-react';
import { 
  MatchResult, 
  formatMatchScore, 
  formatDistance 
} from '@/lib/donor-receiver-matching';

interface AIMatchResultsProps {
  matches: MatchResult[];
  type: 'donors' | 'receivers';
  isLoading?: boolean;
  onContactClick?: (match: MatchResult) => void;
}

/**
 * AI Match Results Component
 * 
 * Displays "Top Matches" after a donation or requirement is posted
 * Shows AI-style matching scores with breakdown
 */
export default function AIMatchResults({ 
  matches, 
  type, 
  isLoading = false,
  onContactClick 
}: AIMatchResultsProps) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  // Show loading animation
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  
  useEffect(() => {
    // Simulate AI analysis time
    if (matches.length > 0) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        setIsAnalyzing(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [matches]);
  
  if (isLoading || isAnalyzing) {
    return (
      <Card className="mt-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI Matching in Progress...
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" />
              <span className="text-sm text-gray-600">Analyzing location proximity...</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span className="text-sm text-gray-600">Matching food categories...</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="text-sm text-gray-600">Calculating compatibility scores...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (matches.length === 0) {
    return (
      <Card className="mt-6 border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-gray-400" />
            <span>No Matches Found</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            No {type === 'donors' ? 'donors' : 'receivers'} found in your area. 
            Try expanding your search or check back later.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const displayedMatches = showAll ? matches : matches.slice(0, 5);
  const typeLabel = type === 'donors' ? 'Donor' : 'Receiver';
  
  return (
    <Card className="mt-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI-Powered Top Matches
            </span>
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {matches.length} {type} found
          </Badge>
        </div>
        <CardDescription>
          Matches are ranked by distance (40%), food type (30%), quantity (20%), and time urgency (10%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedMatches.map((match, index) => {
          const scoreInfo = formatMatchScore(match.matchScore);
          const isExpanded = expandedMatch === match.id;
          
          return (
            <div
              key={match.id}
              className={`
                bg-white rounded-lg border transition-all duration-200
                ${index === 0 ? 'border-purple-300 shadow-md' : 'border-gray-200'}
                ${isExpanded ? 'ring-2 ring-purple-300' : ''}
              `}
            >
              {/* Main Match Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Rank Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      {index === 0 && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs">
                          🏆 Best Match
                        </Badge>
                      )}
                      {index > 0 && index < 3 && (
                        <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                          #{index + 1} {typeLabel}
                        </Badge>
                      )}
                      {index >= 3 && (
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Name & Organization */}
                    <h4 className="font-semibold text-gray-900 truncate">
                      {match.organizationName || match.name}
                    </h4>
                    {match.organizationName && match.name !== match.organizationName && (
                      <p className="text-sm text-gray-500 truncate">{match.name}</p>
                    )}
                    
                    {/* Quick Info */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {formatDistance(match.distance)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Utensils className="h-3.5 w-3.5" />
                        {match.foodType.replace('-', ' ')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Scale className="h-3.5 w-3.5" />
                        {match.quantity} {match.unit}
                      </span>
                    </div>
                  </div>
                  
                  {/* Match Score */}
                  <div className="text-right flex-shrink-0">
                    <div className={`text-2xl font-bold ${scoreInfo.color}`}>
                      {scoreInfo.emoji} {scoreInfo.text}
                    </div>
                    <p className="text-xs text-gray-500">Match Score</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        View Details
                      </>
                    )}
                  </Button>
                  {match.phone && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => onContactClick?.(match)}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Contact
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    AI Matching Breakdown
                  </h5>
                  <div className="space-y-2">
                    <ScoreBar 
                      label="Distance Proximity" 
                      score={match.matchBreakdown.distanceScore} 
                      weight="40%"
                      icon={<MapPin className="h-3.5 w-3.5" />}
                    />
                    <ScoreBar 
                      label="Food Category Match" 
                      score={match.matchBreakdown.categoryScore} 
                      weight="30%"
                      icon={<Utensils className="h-3.5 w-3.5" />}
                    />
                    <ScoreBar 
                      label="Quantity Compatibility" 
                      score={match.matchBreakdown.quantityScore} 
                      weight="20%"
                      icon={<Scale className="h-3.5 w-3.5" />}
                    />
                    <ScoreBar 
                      label="Time Window" 
                      score={match.matchBreakdown.timeScore} 
                      weight="10%"
                      icon={<Clock className="h-3.5 w-3.5" />}
                    />
                  </div>
                  
                  {match.phone && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Contact:</span> {match.phone}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Show More/Less */}
        {matches.length > 5 && (
          <Button
            variant="ghost"
            className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {matches.length - 5} More Matches
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Score bar component for the breakdown
function ScoreBar({ 
  label, 
  score, 
  weight,
  icon 
}: { 
  label: string; 
  score: number; 
  weight: string;
  icon: React.ReactNode;
}) {
  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 w-36 text-xs text-gray-600">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1">
        <Progress value={score} className="h-2" />
      </div>
      <div className="w-12 text-right text-xs font-medium text-gray-700">
        {score}%
      </div>
      <div className="w-10 text-right text-xs text-gray-400">
        ({weight})
      </div>
    </div>
  );
}
