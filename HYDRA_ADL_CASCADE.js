// ADL Cascade Visualization for Hydra
// Paste this into https://hydra.ojack.xyz
// Shows liquidations (left) triggering ADL events (right)

// Time progression (12-minute cascade compressed)
t = time * 0.12

// ============================================
// LIQUIDATIONS (LEFT SIDE) - Accounts losing capital
// ============================================
// Red/orange pulsing patterns representing losses
liquidations = osc(18 + sin(t) * 4, 0.1, 1.2)
  .rotate(0, 0.05)
  .modulate(
    osc(12, 0.12)
      .rotate(0, -0.05)
      .modulate(noise(2, 0.08), 0.3),
    0.35
  )
  .color(2.83, 0.4, 0.25)  // Red/orange for losses
  .mask(
    shape(4, 0.25 + sin(t * 0.5) * 0.05)
      .scale(0.48, 1)
      .scrollX(-0.25)
      .modulateScale(noise(1, 0.05), 0.08)
  )
  .layer(
    noise(3, 0.1)
      .color(1.8, 0.3, 0.2)
      .modulateScale(osc(8, 0.08), 0.15)
  )

// ============================================
// ADL EVENTS (RIGHT SIDE) - Long positions being closed
// ============================================
// Blue/green flowing patterns representing ADL response
adlEvents = osc(28 + sin(t * 1.2) * 5, 0.08, 1.5)
  .rotate(0, -0.05)
  .modulate(
    osc(22, 0.1)
      .rotate(0, 0.05)
      .modulate(noise(3, 0.12), 0.35),
    0.4
  )
  .color(0.35, 2.83, 1.1)  // Blue/green for ADL
  .mask(
    shape(4, 0.25 + sin(t * 1.1) * 0.05)
      .scale(0.48, 1)
      .scrollX(0.25)
      .modulateScale(noise(1.2, 0.05), 0.08)
  )
  .layer(
    noise(4, 0.12)
      .color(0.2, 1.8, 1.0)
      .modulateScale(osc(10, 0.1), 0.18)
  )

// ============================================
// CASCADE CONNECTION - Liquidations trigger ADL
// ============================================
// Cross-modulation showing the causal relationship
cascade = liquidations
  .modulateScale(
    adlEvents
      .rotate(0, 0.1)
      .modulate(osc(6, 0.06), 0.2),
    0.18
  )
  .layer(
    adlEvents
      .modulateScale(
        liquidations
          .rotate(0, -0.1)
          .modulate(osc(7, 0.07), 0.2),
        0.12
      )
  )
  .mult(
    osc(5, 0.04)
      .modulate(osc(10), 0.2)
  )

// ============================================
// FINAL OUTPUT - Split screen composition
// ============================================
liquidations
  .layer(adlEvents)
  .layer(cascade)
  .out(o0)

