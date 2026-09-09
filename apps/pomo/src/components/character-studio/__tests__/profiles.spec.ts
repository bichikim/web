/** @vitest-environment node */
import {expect, it} from 'vitest'
import {getProfile} from '../profiles'
import rigs from '../spring-rigs.json'

it('should select the Haru rig with a versioned asset URL', () => {
  expect(getProfile('/assets/character-studio/haru.vrm?renderer=babylon-1').rig).toBe(rigs.haru)
})

it('should select the Luna rig and cloth shell', () => {
  expect(getProfile('/assets/character-studio/vroid.glb')).toEqual({
    rig: rigs.luna,
    shell: 'Body_primitive2',
  })
})

it('should preserve the default Luna profile for other URLs', () => {
  expect(getProfile('/model.glb').rig).toBe(rigs.luna)
})
