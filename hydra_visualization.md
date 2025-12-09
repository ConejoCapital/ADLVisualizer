# Hydra Visualization for ADL Cascade

## Concept

Visualize the ADL cascade where:
- **Left side**: Liquidations (accounts losing capital)
- **Right side**: ADL events (long positions being closed)
- **Connection**: Liquidations trigger ADL events sequentially

## Basic Hydra Sketch

```javascript
// ADL Cascade Visualization
// Left = Liquidations, Right = ADL Events

// Time-based progression (12 minutes = 720 seconds compressed)
t = time * 0.1

// LIQUIDATIONS (Left side) - Accounts losing capital
liquidations = osc(20, 0.1, 1.2)
  .rotate(0, 0.05)
  .modulate(osc(15, 0.15).rotate(0, -0.05), 0.3)
  .color(2.83, 0.3, 0.2)  // Red/orange for losses
  .mask(shape(4, 0.2).scale(0.5, 1).scrollX(-0.25))
  .layer(noise(3, 0.1).color(1.5, 0.2, 0.1))

// ADL EVENTS (Right side) - Long positions being closed
adlEvents = osc(30, 0.1, 1.5)
  .rotate(0, -0.05)
  .modulate(osc(25, 0.12).rotate(0, 0.05), 0.4)
  .color(0.3, 2.83, 0.91)  // Blue/green for ADL
  .mask(shape(4, 0.2).scale(0.5, 1).scrollX(0.25))
  .layer(noise(4, 0.15).color(0.1, 1.5, 0.8))

// CASCADE CONNECTION - Liquidations trigger ADL
cascade = liquidations
  .modulateScale(adlEvents.rotate(0, 0.1), 0.15)
  .layer(adlEvents.modulateScale(liquidations.rotate(0, -0.1), 0.1))

// Combine with split screen
liquidations
  .layer(adlEvents)
  .layer(cascade.mult(osc(5, 0.05).modulate(osc(10), 0.2)))
  .out(o0)
```

## Enhanced Version with Time-Based Intensity

```javascript
// Enhanced ADL Cascade with time-based intensity
t = time * 0.15

// Liquidations - pulsing red/orange
liquidations = osc(18 + sin(t) * 5, 0.1 + sin(t * 0.5) * 0.05, 1.2)
  .rotate(0, 0.05 + sin(t * 0.3) * 0.02)
  .modulate(
    osc(12, 0.12).rotate(0, -0.05).modulate(noise(2, 0.1), 0.3),
    0.4
  )
  .color(2.83, 0.4, 0.25)
  .mask(
    shape(4, 0.25 + sin(t) * 0.1)
      .scale(0.48, 1)
      .scrollX(-0.25)
      .modulateScale(noise(1, 0.05), 0.1)
  )
  .layer(
    noise(3, 0.12)
      .color(1.8, 0.3, 0.2)
      .modulateScale(osc(8, 0.08), 0.15)
  )

// ADL Events - flowing blue/green (triggered by liquidations)
adlEvents = osc(28 + sin(t * 1.2) * 6, 0.08 + sin(t * 0.4) * 0.03, 1.5)
  .rotate(0, -0.05 - sin(t * 0.25) * 0.02)
  .modulate(
    osc(22, 0.1).rotate(0, 0.05).modulate(noise(3, 0.12), 0.35),
    0.45
  )
  .color(0.35, 2.83, 1.1)
  .mask(
    shape(4, 0.25 + sin(t * 1.1) * 0.1)
      .scale(0.48, 1)
      .scrollX(0.25)
      .modulateScale(noise(1.2, 0.05), 0.1)
  )
  .layer(
    noise(4, 0.14)
      .color(0.2, 1.8, 1.0)
      .modulateScale(osc(10, 0.1), 0.18)
  )

// Cascade effect - liquidations flow into ADL
cascade = liquidations
  .modulateScale(
    adlEvents
      .rotate(0, 0.12)
      .modulate(osc(6, 0.06), 0.2),
    0.2
  )
  .layer(
    adlEvents
      .modulateScale(
        liquidations.rotate(0, -0.12).modulate(osc(7, 0.07), 0.2),
        0.15
      )
  )
  .mult(osc(4, 0.04).modulate(osc(8), 0.25))

// Final composition
liquidations
  .layer(adlEvents)
  .layer(cascade)
  .out(o0)
```

