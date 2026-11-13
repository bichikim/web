/** @vitest-environment node */
import {Container} from 'pixi.js'
import {expect, it} from 'vitest'

import {resetMotionPresentation} from '../motion-reset'
import type {PixiSceneOpacityPulse} from '../layer-scene-definition'

const cases = [
  {alpha: 0.1, phase: 0, transitionSeconds: 1, travelSeconds: 2},
  {alpha: 0.1, phase: 0.25, transitionSeconds: 1, travelSeconds: 2},
  {alpha: 0.1, phase: 0.5, transitionSeconds: 1, travelSeconds: 2},
  {alpha: 0.5, phase: 0.75, transitionSeconds: 1, travelSeconds: 2},
  {alpha: 0.782842712474619, phase: 0.875, transitionSeconds: 1, travelSeconds: 2},
  {alpha: 0.1, phase: 0.75, transitionSeconds: 1, travelSeconds: 4},
  {alpha: 0.5, phase: 0.875, transitionSeconds: 1, travelSeconds: 4},
  {alpha: 0.217157287525381, phase: 0.875, transitionSeconds: 1, travelSeconds: 6},
  {alpha: 0.5, phase: 0.5, transitionSeconds: 1, travelSeconds: 1},
  {alpha: 0.782842712474619, phase: 0.75, transitionSeconds: 1, travelSeconds: 1},
  {alpha: 0.5, phase: 0.5, transitionSeconds: undefined, travelSeconds: 4},
  {alpha: 0.782842712474619, phase: 0.75, transitionSeconds: undefined, travelSeconds: 4},
]

it.each(cases)(
  'should reset phase $phase within the sampled $travelSeconds-second period (transition $transitionSeconds)',
  ({alpha, phase, transitionSeconds, travelSeconds}) => {
    const container = new Container()
    const sprite = new Container()
    container.alpha = 0.3
    container.position.set(3, 4)
    sprite.visible = false
    const motion: PixiSceneOpacityPulse = {
      kind: 'opacity-pulse',
      maximumOpacity: 0.9,
      minimumOpacity: 0.1,
      phase,
      transitionSeconds,
      travel: {maximumSeconds: 6, minimumSeconds: 1},
    }

    resetMotionPresentation({
      container,
      currentTarget: {x: 0, y: 0},
      motion,
      phase,
      sprite,
      travelSeconds,
    })

    expect(sprite.alpha).toBeCloseTo(alpha, 12)
    expect(sprite.visible).toBe(false)
    expect(container.alpha).toBe(0.3)
    expect(container.position.x).toBe(3)
    expect(container.position.y).toBe(4)
    container.destroy()
    sprite.destroy()
  },
)
