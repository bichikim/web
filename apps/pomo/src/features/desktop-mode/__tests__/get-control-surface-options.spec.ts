/** @vitest-environment node */
import {expect, it} from 'vitest'
import {getControlSurfaceOptions} from '../get-control-surface-options'

it('should return the ordered initial bounds and routes for all desktop controls', () => {
  expect(getControlSurfaceOptions({height: 900, left: 0, top: 0, width: 1440})).toEqual([
    {
      height: 340,
      label: 'desktop-player',
      path: '/desktop/player/',
      width: 520,
      x: 24,
      y: 536,
    },
    {
      height: 520,
      label: 'desktop-pomodoro',
      path: '/desktop/pomodoro/',
      width: 360,
      x: 540,
      y: 24,
    },
    {
      height: 620,
      label: 'desktop-settings',
      path: '/desktop/settings/',
      width: 480,
      x: 936,
      y: 24,
    },
  ])
})

it.each([
  {
    name: 'a smaller work area',
    positions: [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    workArea: {height: 200, left: 0, top: 0, width: 200},
  },
  {
    name: 'a negative monitor origin',
    positions: [
      [-1896, -404],
      [-1140, -1056],
      [-504, -1056],
    ],
    workArea: {height: 1040, left: -1920, top: -1080, width: 1920},
  },
  {
    name: 'a positive monitor offset',
    positions: [
      [2584, 556],
      [3020, 224],
      [3336, 224],
    ],
    workArea: {height: 720, left: 2560, top: 200, width: 1280},
  },
  {
    name: 'partially oversized controls',
    positions: [
      [0, 236],
      [70, 24],
      [0, 0],
    ],
    workArea: {height: 600, left: 0, top: 0, width: 500},
  },
])('should preserve fixed sizes and clamp initial positions for $name', ({positions, workArea}) => {
  const surfaces = getControlSurfaceOptions(workArea)

  expect(surfaces.map(({x, y}) => [x, y])).toEqual(positions)
  expect(surfaces.map(({width, height}) => [width, height])).toEqual([
    [520, 340],
    [360, 520],
    [480, 620],
  ])
})

it('should return fresh options without changing the work-area input', () => {
  const workArea = Object.freeze({height: 900, left: 0, top: 0, width: 1440})
  const first = getControlSurfaceOptions(workArea)
  const second = getControlSurfaceOptions(workArea)

  expect(first).toEqual(second)
  expect(first).not.toBe(second)
  expect(first[0]).not.toBe(second[0])
  expect(first[1]).not.toBe(second[1])
  expect(first[2]).not.toBe(second[2])
  expect(workArea).toEqual({height: 900, left: 0, top: 0, width: 1440})
})