## Data-Driven Version (Requires Hydra Extension)

If you want to use actual ADL data, you'd need to:

1. **Pre-process data** into time-based intensity curves
2. **Use Hydra's `a` (audio) or custom functions** to drive parameters
3. **Create a data bridge** between JSON and Hydra

Here's a conceptual approach:

```javascript
// Pseudo-code for data-driven version
// (Would need custom Hydra extension or data loading)

// Load ADL data (would need custom loader)
// adlData = loadJSON('/data/adl_flow_data.json')

// Liquidations intensity over time
liquidationsIntensity = (t) => {
  // Map time to data bucket
  bucket = Math.floor(t / 60) // 1-second buckets
  return adlData.timeBuckets[bucket]?.liquidatedByAsset || {}
}

// ADL intensity over time  
adlIntensity = (t) => {
  bucket = Math.floor(t / 60)
  return adlData.timeBuckets[bucket]?.adldByAsset || {}
}

// Use intensities to drive oscillators
liquidations = osc(20 * liquidationsIntensity(time).BTC, 0.1, 1.2)
  .color(2.83, 0.3, 0.2)
  .mask(shape(4).scale(0.5, 1).scrollX(-0.25))

adlEvents = osc(30 * adlIntensity(time).BTC, 0.1, 1.5)
  .color(0.3, 2.83, 0.91)
  .mask(shape(4).scale(0.5, 1).scrollX(0.25))

liquidations.layer(adlEvents).out(o0)
```

## Recommended: Standalone Hydra Sketch

For immediate use, here's the best version to paste into Hydra:

```javascript
// ADL Cascade Visualization
// Paste this into https://hydra.ojack.xyz

t = time * 0.12

// LIQUIDATIONS (Left) - Red/orange pulsing
liquidations = osc(18 + sin(t) * 4, 0.1, 1.2)
  .rotate(0, 0.05)
  .modulate(osc(12, 0.12).rotate(0, -0.05), 0.35)
  .color(2.83, 0.4, 0.25)
  .mask(
    shape(4, 0.25)
      .scale(0.48, 1)
      .scrollX(-0.25)
  )
  .layer(noise(3, 0.1).color(1.8, 0.3, 0.2))

// ADL EVENTS (Right) - Blue/green flowing
adlEvents = osc(28 + sin(t * 1.2) * 5, 0.08, 1.5)
  .rotate(0, -0.05)
  .modulate(osc(22, 0.1).rotate(0, 0.05), 0.4)
  .color(0.35, 2.83, 1.1)
  .mask(
    shape(4, 0.25)
      .scale(0.48, 1)
      .scrollX(0.25)
  )
  .layer(noise(4, 0.12).color(0.2, 1.8, 1.0))

// CASCADE - Liquidations trigger ADL
cascade = liquidations
  .modulateScale(adlEvents.rotate(0, 0.1), 0.18)
  .layer(adlEvents.modulateScale(liquidations.rotate(0, -0.1), 0.12))

// Output
liquidations
  .layer(adlEvents)
  .layer(cascade.mult(osc(5, 0.04).modulate(osc(10), 0.2)))
  .out(o0)
```

## Visual Interpretation

- **Left side (Red/Orange)**: Liquidations - accounts losing capital
  - Pulsing, chaotic patterns
  - Lower frequency oscillations
  - Red/orange color scheme (losses)

- **Right side (Blue/Green)**: ADL events - long positions closed
  - Flowing, more structured patterns
  - Higher frequency oscillations
  - Blue/green color scheme (system response)

- **Center (Modulation)**: Cascade connection
  - Shows liquidations triggering ADL
  - Cross-modulation between sides
  - Time-based progression

## Next Steps

To make this truly data-driven, you could:

1. **Create a Hydra extension** that loads JSON data
2. **Use Web Audio API** to convert data to audio signals
3. **Build a custom Hydra patch** that reads from a data server
4. **Use Hydra's `a` (audio) input** if you convert data to audio

Would you like me to create a standalone HTML page that combines Hydra with your ADL data, or would you prefer to enhance the existing Hydra sketch further?

