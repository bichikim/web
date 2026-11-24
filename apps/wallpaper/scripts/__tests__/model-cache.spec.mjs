import {expect, test} from 'vitest'
import {appCacheDirectory} from '../model-cache.mjs'

test('should share the OS application cache across worktrees on macOS', () => {
  expect(appCacheDirectory({environment: {}, home: '/Users/person', platform: 'darwin'})).toBe(
    '/Users/person/Library/Caches/io.winterlove.wallpaper',
  )
})
test('should honor absolute Windows and Linux cache locations', () => {
  expect(
    appCacheDirectory({
      environment: {LOCALAPPDATA: 'D:\\Cache'},
      home: 'C:\\Users\\person',
      platform: 'win32',
    }),
  ).toBe('D:\\Cache\\io.winterlove.wallpaper')
  expect(
    appCacheDirectory({
      environment: {XDG_CACHE_HOME: '/var/cache/person'},
      home: '/home/person',
      platform: 'linux',
    }),
  ).toBe('/var/cache/person/io.winterlove.wallpaper')
})
test('should keep an empty or relative cache environment out of the checkout', () => {
  expect(
    appCacheDirectory({environment: {XDG_CACHE_HOME: ''}, home: '/home/person', platform: 'linux'}),
  ).toBe('/home/person/.cache/io.winterlove.wallpaper')
  expect(
    appCacheDirectory({
      environment: {XDG_CACHE_HOME: '.cache'},
      home: '/home/person',
      platform: 'linux',
    }),
  ).toBe('/home/person/.cache/io.winterlove.wallpaper')
  expect(
    appCacheDirectory({
      environment: {LOCALAPPDATA: ''},
      home: 'C:\\Users\\person',
      platform: 'win32',
    }),
  ).toBe('C:\\Users\\person\\AppData\\Local\\io.winterlove.wallpaper')
})
