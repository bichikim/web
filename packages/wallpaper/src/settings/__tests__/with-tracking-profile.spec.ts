import {expect, it} from 'vitest'
import {withTrackingProfile} from '../with-tracking-profile'
import {trackingProfile} from '../tracking-profile'
import type {PoffoTrackingSettings} from '../tracking'

it('should replace only the specified mode while keeping its other settings and legacy defaults', () => {
  const settings: PoffoTrackingSettings = {
    tracking: 'camera',
    trackingBindings: {headX: {parameterId: 'shared'}},
    trackingOptions: {headCenterX: 4},
    trackingProfiles: {cursor: {options: {headCenterX: 1}}},
  }
  const profiles = withTrackingProfile(settings, {options: {headCenterX: 9}}, 'camera-pose')
  expect(profiles.cursor).toBe(settings.trackingProfiles?.cursor)
  expect(profiles['camera-pose']).toEqual({
    bindings: settings.trackingBindings,
    options: {headCenterX: 9},
  })
  expect(trackingProfile({...settings, trackingProfiles: profiles})).toEqual({
    bindings: settings.trackingBindings,
    options: {headCenterX: 4},
  })
  expect(settings.trackingProfiles).toEqual({cursor: {options: {headCenterX: 1}}})
})
