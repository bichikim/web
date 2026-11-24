import {expect, test} from 'vitest'
import type {PuppetWallpaper} from '@winter-love/wallpaper/settings/model'
import {createContentChange} from '../create-content-change'

test('should retain input profiles without undoing a subsequent input selection', () => {
  const before: PuppetWallpaper = {assetId: 'character', mode: 'puppet', tracking: 'cursor'}
  const profiles = {
    camera: {options: {headFollowSpeed: 2}},
    cursor: {options: {headFollowSpeed: 1}},
  }
  const update = createContentChange({after: {...before, trackingProfiles: profiles}, before})
  expect(update({...before, tracking: 'camera'})).toEqual({
    ...before,
    tracking: 'camera',
    trackingProfiles: profiles,
  })
})
