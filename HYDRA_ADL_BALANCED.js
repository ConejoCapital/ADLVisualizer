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

// ADL EVENTS (Right half) - Cyan/blue (complementary to red/orange)
// Long positions closed - balancing the losses
adlEvents = osc(30, 0.1, 1.5)
  .rotate(0, -0.1)
  .mult(osc(15, 0.12).modulate(osc(12).rotate(0, 0.1), 1))
  .color(0.2, 2.83, 2.5)  // Cool cyan/blue (opposite on color wheel)
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(0.25))

// BALANCE - Fluid connection showing ADL responding to liquidations
// Using src(o0) like the working version
balance = src(o0)
  .modulate(
    osc(6, 0, 1.5)
      .modulate(noise(3).sub(gradient()), 1)
      .brightness(-0.5),
    0.003
  )
  .layer(osc(30, 0.1, 1.5).mask(shape(4, 0.3, 0)))

// Final composition - clear split showing balance
liquidations
  .layer(adlEvents)
  .layer(balance)
  .out(o0)

