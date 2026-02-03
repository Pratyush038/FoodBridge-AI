/**
 * Hunger Hotspot Prediction API Route
 * 
 * Exposes the Hunger Hotspot Prediction Engine via a REST API.
 * This is a NEW, non-breaking API endpoint.
 * 
 * GET /api/hotspots - Get all hotspot predictions
 * GET /api/hotspots?format=geojson - Get predictions in GeoJSON format
 * GET /api/hotspots?lat=xxx&lng=yyy - Get prediction for specific location
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateHotspotPredictions,
  getPredictionForLocation,
  getHighRiskHotspots,
  getHotspotsAsGeoJSON,
  getHotspotSummary,
} from '@/lib/hunger-hotspot-engine';

/**
 * GET /api/hotspots
 * 
 * Query params:
 * - format: 'geojson' for GeoJSON output
 * - lat & lng: Get prediction for specific location
 * - highRiskOnly: 'true' to get only high-risk areas
 * - summary: 'true' to get summary statistics
 * - refresh: 'true' to force cache refresh
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const highRiskOnly = searchParams.get('highRiskOnly') === 'true';
    const summary = searchParams.get('summary') === 'true';
    const refresh = searchParams.get('refresh') === 'true';

    // Summary statistics
    if (summary) {
      const summaryData = await getHotspotSummary();
      return NextResponse.json(summaryData);
    }

    // Location-specific prediction
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid lat/lng parameters' },
          { status: 400 }
        );
      }

      const prediction = await getPredictionForLocation(latitude, longitude);
      
      if (!prediction) {
        return NextResponse.json({
          message: 'No prediction available for this location',
          location: { lat: latitude, lng: longitude },
        });
      }

      return NextResponse.json(prediction);
    }

    // GeoJSON format for map visualization
    if (format === 'geojson') {
      const geojson = await getHotspotsAsGeoJSON();
      return NextResponse.json(geojson);
    }

    // High-risk only
    if (highRiskOnly) {
      const highRisk = await getHighRiskHotspots();
      return NextResponse.json({
        predictions: highRisk,
        count: highRisk.length,
        riskLevel: 'HIGH',
      });
    }

    // Default: all predictions
    const predictions = await generateHotspotPredictions(refresh);
    
    return NextResponse.json({
      predictions,
      count: predictions.length,
      generatedAt: predictions[0]?.predictedAt || new Date().toISOString(),
      validUntil: predictions[0]?.validUntil || new Date().toISOString(),
    });
  } catch (error) {
    console.error('[HotspotAPI] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hotspots/refresh
 * 
 * Force regeneration of predictions
 * Useful for admin actions or scheduled jobs
 */
export async function POST(request: NextRequest) {
  try {
    const predictions = await generateHotspotPredictions(true);
    
    return NextResponse.json({
      message: 'Predictions regenerated successfully',
      predictions,
      count: predictions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[HotspotAPI] Refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate predictions' },
      { status: 500 }
    );
  }
}
