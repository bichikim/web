import {expect, it} from 'vitest'
import {createWallpaperContent} from '@winter-love/wallpaper/settings/create-wallpaper-content'

it('should create an empty sequential album with video completion playback', () => {
  expect(createWallpaperContent('album')).toEqual({
    mediaIds: [],
    mode: 'album',
    order: 'sequential',
    photoSeconds: 10,
    transition: 'fade',
    videoMode: 'end',
  })
})

it('should require selection before rendering a website or Puppet file', () => {
  expect(createWallpaperContent('website')).toEqual({mode: 'website', url: null})
  expect(createWallpaperContent('puppet')).toEqual({assetId: null, mode: 'puppet'})
})
