# FoodBridgeAI Feature Enhancement Summary

## Overview

This document describes the three new features added to FoodBridgeAI as modular, non-invasive enhancements that layer on top of the existing stable system.

---

## Part A: Food Safety & Trust Scoring Engine

### Purpose
Compute a real-time Food Trust Score (0–100) for every food donation to help NGOs make informed decisions about whether to accept food items.

### Implementation Details

**New Files Created:**
- [lib/food-trust-engine.ts](lib/food-trust-engine.ts) - Core scoring engine
- [app/api/trust-score/route.ts](app/api/trust-score/route.ts) - REST API endpoint
- [components/food-trust-indicator.tsx](components/food-trust-indicator.tsx) - UI component

### Scoring Algorithm

The trust score is computed from 5 weighted components (total = 100 points):

| Component | Max Points | Description |
|-----------|------------|-------------|
| Donor Reliability | 25 | Based on donation history, completion rate, feedback ratings, tier |
| Food Type Risk | 20 | Risk factor by food category (dry goods = low, meat/dairy = high) |
| Freshness Score | 20 | Time since preparation (decay over 24+ hours) |
| Expiry Window | 25 | Time remaining until expiry |
| Transport Risk | 10 | Estimated pickup delay impact |

### Trust Labels
- **SAFE** (≥80): Low risk, recommended for acceptance
- **CAUTION** (50-79): Moderate risk, review details
- **HIGH_RISK** (<50): High risk, exercise caution

### Integration Points

**API Usage:**
```typescript
// Single item
GET /api/trust-score?foodItemId=xxx

// Batch (multiple items)
POST /api/trust-score
{ "foodItemIds": ["id1", "id2", "id3"] }
```

**Component Usage:**
```tsx
import FoodTrustIndicator from '@/components/food-trust-indicator';

<FoodTrustIndicator 
  foodItem={foodItemData}
  compact={true}  // For inline display
/>
```

### Safety Guarantees
- ✅ READ-ONLY access to database
- ✅ Does NOT modify any existing tables
- ✅ Does NOT block or prevent donations
- ✅ Purely informational indicator
- ✅ Isolated from matching engine

---

## Part B: Predictive Hunger Hotspot Engine

### Purpose
Predict geographic areas likely to experience food shortages in the next 3-7 days using historical request patterns.

### Implementation Details

**New Files Created:**
- [lib/hunger-hotspot-engine.ts](lib/hunger-hotspot-engine.ts) - Prediction engine
- [app/api/hotspots/route.ts](app/api/hotspots/route.ts) - REST API endpoint
- [components/hotspot-overlay.tsx](components/hotspot-overlay.tsx) - Map overlay component

### Prediction Algorithm

Uses a weighted scoring approach based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Recent Demand Trend | 30% | Weighted moving average of weekly requests |
| Week-over-Week Growth | 20% | Rate of change in demand |
| Unfulfilled Ratio | 25% | Percentage of requests not fulfilled |
| Average Urgency | 15% | Urgency level distribution |
| Capacity Gap | 10% | NGO capacity vs. demand |

### Risk Levels
- **HIGH** (≥70): Immediate attention needed
- **MEDIUM** (40-69): Monitor closely
- **LOW** (<40): Stable situation

### Covered Regions
Pre-configured for major Indian cities:
- Bangalore (Central, East, South, North)
- Mumbai (Central, West, East)
- Delhi (Central, South, East/Noida)
- Chennai, Hyderabad, Kolkata, Pune

### Integration Points

**API Usage:**
```typescript
// All predictions
GET /api/hotspots

// GeoJSON for maps
GET /api/hotspots?format=geojson

// Location-specific
GET /api/hotspots?lat=12.9716&lng=77.5946

// High-risk only
GET /api/hotspots?highRiskOnly=true
```

**Component Usage:**
```tsx
import HotspotOverlay from '@/components/hotspot-overlay';

<HotspotOverlay 
  map={googleMapInstance}
  initiallyVisible={true}
  onHotspotClick={(hotspot) => console.log(hotspot)}
/>
```

### Safety Guarantees
- ✅ READ-ONLY analytics layer
- ✅ No modification to request/donation flows
- ✅ Cached in Firebase (6-hour validity)
- ✅ Optional overlay (can be toggled)
- ✅ Independent from matching engine

---

## Part C: Dynamic Demo Date Handling

### Purpose
Make dates in the UI appear relative to the current date during demos, without altering actual database timestamps.

### Implementation Details

**New Files Created:**
- [lib/demo-date-utils.ts](lib/demo-date-utils.ts) - Core utility functions
- [hooks/use-demo-dates.tsx](hooks/use-demo-dates.tsx) - React hooks
- [components/demo-mode-toggle.tsx](components/demo-mode-toggle.tsx) - Toggle UI

### How It Works

