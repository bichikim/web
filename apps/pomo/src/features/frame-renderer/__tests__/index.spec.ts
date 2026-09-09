import {VideoLoop} from '../video-loop'
vi.mock('../video-loop', () => ({VideoLoop: vi.fn()}))
/** @vitest-environment jsdom */
import {Application, Sprite, Texture, VideoSource} from 'pixi.js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {FrameRenderer} from '..'
import {PhotoEdges} from '../edges'
import {VideoEdges} from '../video-edges'
vi.mock('../video-edges', () => ({VideoEdges: vi.fn()}))

vi.mock('../effect', () => ({ScreenEffect: vi.fn()}))
vi.mock('../edges', () => ({PhotoEdges: vi.fn()}))
const videoLoop = {destroy: vi.fn(), repeat: vi.fn(async () => undefined), resize: vi.fn()}
const videoEdges = {
  destroy: vi.fn(),
  resize: vi.fn(),
  setSamples: vi.fn(),
  update: vi.fn(),
  view: {},
}
const edges = {destroy: vi.fn(), resize: vi.fn(), view: {}}

vi.mock('pixi.js', () => ({
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
let image: HTMLImageElement
let video: HTMLVideoElement

beforeEach(() => {
  vi.clearAllMocks()
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
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:frame'), revokeObjectURL: vi.fn()})
  image = document.createElement('img')
  video = document.createElement('video')
  const createElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((name, options) =>
    name === 'video' ? video : createElement(name, options),
  )
  vi.stubGlobal(
    'Image',
    vi.fn(function createImage() {
      return image
    }),
  )
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
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
  vi.useRealTimers()
})

it('should contain the photo in the viewport and release texture and object URL', async () => {
  const canvas = document.createElement('canvas')
  Object.defineProperties(canvas, {clientHeight: {value: 600}, clientWidth: {value: 300}})
  const renderer = new FrameRenderer({canvas, onEnded: vi.fn(), onError: vi.fn()})
  await renderer.initialize()
  const showing = renderer.show(new Blob(['image']), 'photo')
  image.dispatchEvent(new Event('load'))
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
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:frame')
  expect(() => renderer.clear()).not.toThrow()
  expect(application.destroy).toHaveBeenCalledOnce()
})

it('should initialize video frame updates, play muted inline, and advance only on ended', async () => {
  const onEnded = vi.fn()
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded,
    onError: vi.fn(),
  })
  await renderer.initialize()
  const showing = renderer.show(new Blob(['video']), 'video')
  video.dispatchEvent(new Event('loadeddata'))
  await expect(showing).resolves.toBe(true)
  expect(PhotoEdges).not.toHaveBeenCalled()
  expect(source.load).toHaveBeenCalledOnce()
  expect(video.muted).toBe(true)
  expect(video.playsInline).toBe(true)
  expect(video.play).toHaveBeenCalledOnce()
  expect(onEnded).not.toHaveBeenCalled()
  video.dispatchEvent(new Event('ended'))
  expect(onEnded).toHaveBeenCalledOnce()
  renderer.destroy()
  video.dispatchEvent(new Event('ended'))
  expect(onEnded).toHaveBeenCalledOnce()
  expect(video.pause).toHaveBeenCalled()
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
  image.dispatchEvent(new Event('load'))
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

it('should reject stalled loading instead of hanging the playlist', async () => {
  vi.useFakeTimers()
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
  })
  await renderer.initialize()
  const showing = renderer.show(new Blob(['invalid']), 'photo')
  const assertion = expect(showing).rejects.toThrow('decode')
  await vi.advanceTimersByTimeAsync(30_000)
  await assertion
  renderer.destroy()
  expect(vi.getTimerCount()).toBe(0)
})

it('should preserve the outgoing photo before releasing media and cancel a pending replacement', async () => {
  const {PhotoTransition} = await import('../transition')
  const capture = vi.spyOn(PhotoTransition.prototype, 'capture').mockImplementation(() => undefined)
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
  })
  await renderer.initialize()
  const first = renderer.show(new Blob(['first']), 'photo')
  image.dispatchEvent(new Event('load'))
  await first
  expect(capture).not.toHaveBeenCalled()
  const second = renderer.show(new Blob(['second']), 'photo')
  expect(capture).toHaveBeenCalledOnce()
  expect(capture.mock.invocationCallOrder[0]).toBeLessThan(
    texture.destroy.mock.invocationCallOrder[0]!,
  )
  renderer.cancelPending()
  await expect(second).resolves.toBe(false)
  image.dispatchEvent(new Event('load'))
  const playing = renderer.show(new Blob(['video']), 'video')
  expect(capture).toHaveBeenCalledTimes(2)
  renderer.clear()
  await expect(playing).resolves.toBe(false)
  renderer.destroy()
})

it('should transition into videos, keep video rendering after completion and transition back to photos', async () => {
  const {PhotoTransition} = await import('../transition')
  const capture = vi.spyOn(PhotoTransition.prototype, 'capture').mockImplementation(() => undefined)
  const play = vi.spyOn(PhotoTransition.prototype, 'play').mockResolvedValue(true)
  const renderer = new FrameRenderer({
    canvas: document.createElement('canvas'),
    onEnded: vi.fn(),
    onError: vi.fn(),
  })
  await renderer.initialize()
  const first = renderer.show(new Blob(['photo']), 'photo')
  image.dispatchEvent(new Event('load'))
  await first
  const second = renderer.show(new Blob(['video']), 'video')
  video.dispatchEvent(new Event('loadeddata'))
  await second
  application.start.mockClear()
  expect(await renderer.present('fade')).toBe(true)
  expect(play).toHaveBeenCalledWith('fade')
  expect(application.start).toHaveBeenCalledOnce()
  const third = renderer.show(new Blob(['photo']), 'photo')
  image.dispatchEvent(new Event('load'))
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
  video.dispatchEvent(new Event('loadeddata'))
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
