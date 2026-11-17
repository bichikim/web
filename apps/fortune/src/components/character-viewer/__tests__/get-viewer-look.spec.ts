import type {PuppetLookParameter, PuppetParameter} from '@winter-love/puppet/player'
import {describe, expect, it} from 'vitest'
import {getViewerLook} from '../get-viewer-look'

describe('getViewerLook', () => {
  const parameters: ReadonlyArray<PuppetParameter> = [
    {defaultValue: 0, id: 'ParamAngleX', maximum: 30, minimum: -30, name: 'Head X'},
    {defaultValue: 0, id: 'ParamAngleY', maximum: 30, minimum: -30, name: 'Head Y'},
  ]
  const eye: PuppetLookParameter = {parameterId: 'ParamEyeBallX', x: 1, xy: 0, y: 0}
  const look: ReadonlyArray<PuppetLookParameter> = [
    {parameterId: 'ParamAngleX', x: 20, xy: 0, y: 0},
    {parameterId: 'ParamAngleY', x: 0, xy: 0, y: 15},
    eye,
  ]

  it('should use the full head parameter range without changing eye tracking', () => {
    expect(getViewerLook({look, parameters})).toEqual([
      {parameterId: 'ParamAngleX', x: 30, xy: 0, y: 0},
      {parameterId: 'ParamAngleY', x: 0, xy: 0, y: 30},
      eye,
    ])
    expect(look[0].x).toBe(20)
    expect(look[1].y).toBe(15)
  })

  it('should follow the model limits rather than a fixed angle', () => {
    expect(
      getViewerLook({
        look,
        parameters: [{...parameters[0], maximum: 45, minimum: -45}],
      }),
    ).toEqual([{parameterId: 'ParamAngleX', x: 45, xy: 0, y: 0}, look[1], eye])
  })

  it('should preserve look settings when the model has no matching parameters', () => {
    expect(getViewerLook({look})).toEqual(look)
  })

  it('should return no tracking entries when the model has none', () => {
    expect(getViewerLook({parameters})).toEqual([])
  })
})