1. **Anchor Detection**: Finds the oldest date in the dataset
2. **Offset Calculation**: Computes how much to shift dates to make oldest date = `maxAgeDays` ago
3. **Transform**: Applies offset to all dates while preserving relative differences
4. **Future Dates**: Expiry/pickup dates are kept in the future

### Configuration

```typescript
// Enable via environment variable
NEXT_PUBLIC_DEMO_MODE=true

// Or programmatically
import { enableDemoMode, disableDemoMode } from '@/lib/demo-date-utils';

enableDemoMode();  // Turn on
disableDemoMode(); // Turn off
```

### Usage Patterns

**In Components (React Hooks):**
```tsx
import { useDemoItems, useDemoRelativeTime } from '@/hooks/use-demo-dates';

function DonationsList({ donations }) {
  // Normalize all items
  const normalizedDonations = useDemoItems(donations);
  
  return normalizedDonations.map(d => (
    <div>{d.created_at}</div>  // Now current-looking
  ));
}
```

**Helper Components:**
```tsx
import { DemoDate, DemoExpiryBadge } from '@/hooks/use-demo-dates';

<DemoDate timestamp={donation.created_at} relative />
<DemoExpiryBadge expiryTimestamp={donation.expiry_date} />
```

**Toggle UI:**
```tsx
import DemoModeToggle, { DemoModeIndicator } from '@/components/demo-mode-toggle';

// In settings or header
<DemoModeToggle showLabel />

// Show active indicator
<DemoModeIndicator />
```

### Safety Guarantees
- ✅ UI-layer only transformation
- ✅ Database timestamps NEVER modified
- ✅ Easily reversible (toggle off)
- ✅ Feature-flagged via env var
- ✅ Preserves relative time differences

---

## Integration Guidelines

### Adding Trust Score to Receiver Dashboard

In [app/receiver/page.tsx](app/receiver/page.tsx), add to donation cards:

```tsx
import FoodTrustIndicator from '@/components/food-trust-indicator';

// In donation card rendering
<FoodTrustIndicator 
  foodItem={{
    id: donation.id,
    donor_id: donation.donorId,
    food_type: donation.foodType,
    pickup_time: donation.pickupTime,
    expiry_date: donation.expiryDate,
    created_at: donation.createdAt,
  }}
  compact
/>
```

### Adding Hotspot Layer to Map

In [components/map-component.tsx](components/map-component.tsx), add alongside the map:

```tsx
import HotspotOverlay from '@/components/hotspot-overlay';

// Render next to map controls
{map && <HotspotOverlay map={map} className="absolute top-4 right-4" />}
```

### Enabling Demo Mode in Header

In [components/header-bar.tsx](components/header-bar.tsx):

```tsx
import { DemoModePopover, DemoModeIndicator } from '@/components/demo-mode-toggle';

// In the header toolbar
<DemoModePopover />
<DemoModeIndicator />
```

---

## Files Created Summary

| File | Purpose | Lines |
|------|---------|-------|
| `lib/food-trust-engine.ts` | Trust scoring logic | ~660 |
| `lib/hunger-hotspot-engine.ts` | Hotspot prediction | ~710 |
| `lib/demo-date-utils.ts` | Date normalization | ~520 |
| `app/api/trust-score/route.ts` | Trust API | ~180 |
| `app/api/hotspots/route.ts` | Hotspots API | ~110 |
| `components/food-trust-indicator.tsx` | Trust UI | ~310 |
| `components/hotspot-overlay.tsx` | Map overlay | ~380 |
| `components/demo-mode-toggle.tsx` | Demo toggle | ~320 |
| `hooks/use-demo-dates.tsx` | Date hooks | ~390 |

---

## Assumptions Made

1. **Supabase Schema**: Assumed existing tables (`donors`, `ngos`, `food_items`, `requests`, `feedback`, `transactions`) remain unchanged
2. **Firebase**: Used for caching hotspot predictions (analytics path)
3. **Google Maps**: Assumed existing map component uses Google Maps API
4. **Environment Variables**: `NEXT_PUBLIC_DEMO_MODE` for demo date feature flag
5. **Regions**: Pre-configured regions based on major Indian cities where platform operates

---

## Testing Recommendations

1. **Trust Score**:
   - Test with various food types and donor histories
   - Verify expiry edge cases (expired, near-expiry, fresh)
   - Check new donor handling

2. **Hotspot Predictions**:
   - Test with varying request volumes
   - Verify cache behavior (6-hour validity)
   - Check map overlay rendering

3. **Demo Dates**:
   - Test toggle on/off behavior
   - Verify future dates stay in future
   - Check relative time ordering preserved

---

## No Breaking Changes

These features:
- Do NOT modify existing database schemas
- Do NOT alter existing API routes
- Do NOT change existing component behavior
- Do NOT interfere with matching engine
- Are completely OPTIONAL and can be disabled

All enhancements layer on top of the existing stable system.
