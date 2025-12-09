// Enhanced ADL Cascade with more dynamic patterns
// Paste this into https://hydra.ojack.xyz

t = time * 0.15

// LIQUIDATIONS - More chaotic, representing account losses
liquidations = osc(18 + sin(t) * 5, 0.1 + sin(t * 0.5) * 0.05, 1.2)
  .rotate(0, 0.05 + sin(t * 0.3) * 0.02)
  .modulate(
    osc(12, 0.12)
      .rotate(0, -0.05)
      .modulate(noise(2, 0.1), 0.3)
      .modulateScale(osc(15, 0.1), 0.2),
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
      .modulate(osc(6, 0.06), 0.2)
  )

// ADL EVENTS - More structured, representing system response
adlEvents = osc(28 + sin(t * 1.2) * 6, 0.08 + sin(t * 0.4) * 0.03, 1.5)
  .rotate(0, -0.05 - sin(t * 0.25) * 0.02)
  .modulate(
    osc(22, 0.1)
      .rotate(0, 0.05)
      .modulate(noise(3, 0.12), 0.35)
      .modulateScale(osc(18, 0.12), 0.25),
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
      .modulate(osc(12, 0.08), 0.25)
  )

// CASCADE - Stronger connection showing trigger effect
cascade = liquidations
  .modulateScale(
    adlEvents
      .rotate(0, 0.12)
      .modulate(osc(6, 0.06), 0.2)
      .modulateScale(osc(8, 0.08), 0.15),
    0.2
  )
  .layer(
    adlEvents
      .modulateScale(
        liquidations
          .rotate(0, -0.12)
          .modulate(osc(7, 0.07), 0.2)
          .modulateScale(osc(9, 0.09), 0.15),
        0.15
      )
  )
  .mult(
    osc(4, 0.04)
      .modulate(osc(8), 0.25)
      .modulateScale(osc(12, 0.1), 0.1)
  )

// Add center divider line
divider = shape(3, 0.01)
  .scale(0.01, 1)
  .color(1, 1, 1)
  .modulate(noise(10, 0.2), 0.1)

liquidations
  .layer(adlEvents)
  .layer(cascade)
  .layer(divider)
  .out(o0)

