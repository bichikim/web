/** @vitest-environment jsdom */
import {createMedia} from '../media'
vi.mock('../media', () => ({createMedia: vi.fn()}))
import {VideoLoop} from '../video-loop'
vi.mock('../video-loop', () => ({VideoLoop: vi.fn()}))
import {Application, Sprite, Texture, VideoSource} from 'pixi.js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {FrameRenderer} from '..'
import {PhotoEdges} from '../edges'
import {VideoEdges} from '../video-edges'
vi.mock('../video-edges', () => ({VideoEdges: vi.fn()}))

import {PhotoTransition} from '../transition'
vi.mock('../transition', () => ({PhotoTransition: vi.fn()}))
vi.mock('../edges', () => ({PhotoEdges: vi.fn()}))
const transition = {
  cancel: vi.fn(),
  capture: vi.fn(),
  clear: vi.fn(),
  play: vi.fn(async () => true),
  resize: vi.fn(),
}
const videoLoop = {destroy: vi.fn(), repeat: vi.fn(async () => undefined), resize: vi.fn()}
const videoEdges = {
  destroy: vi.fn(),
  resize: vi.fn(),
  setSamples: vi.fn(),
  update: vi.fn(),
  view: {},
}
const edges = {destroy: vi.fn(), resize: vi.fn(), view: {}}

vi.mock('pixi.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('pixi.js')>()),
  Application: vi.fn(),
  Sprite: vi.fn(),
  Texture: vi.fn(),
  VideoSource: vi.fn(),
}))

const application = {
  destroy: vi.fn(),
  init: vi.fn(),
  render: vi.fn(),
  renderer: {resize: vi.fn()},
  stage: {addChild: vi.fn(), addChildAt: vi.fn()},
  start: vi.fn(),
  stop: vi.fn(),
  ticker: {add: vi.fn(), remove: vi.fn()},
}
const texture = {destroy: vi.fn(), height: 200, width: 400}
const sprite = {
  anchor: {set: vi.fn()},
  destroy: vi.fn(),
  position: {set: vi.fn()},
  scale: {set: vi.fn()},
  texture,
}
const source = {load: vi.fn()}
let video: HTMLVideoElement
let finishMedia: (ready: boolean) => void
const disposeMedia = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(PhotoTransition).mockImplementation(function createTransition() {
    return transition as unknown as PhotoTransition
  })
  vi.mocked(VideoLoop).mockImplementation(function createVideoLoop() {
    return videoLoop as unknown as VideoLoop
  })
  vi.mocked(VideoEdges).mockImplementation(function createVideoEdges() {
    return videoEdges as unknown as VideoEdges
  })
  vi.mocked(PhotoEdges).mockImplementation(function createEdges() {
    return edges as unknown as PhotoEdges
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  video = document.createElement('video')
  Object.defineProperty(video, 'play', {value: vi.fn(async () => undefined)})
  vi.mocked(createMedia).mockImplementation((options) => {
    const ready = new Promise<boolean>((resolve) => {
      finishMedia = resolve
    })
    const finish = finishMedia
    return {
      cancel: () => finish(false),
      dispose: () => {
        disposeMedia()
        finish(false)
      },
      ready,
      source: options.kind === 'photo' ? document.createElement('img') : video,
      video: options.kind === 'photo' ? null : video,
    }
  })
  application.init.mockResolvedValue(undefined)
  source.load.mockResolvedValue(undefined)
  vi.mocked(Application).mockImplementation(function createApplication() {
    return application as unknown as Application
  })
  vi.mocked(Sprite).mockImplementation(function createSprite() {
    return sprite as unknown as Sprite
  })
  vi.mocked(Texture).mockImplementation(function createTexture() {
    return texture as unknown as Texture
  })
  Object.assign(Texture, {from: vi.fn(() => texture)})
  vi.mocked(VideoSource).mockImplementation(function createVideoSource() {
    return source as unknown as VideoSource
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should contain the photo in the viewport and release texture and media', async () => {
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, {clientHeight: {value: 600}, clientWidth: {value: 300}})
  const renderer = new FrameRenderer({canvas, onEnded: vi.fn(), onError: vi.fn()})
  await renderer.initialize()
  const showing = renderer.show(new Blob(['image']), 'photo')
  finishMedia(true)
  await expect(showing).resolves.toBe(true)
  expect(sprite.scale.set).toHaveBeenCalledWith(0.75)
  expect(sprite.position.set).toHaveBeenCalledWith(150, 300)
  expect(PhotoEdges).toHaveBeenCalledOnce()
  expect(edges.resize).toHaveBeenCalledWith({
    height: 600,
    photoHeight: 150,
    photoWidth: 300,
    width: 300,
  })
  expect(application.start).not.toHaveBeenCalled()
  renderer.destroy()
  expect(edges.destroy).toHaveBeenCalledOnce()
  expect(texture.destroy).toHaveBeenCalledWith(true)
  expect(disposeMedia).toHaveBeenCalledOnce()
  expect(() => renderer.clear()).not.toThrow()
  expect(application.destroy).toHaveBeenCalledOnce()
})

it('should initialize video frame updates and advance only on ended', async () => {
  const onEnded = vi.fn()
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded,
    onError: vi.fn(),
  })
  await renderer.initialize()
  const showing = renderer.show(new Blob(['video']), 'video')
  finishMedia(true)
  await expect(showing).resolves.toBe(true)
  expect(PhotoEdges).not.toHaveBeenCalled()
  expect(source.load).toHaveBeenCalledOnce()
  expect(video.play).toHaveBeenCalledOnce()
  expect(onEnded).not.toHaveBeenCalled()
  vi.mocked(createMedia).mock.calls.at(-1)![0].onEnded()
  expect(onEnded).toHaveBeenCalledOnce()
  renderer.destroy()
  vi.mocked(createMedia).mock.calls.at(-1)![0].onEnded()
  expect(onEnded).toHaveBeenCalledOnce()
  expect(disposeMedia).toHaveBeenCalledOnce()
})

