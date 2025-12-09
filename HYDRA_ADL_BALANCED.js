// ADL Balanced Visualization - Enhanced Split Screen
// Paste this into https://hydra.ojack.xyz
// Shows liquidations (left) balanced by ADL events (right)
// Opposing hues demonstrate the balancing mechanism

// LIQUIDATIONS (Left half) - Red/orange
// Accounts losing capital on large tickers
liquidations = osc(20, 0.1, 1.4)
  .rotate(0, 0.1)
  .mult(osc(10, 0.1).modulate(osc(10).rotate(0, -0.1), 1))
  .color(2.83, 0.4, 0.25)  // Warm red/orange
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(-0.25))
  .layer(
    noise(3, 0.1)
      .color(1.8, 0.3, 0.2)
      .scale(0.5, 1)
      .scrollX(-0.25)
  )

// ADL EVENTS (Right half) - Cyan/blue (complementary to red/orange)
// Long positions closed - balancing the losses
adlEvents = osc(30, 0.1, 1.5)
  .rotate(0, -0.1)
  .mult(osc(15, 0.12).modulate(osc(12).rotate(0, 0.1), 1))
  .color(0.2, 2.83, 2.5)  // Cool cyan/blue (opposite on color wheel)
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(0.25))
  .layer(
    noise(4, 0.12)
      .color(0.1, 1.8, 2.0)
      .scale(0.5, 1)
      .scrollX(0.25)
  )

// BALANCE EFFECT - Shows ADL responding to liquidations
// Fluid modulation creates organic connection
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
      .color(1.2, 1.2, 1.2)  // Neutral light for balance visualization
  )

// CENTER DIVIDER - Emphasizes the split
divider = shape(3, 0.01)
  .scale(0.01, 1)
  .color(1, 1, 1)
  .modulate(noise(10, 0.2), 0.1)
  .brightness(0.3)

// Final composition - clear split showing balance
liquidations
  .layer(adlEvents)
  .layer(balance)
  .layer(divider)
  .out(o0)

