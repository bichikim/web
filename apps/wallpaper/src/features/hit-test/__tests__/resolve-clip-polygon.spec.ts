import {expect, it} from 'vitest'
import {resolveClipPolygon} from '../resolve-clip-polygon'

it('should resolve percentages, negative margins and linear calc values in computed clips', () => {
  expect(
    resolveClipPolygon({
      height: 400,
      value: 'polygon(-36px -36px, calc(100% + 36px) -36px, calc(100% - 12px) 36px, 12px 48px)',
      width: 200,
    }),
  ).toEqual([
    {x: -36, y: -36},
    {x: 236, y: -36},
    {x: 188, y: 36},
    {x: 12, y: 48},
  ])
  expect(
    resolveClipPolygon({height: 100, value: 'polygon(0 0, 50% 100%, 100% 0px)', width: 200}),
  ).toEqual([
    {x: 0, y: 0},
    {x: 100, y: 100},
    {x: 200, y: 0},
  ])
  expect(resolveClipPolygon({height: 100, value: 'none', width: 200})).toBeNull()
})

it('should report unsupported clipping and units instead of silently accepting the whole window', () => {
  expect(() => resolveClipPolygon({height: 100, value: 'circle(50%)', width: 200})).toThrow(
    'Unsupported hit-region clip',
  )
  expect(() => resolveClipPolygon({height: 100, value: 'polygon(1em 0)', width: 200})).toThrow(
    'Unsupported hit-region length',
  )
  expect(() => resolveClipPolygon({height: 100, value: 'polygon(0 0 0)', width: 200})).toThrow(
    'Invalid hit-region point',
  )
})
