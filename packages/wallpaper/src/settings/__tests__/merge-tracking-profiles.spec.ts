import {expect, it} from 'vitest'
import {mergeTrackingProfiles} from '../merge-tracking-profiles'
import {trackingProfile} from '../tracking-profile'
import type {PoffoTrackingSettings} from '../tracking'

const current: PoffoTrackingSettings = {
  trackingOptions: {headFollowSpeed: 0.8},
  trackingProfiles: {
    camera: {bindings: {headX: {parameterId: 'face'}}, options: {headFollowSpeed: 2}},
    cursor: {bindings: {headX: {parameterId: 'mouse'}}, options: {headFollowSpeed: 1}},
  },
}
it('should import one input without replacing another input or its legacy fallback', () => {
  const profiles = mergeTrackingProfiles({
    current,
    incoming: {trackingProfiles: {cursor: {options: {headFollowSpeed: 3}}}},
    mode: 'replace',
  })
  expect(profiles?.cursor).toEqual({
    bindings: current.trackingProfiles?.cursor?.bindings,
    options: {headFollowSpeed: 3},
  })
  expect(profiles?.camera).toBe(current.trackingProfiles?.camera)
  expect(trackingProfile({...current, trackingProfiles: profiles}, 'camera-pose').options).toEqual({
    headFollowSpeed: 0.8,
  })
})
it('should apply legacy shared calibration to every input when restoring an older preset', () => {
  const profiles = mergeTrackingProfiles({
    current,
    incoming: {trackingOptions: {headFollowSpeed: 0.5}},
    mode: 'replace',
  })
  for (const mode of ['cursor', 'camera', 'camera-pose'] as const) {
    expect(profiles?.[mode]?.options).toEqual({headFollowSpeed: 0.5})
  }
  expect(profiles?.cursor?.bindings).toEqual(current.trackingProfiles?.cursor?.bindings)
})
it('should retain edited inputs when filling missing default settings', () => {
  const profiles = mergeTrackingProfiles({
    current,
    incoming: {
      trackingBindings: {eyeX: {parameterId: 'eyes'}},
      trackingOptions: {headFollowSpeed: 0.5},
    },
    mode: 'missing',
  })
  expect(profiles?.cursor?.options).toEqual({headFollowSpeed: 1})
  expect(profiles?.camera?.options).toEqual({headFollowSpeed: 2})
  expect(profiles?.['camera-pose']).toEqual({
    bindings: {eyeX: {parameterId: 'eyes'}},
    options: {headFollowSpeed: 0.8},
  })
})
