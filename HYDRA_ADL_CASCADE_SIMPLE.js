// Simple ADL Cascade - Clean version
// Paste this into https://hydra.ojack.xyz

t = time * 0.1

// LIQUIDATIONS (Left) - Red/orange
liquidations = osc(20, 0.1, 1.4)
  .rotate(0, 0.1)
  .modulate(osc(10, 0.1).modulate(osc(10).rotate(0, -0.1), 1), 0.3)
  .color(2.83, 0.4, 0.25)
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(-0.25))

// ADL EVENTS (Right) - Blue/green
adlEvents = osc(30, 0.1, 1.5)
  .rotate(0, -0.1)
  .modulate(osc(15, 0.12).modulate(osc(12).rotate(0, 0.1), 1), 0.4)
  .color(0.35, 2.83, 1.1)
  .mask(shape(4, 0.3).scale(0.5, 1).scrollX(0.25))

// CASCADE - Connection
cascade = liquidations
  .modulateScale(osc(6, 0.5).modulate(adlEvents, 0.3), 0.15)
  .layer(adlEvents.modulateScale(osc(6, 0.5).modulate(liquidations, 0.3), 0.15))

liquidations
  .layer(adlEvents)
  .layer(cascade)
  .out(o0)

