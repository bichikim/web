import {expect, it} from 'vitest'

import {RainSimulation} from '../rain-simulation'

it('should emit 500 tiny droplets per simulated second at the source size range', () => {
  const simulation = new RainSimulation(800, 450, () => 0.5)

  simulation.step(0.05)

  expect(simulation.newDroplets).toHaveLength(30)
  expect(simulation.newDroplets.every((droplet) => droplet.size === 20)).toBe(true)
  expect(simulation.drops).toHaveLength(1)
})

it('should append new trail beads after updating the existing drops', () => {
  let calls = 0
  const simulation = new RainSimulation(800, 450, () => {
    calls += 1
    return 0
  })

  for (let frame = 0; frame < 3; frame += 1) {
    simulation.step(0.05)
  }

  expect(calls).toBe(310)
  expect(simulation.drops).toEqual([
    {
      height: expect.closeTo(108.92187704722565, 10),
      trail: false,
      width: expect.closeTo(108.92187704722565, 10),
      x: 0,
      y: expect.closeTo(30.18806684975399, 10),
    },
    {
      height: expect.closeTo(103.3973221390924, 10),
      trail: true,
      width: expect.closeTo(36.051988508414276, 10),
      x: -5,
      y: expect.closeTo(2.8759543433795365, 10),
    },
  ])
})

it('should merge droplets that touch on the glass', () => {
  const simulation = new RainSimulation(800, 450, () => 0.5)

  simulation.step(0.05)
  const firstWidth = simulation.drops[0].width
  simulation.step(0.05)

  expect(simulation.drops).toHaveLength(1)
  expect(simulation.drops[0].width).toBeGreaterThan(firstWidth)
})

it('should keep trail beads from growing into screen-sized raindrops after repeated merges', () => {
  let seed = 1
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223 + 4294967296) % 4294967296
    return seed / 4294967296
  }
  const simulation = new RainSimulation(1152, 864, random)

  for (let frame = 0; frame < 300; frame += 1) {
    simulation.step(1 / 30)
  }

  const drops = simulation.drops
  const maximumWidth = Math.max(...drops.map((drop) => drop.width))
  expect(maximumWidth).toBeLessThan(300)
  expect(drops).toHaveLength(371)
  expect(maximumWidth).toBeCloseTo(178.8520514105216, 5)
})
