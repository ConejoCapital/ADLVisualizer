// ADL Cascade Visualization - Fixed Version
// Paste this into https://hydra.ojack.xyz
// Follows Hydra conventions: https://github.com/hydra-synth/hydra

// LIQUIDATIONS (Left side) - Red/orange
// Accounts losing capital on large tickers
liquidations = osc(20, 0.1, 1.4)
  .rotate(0, 0.1)
  .mult(osc(10, 0.1).modulate(osc(10).rotate(0, -0.1), 1))
  .color(2.83, 0.4, 0.25)
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(-0.25))

// ADL EVENTS (Right side) - Blue/green
// Long positions being closed (triggered by liquidations)
adlEvents = osc(30, 0.1, 1.5)
  .rotate(0, -0.1)
  .mult(osc(15, 0.12).modulate(osc(12).rotate(0, 0.1), 1))
  .color(0.35, 2.83, 1.1)
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(0.25))

// CASCADE - Liquidations trigger ADL events
// Using feedback pattern from Hydra examples
cascade = src(o0)
  .modulateScale(osc(6, 0.5), 0.01)
  .layer(osc(30, 0.1, 1.5).mask(shape(4, 0.3, 0)))

// Combine: liquidations (left) + ADL events (right) + cascade connection
liquidations
  .layer(adlEvents)
  .layer(cascade)
  .out(o0)
