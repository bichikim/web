import {expect, it} from 'vitest'
import {trackingProfile} from '../tracking-profile'
import type {PoffoTrackingSettings} from '../tracking'

it('should select mode-specific options and bindings without merging another mode', () => {
  const settings: PoffoTrackingSettings = {
    tracking: 'cursor',
    trackingBindings: {headX: {parameterId: 'legacy'}},
    trackingOptions: {headFollowSpeed: 0.8},
    trackingProfiles: {
      camera: {bindings: {headX: {parameterId: 'face'}}, options: {headFollowSpeed: 0.4}},
      'camera-pose': {bindings: {headX: {parameterId: 'pose'}}, options: {headFollowSpeed: 2}},
      cursor: {bindings: {headX: {parameterId: 'mouse'}}, options: {headFollowSpeed: 1.2}},
    },
  }
  expect(trackingProfile(settings).options).toEqual({headFollowSpeed: 1.2})
  expect(trackingProfile({...settings, tracking: 'camera'})).toEqual(
    settings.trackingProfiles?.camera,
  )
  expect(trackingProfile({...settings, tracking: 'camera-pose'})).toEqual(
    settings.trackingProfiles?.['camera-pose'],
  )
})

it('should retain legacy calibration for each mode until that mode is configured', () => {
  const settings: PoffoTrackingSettings = {
    trackingBindings: {eyeX: {parameterId: 'eyes'}},
    trackingOptions: {eyeFollowSpeed: 0.7, headCenterX: 4},
    trackingProfiles: {cursor: {options: {headCenterX: 2}}},
  }
  expect(trackingProfile(settings, 'cursor')).toEqual({
    bindings: settings.trackingBindings,
    options: {headCenterX: 2},
  })
  for (const mode of ['camera', 'camera-pose'] as const) {
    expect(trackingProfile(settings, mode)).toEqual({
      bindings: settings.trackingBindings,
      options: settings.trackingOptions,
    })
  }
  expect(trackingProfile(undefined)).toEqual({bindings: undefined, options: undefined})
})
