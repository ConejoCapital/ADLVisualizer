// ADL Cascade Visualization - Balanced Split Screen
// Paste this into https://hydra.ojack.xyz
// Shows how ADL balances out liquidation losses
// Left = Liquidations (red/orange), Right = ADL (blue/green)

// LIQUIDATIONS (Left half) - Red/orange
// Accounts losing capital - the trigger
liquidations = osc(20, 0.1, 1.4)
  .rotate(0, 0.1)
  .mult(osc(10, 0.1).modulate(osc(10).rotate(0, -0.1), 1))
  .color(2.83, 0.4, 0.25)  // Red/orange for losses
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(-0.25))
  .layer(noise(3, 0.1).color(1.8, 0.3, 0.2).scale(0.5, 1).scrollX(-0.25))

// ADL EVENTS (Right half) - Blue/green (complementary to red/orange)
// Long positions being closed - balancing out the losses
adlEvents = osc(30, 0.1, 1.5)
  .rotate(0, -0.1)
  .mult(osc(15, 0.12).modulate(osc(12).rotate(0, 0.1), 1))
  .color(0.35, 2.83, 1.1)  // Blue/green (complementary) for ADL
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(0.25))
  .layer(noise(4, 0.12).color(0.2, 1.8, 1.0).scale(0.5, 1).scrollX(0.25))

// BALANCE - Show how ADL responds to liquidations
// Fluid connection with opposing forces
balance = src(o0)
  .modulate(
    osc(6, 0, 1.5)
      .modulate(noise(3).sub(gradient()), 1)
      .brightness(-0.5),
    0.003
  )
  .layer(
    osc(30, 0.1, 1.5)
      .mask(shape(4, 0.3, 0))
      .color(1.5, 1.5, 1.5)  // Neutral white for balance
  )
  // Add center divider to emphasize split
  .layer(
    shape(3, 0.01)
      .scale(0.01, 1)
      .color(1, 1, 1)
      .modulate(noise(10, 0.2), 0.1)
  )

// Final output - clear split with balance
liquidations
  .layer(adlEvents)
  .layer(balance)
  .out(o0)
