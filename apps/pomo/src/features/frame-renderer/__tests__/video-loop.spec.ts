/** @vitest-environment jsdom */
import {type Application, Container, Sprite, Texture, type Ticker} from 'pixi.js'
import {afterEach, expect, it, vi} from 'vitest'
import {VideoLoop} from '../video-loop'

afterEach(() => vi.restoreAllMocks())
it('should fade the final frame over restarted playback without stopping the application', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  vi.spyOn(Texture, 'from').mockImplementation(() => new Texture())
  const video = document.createElement('video')
  Object.defineProperties(video, {videoHeight: {value: 240}, videoWidth: {value: 160}})
  vi.spyOn(video, 'play').mockResolvedValue()
  video.currentTime = 2
  const sprite = new Sprite(new Texture())
  const stage = new Container()
  stage.addChild(sprite)
  const app = {stage, start: vi.fn(), ticker: {add: vi.fn(), remove: vi.fn()}}
  const loop = new VideoLoop(app as unknown as Application, video, sprite)
  await loop.repeat()
  expect(video.currentTime).toBe(0)
  expect(video.play).toHaveBeenCalledOnce()
  const overlay = stage.children[1]
  expect(overlay.alpha).toBe(1)
  const update = app.ticker.add.mock.calls[0][0] as (ticker: Ticker) => void
  update({elapsedMS: 350} as Ticker)
  expect(overlay.alpha).toBeCloseTo(0.5)
  update({elapsedMS: 350} as Ticker)
  expect(overlay.destroyed).toBe(true)
  expect(stage.children).toEqual([sprite])
  expect(app.ticker.remove).toHaveBeenCalledWith(update)
  loop.destroy()
})
it('should discard a pending restart when media is removed', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as ReturnType<HTMLCanvasElement['getContext']>)
  vi.spyOn(Texture, 'from').mockImplementation(() => new Texture())
  const video = document.createElement('video')
  Object.defineProperties(video, {videoHeight: {value: 240}, videoWidth: {value: 160}})
  let finish!: () => void
  vi.spyOn(video, 'play').mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const sprite = new Sprite(new Texture())
  const stage = new Container()
  stage.addChild(sprite)
  const app = {stage, start: vi.fn(), ticker: {add: vi.fn(), remove: vi.fn()}}
  const loop = new VideoLoop(app as unknown as Application, video, sprite)
  const repeat = loop.repeat()
  loop.destroy()
  finish()
  await repeat
  expect(app.ticker.add).not.toHaveBeenCalled()
  expect(stage.children).toEqual([sprite])
})
