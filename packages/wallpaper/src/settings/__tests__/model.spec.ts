import {expect, it} from 'vitest'
import {createMonitorWallpaper, monitorWallpaperSchema} from '../model'

it.each(['headResponseX', 'headResponseY', 'eyeResponseX', 'eyeResponseY'] as const)(
  'should retain independent response %s and reject invalid values',
  (key) => {
    const base = createMonitorWallpaper('first')
    const content = {assetId: 'asset', mode: 'puppet', trackingOptions: {[key]: 4.2}}
    expect(monitorWallpaperSchema.parse({...base, content}).content).toEqual(content)
    for (const value of [-1, 16, Infinity, NaN]) {
      expect(
        monitorWallpaperSchema.safeParse({
          ...base,
          content: {...content, trackingOptions: {[key]: value}},
        }).success,
      ).toBe(false)
    }
  },
)

it('should retain each Poffo background tracking choice and reject combined or unknown modes', () => {
  const base = createMonitorWallpaper('first')
  for (const tracking of ['off', 'cursor', 'camera']) {
    expect(
      monitorWallpaperSchema.parse({...base, content: {assetId: 'asset', mode: 'puppet', tracking}})
        .content,
    ).toMatchObject({tracking})
  }
  expect(
    monitorWallpaperSchema.safeParse({
      ...base,
      content: {assetId: 'asset', mode: 'puppet', tracking: 'both'},
    }).success,
  ).toBe(false)
})

it('should preserve per-background gaze calibration and reject invalid rotation scales', () => {
  const base = createMonitorWallpaper('first')
  const content = {
    assetId: 'asset',
    mode: 'puppet',
    trackingOptions: {
      cameraX: -0.2,
      distance: 80,
      eyeCenterX: -0.3,
      eyeCenterY: 0.2,
      eyeVerticalScale: 3,
      faceY: 0.2,
      headCenterX: 5,
      headCenterY: -4,
      headScale: 1.5,
      headVerticalScale: 2.5,
    },
  }
  expect(monitorWallpaperSchema.parse({...base, content}).content).toEqual(content)
  expect(
    monitorWallpaperSchema.safeParse({
      ...base,
      content: {...content, trackingOptions: {headScale: -1}},
    }).success,
  ).toBe(false)
})

it.each(['headVerticalScale', 'eyeVerticalScale'])(
  'should reject out-of-range %s while reading legacy tracking options',
  (key) => {
    const base = createMonitorWallpaper('first')
    const content = {assetId: 'asset', mode: 'puppet', trackingOptions: {headScale: 1.5}}
    expect(monitorWallpaperSchema.parse({...base, content}).content).toEqual(content)
    for (const headVerticalScale of [-1, 6]) {
      expect(
        monitorWallpaperSchema.safeParse({
          ...base,
          content: {...content, trackingOptions: {[key]: headVerticalScale}},
        }).success,
      ).toBe(false)
    }
  },
)

it('should initialize independent album and input settings per monitor', () => {
  const first = createMonitorWallpaper('first')
  const second = createMonitorWallpaper('second')
  expect(first).toMatchObject({
    content: {mediaIds: [], mode: 'album'},
    interaction: {activation: 'passThrough'},
    monitorId: 'first',
  })
  expect(first.content).not.toBe(second.content)
  expect(monitorWallpaperSchema.parse(first)).toEqual(first)
})

it('should default stored albums without transitions to fade and preserve explicit effects', () => {
  const base = createMonitorWallpaper('first')
  const legacy = {
    mediaIds: ['existing'],
    mode: 'album',
    order: 'random',
    photoSeconds: 15,
    videoMode: 'end',
  }
  expect(monitorWallpaperSchema.parse({...base, content: legacy}).content).toEqual({
    ...legacy,
    transition: 'fade',
  })
  expect(
    monitorWallpaperSchema.parse({...base, content: {...legacy, transition: 'none'}}).content,
  ).toEqual({...legacy, transition: 'none'})
  expect(
    monitorWallpaperSchema.safeParse({...base, content: {...legacy, transition: 'unknown'}})
      .success,
  ).toBe(false)
})

it('should accept all three content modes and reject invalid timing and website protocols', () => {
  const base = createMonitorWallpaper('first')
  expect(
    monitorWallpaperSchema.parse({...base, content: {assetId: 'asset', mode: 'puppet'}}).content,
  ).toEqual({assetId: 'asset', mode: 'puppet'})
  expect(
    monitorWallpaperSchema.parse({...base, content: {mode: 'website', url: 'https://example.com'}})
      .content.mode,
  ).toBe('website')
  expect(
    monitorWallpaperSchema.safeParse({
      ...base,
      content: {mode: 'website', url: 'http://example.com'},
    }).success,
  ).toBe(false)
  expect(
    monitorWallpaperSchema.safeParse({...base, interaction: {activation: 'unknown'}}).success,
  ).toBe(false)
})

it.each(['hold', 'modifierHold'])(
  'should read legacy %s settings as input pass-through',
  (activation) => {
    const base = createMonitorWallpaper('first')
    expect(
      monitorWallpaperSchema.parse({
        ...base,
        interaction: {activation, holdSeconds: 3, idleSeconds: 30, modifier: 'alt'},
      }),
    ).toEqual({...base, interaction: {activation: 'passThrough'}})
  },
)

it.each(['always', 'passThrough'])(
  'should preserve explicit %s settings without obsolete options',
  (activation) => {
    const base = createMonitorWallpaper('first')
    expect(
      monitorWallpaperSchema.parse({
        ...base,
        interaction: {activation, holdSeconds: 3, idleSeconds: 30, modifier: 'alt'},
      }).interaction,
    ).toEqual({activation})
  },
)

it.each(['headCenterX', 'headCenterY', 'eyeCenterX', 'eyeCenterY'] as const)(
  'should allow centers through 100 independently of movement limits for %s',
  (key) => {
    const base = createMonitorWallpaper('first')
    for (const value of [-100, 100]) {
      const content = {assetId: 'asset', mode: 'puppet', trackingOptions: {[key]: value}}
      expect(monitorWallpaperSchema.parse({...base, content}).content).toEqual(content)
    }
    for (const value of [-101, 101, Infinity, NaN]) {
      expect(
        monitorWallpaperSchema.safeParse({
          ...base,
          content: {
            assetId: 'asset',
            mode: 'puppet',
            trackingOptions: {[key]: value},
          },
        }).success,
      ).toBe(false)
    }
  },
)
