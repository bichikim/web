import {expect, it} from 'vitest'

import {RainSimulation} from '../rain-simulation'

it('should emit 500 tiny droplets per simulated second at the source size range', () => {
  const simulation = new RainSimulation(800, 450, () => 0.5)

  simulation.step(0.05)

  expect(simulation.newDroplets).toHaveLength(30)
  expect(simulation.newDroplets.every((droplet) => droplet.size === 20)).toBe(true)
  expect(simulation.drops).toHaveLength(1)
})

it('should create separate trail beads as a raindrop slides', () => {
  const simulation = new RainSimulation(800, 450, () => 0)

  for (let frame = 0; frame < 5; frame += 1) {
    simulation.step(0.05)
  }

  expect(simulation.drops.some((drop) => drop.trail)).toBe(true)
  expect(simulation.drops.every((drop) => drop.width > 0 && drop.height > 0)).toBe(true)
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