it('should cancel pending media and destroy an application that finishes initializing after disposal', async () => {
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
  })
  await renderer.initialize()
  const showing = renderer.show(new Blob(['image']), 'photo')
  renderer.clear()
  finishMedia(true)
  await expect(showing).resolves.toBe(false)
  expect(application.stage.addChild).not.toHaveBeenCalled()
  renderer.destroy()
  let finish!: () => void
  application.init.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finish = resolve
    }),
  )
  const pending = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
  })
  const initializing = pending.initialize()
  pending.destroy()
  finish()
  await initializing
  expect(application.destroy).toHaveBeenCalledTimes(2)
})

it('should reject failed media readiness without mounting a sprite', async () => {
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
  })
  await renderer.initialize()
  const showing = renderer.show(new Blob(['invalid']), 'photo')
  finishMedia(false)
  await expect(showing).rejects.toThrow('decode')
  expect(application.stage.addChild).not.toHaveBeenCalled()
  renderer.destroy()
  expect(disposeMedia).toHaveBeenCalledOnce()
})

it('should preserve the outgoing photo before releasing media and cancel a pending replacement', async () => {
  const {capture} = transition
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
  })
  await renderer.initialize()
  const first = renderer.show(new Blob(['first']), 'photo')
  finishMedia(true)
  await first
  expect(capture).not.toHaveBeenCalled()
  const second = renderer.show(new Blob(['second']), 'photo')
  expect(capture).toHaveBeenCalledOnce()
  expect(capture.mock.invocationCallOrder[0]).toBeLessThan(
    texture.destroy.mock.invocationCallOrder[0]!,
  )
  renderer.cancelPending()
  await expect(second).resolves.toBe(false)
  finishMedia(true)
  const playing = renderer.show(new Blob(['video']), 'video')
  expect(capture).toHaveBeenCalledTimes(2)
  renderer.clear()
  await expect(playing).resolves.toBe(false)
  renderer.destroy()
})

it('should transition into videos, keep video rendering after completion and transition back to photos', async () => {
  const {capture} = transition
  const {play} = transition
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
  })
  await renderer.initialize()
  const first = renderer.show(new Blob(['photo']), 'photo')
  finishMedia(true)
  await first
  const second = renderer.show(new Blob(['video']), 'video')
  finishMedia(true)
  await second
  application.start.mockClear()
  expect(await renderer.present('fade')).toBe(true)
  expect(play).toHaveBeenCalledWith('fade')
  expect(application.start).toHaveBeenCalledOnce()
  const third = renderer.show(new Blob(['photo']), 'photo')
  finishMedia(true)
  await third
  application.start.mockClear()
  expect(await renderer.present('cross-warp')).toBe(true)
  expect(play).toHaveBeenLastCalledWith('cross-warp')
  expect(capture).toHaveBeenCalledTimes(2)
  expect(application.start).not.toHaveBeenCalled()
  renderer.destroy()
})

it('should apply loop mode to the current and next video and report playback start', async () => {
  const onVideoStart = vi.fn()
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
    onVideoStart,
  })
  await renderer.initialize()
  renderer.setVideoLoop(true)
  const showing = renderer.show(new Blob(['video']), 'video')
  finishMedia(true)
  await showing
  expect(video.loop).toBe(false)
  expect(onVideoStart).toHaveBeenCalledOnce()
  renderer.setVideoLoop(false)
  expect(video.loop).toBe(false)
  Object.defineProperty(video, 'ended', {configurable: true, value: true})
  vi.mocked(video.play).mockClear()
  renderer.setVideoLoop(true)
  expect(videoLoop.repeat).toHaveBeenCalledOnce()
  renderer.destroy()
})

it('should ignore a replaced video that finishes texture loading late', async () => {
  let finishTexture!: () => void
  source.load.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      finishTexture = resolve
    }),
  )
  const onVideoStart = vi.fn()
  const onError = vi.fn()
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError,
    onVideoStart,
  })
  await renderer.initialize()
  const stale = renderer.show(new Blob(['video']), 'video')
  const staleCallbacks = vi.mocked(createMedia).mock.calls.at(-1)![0]
  finishMedia(true)
  await Promise.resolve()
  expect(source.load).toHaveBeenCalledOnce()
  const current = renderer.show(new Blob(['photo']), 'photo')
  finishMedia(true)
  await expect(current).resolves.toBe(true)
  finishTexture()
  await expect(stale).resolves.toBe(false)
  staleCallbacks.onError()
  staleCallbacks.onEnded()
  expect(onError).not.toHaveBeenCalled()
  expect(onVideoStart).not.toHaveBeenCalled()
  expect(video.play).not.toHaveBeenCalled()
  expect(application.stage.addChild).toHaveBeenCalledTimes(2)
  renderer.destroy()
  expect(disposeMedia).toHaveBeenCalledTimes(2)
})
