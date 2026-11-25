import {afterEach, expect, test, vi} from 'vitest'
import type {DrawGpu} from '../types'
import {createGpuPresenter} from '../create-presenter'
import {createEmptyDocument} from '../../../create-empty-document'
import {getPartRenderFrame} from '../../../internal/render-plan'
const deferred = <T>() => {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return {promise, resolve}
}
afterEach(() => vi.unstubAllGlobals())
const document = createEmptyDocument()
const frame = {frame: getPartRenderFrame(document), vertices: new Float32Array(0)}
const job = {
  display: new Float32Array(0),
  document,
  frame,
  height: 1,
  kind: 'draw' as const,
  vertices: frame.vertices,
  view: [1, 1, 0, 0] as const,
  width: 1,
}
const bitmap = () => ({close: vi.fn(), height: 1, width: 1}) satisfies ImageBitmap

const createSurface = () => {
  let frame: FrameRequestCallback | undefined
  const events = new EventTarget()
  const surface = {
    addEventListener: events.addEventListener.bind(events),
    defaultView: {
      cancelAnimationFrame: vi.fn(() => {
        frame = undefined
      }),
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        frame = callback
        return 1
      }),
    },
    removeEventListener: events.removeEventListener.bind(events),
    timeline: {currentTime: 0},
    visibilityState: 'visible' as DocumentVisibilityState,
  }
  return {
    hide() {
      surface.visibilityState = 'hidden'
      events.dispatchEvent(new Event('visibilitychange'))
    },
    refresh() {
      const callback = frame
      frame = undefined
      surface.timeline.currentTime += 16
      callback?.(surface.timeline.currentTime)
    },
    surface,
  }
}

test('should commit a Worker canvas submission without scheduling a second display step', async () => {
  const {surface} = createSurface()
  const draw = deferred<null>()
  const show = vi.fn()
  const presenter = createGpuPresenter({
    client: {draw: () => draw.promise},
    onError: vi.fn(),
    presentation: 'animation-frame',
    show,
    surface,
  })
  try {
    presenter.queue(job)
    const submitted = presenter.flush()
    expect(show).not.toHaveBeenCalled()
    draw.resolve(null)
    await draw.promise
    expect(show).toHaveBeenCalledExactlyOnceWith(null, job)
    expect(surface.defaultView.requestAnimationFrame).not.toHaveBeenCalled()
    await submitted
  } finally {
    presenter.destroy()
  }
})

test('should reuse a prepared bitmap only when the matching frame is submitted', async () => {
  const {refresh, surface} = createSurface()
  const image = bitmap()
  const rendered = deferred<ImageBitmap>()
  const client = {draw: vi.fn(), prefetch: vi.fn().mockReturnValue(rendered.promise)}
  const show = vi.fn()
  const presenter = createGpuPresenter({
    client,
    onError: vi.fn(),
    presentation: 'animation-frame',
    show,
    surface,
  })
  try {
    presenter.prepare(() => job)
    expect(client.prefetch).toHaveBeenCalledExactlyOnceWith(job)
    rendered.resolve(image)
    presenter.queue(job)
    await vi.waitFor(() => expect(surface.defaultView.requestAnimationFrame).toHaveBeenCalledOnce())
    expect(show).not.toHaveBeenCalled()
    refresh()
    await presenter.flush()
    expect(show).toHaveBeenCalledExactlyOnceWith(image, job)
    expect(client.draw).not.toHaveBeenCalled()
  } finally {
    presenter.destroy()
  }
})

test('should retain a discarded preparation until the GPU releases the frame', async () => {
  const image = bitmap()
  const rendered = deferred<ImageBitmap>()
  const client = {draw: vi.fn(), prefetch: vi.fn().mockReturnValue(rendered.promise)}
  const show = vi.fn()
  const presenter = createGpuPresenter({client, onError: vi.fn(), show})
  try {
    presenter.prepare(() => job)
    const released = presenter.discardPreparation(frame)
    expect(released).toBeInstanceOf(Promise)
    rendered.resolve(image)
    await released
    expect(image.close).toHaveBeenCalledOnce()
    expect(show).not.toHaveBeenCalled()
  } finally {
    presenter.destroy()
  }
})

test.each([undefined, 'auto', 'when-ready'] as const)(
  'should show the first image immediately and submit an overlapping image after the refresh (%s)',
  async (presentation) => {
    const {refresh, surface} = createSurface()
    const first = bitmap()
    const next = bitmap()
    const show = vi.fn()
    const presenter = createGpuPresenter({
      client: {draw: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(next)},
      onError: vi.fn(),
      presentation,
      show,
      surface,
    })
    try {
      presenter.queue(job)
      await presenter.flush()
      expect(show).toHaveBeenCalledExactlyOnceWith(first, job)
      expect(surface.defaultView.requestAnimationFrame).not.toHaveBeenCalled()
      const second = {...job, width: 2}
      presenter.queue(second)
      const displayed = presenter.flush()
      await Promise.resolve()
      expect(show).toHaveBeenCalledOnce()
      refresh()
      expect(show).toHaveBeenCalledOnce()
      await displayed
      expect(show).toHaveBeenLastCalledWith(next, second)
    } finally {
      presenter.destroy()
    }
  },
)

test('should publish only the newest completed image during the rendering update', async () => {
  const {refresh, surface} = createSurface()
  const first = bitmap()
  const newest = bitmap()
  const nextDrawStarted = deferred<void>()
  const nextDraw = deferred<ImageBitmap>()
  const show = vi.fn()
  const presenter = createGpuPresenter({
    client: {
      draw: vi
        .fn()
        .mockResolvedValueOnce(first)
        .mockImplementationOnce(() => {
          nextDrawStarted.resolve()
          return nextDraw.promise
        }),
    },
    onError: vi.fn(),
    presentation: 'animation-frame',
    show,
    surface,
  })
  try {
    const nextJob = {...job, width: 2}
    presenter.queue(job)
    presenter.queue(nextJob)
    const displayed = presenter.flush()
    await nextDrawStarted.promise
    expect(show).not.toHaveBeenCalled()
    nextDraw.resolve(newest)
    await Promise.resolve()
    expect(first.close).toHaveBeenCalledOnce()
    expect(surface.defaultView.requestAnimationFrame).toHaveBeenCalledOnce()
    refresh()
    expect(show).toHaveBeenCalledExactlyOnceWith(newest, nextJob)
    await displayed
    expect(newest.close).not.toHaveBeenCalled()
  } finally {
    presenter.destroy()
  }
})

test('should publish the pending image if the rendering update is suspended by hiding the document', async () => {
  const {hide, refresh, surface} = createSurface()
  const image = bitmap()
  const show = vi.fn()
  const presenter = createGpuPresenter({
    client: {draw: vi.fn().mockResolvedValueOnce(image)},
    onError: vi.fn(),
    presentation: 'animation-frame',
    show,
    surface,
  })
  try {
    presenter.queue(job)
    const displayed = presenter.flush()
    await Promise.resolve()
    expect(show).not.toHaveBeenCalled()
    hide()
    await displayed
    refresh()
    expect(show).toHaveBeenCalledExactlyOnceWith(image, job)
  } finally {
    presenter.destroy()
  }
})

test('should close the overlapping image if the presentation is cancelled before submission', async () => {
  const {refresh, surface} = createSurface()
  const next = bitmap()
  const show = vi.fn()
  const presenter = createGpuPresenter({
    client: {draw: vi.fn().mockResolvedValueOnce(bitmap()).mockResolvedValueOnce(next)},
    onError: vi.fn(),
    show,
    surface,
  })
  try {
    presenter.queue(job)
    await presenter.flush()
    presenter.queue(job)
    const displayed = presenter.flush()
    await Promise.resolve()
    refresh()
    presenter.cancel()
    await displayed
    expect(show).toHaveBeenCalledOnce()
    expect(next.close).toHaveBeenCalledOnce()
  } finally {
    presenter.destroy()
  }
})

test('should submit the overlapping image when the document becomes hidden', async () => {
  const {hide, surface} = createSurface()
  const next = bitmap()
  const show = vi.fn()
  const presenter = createGpuPresenter({
    client: {draw: vi.fn().mockResolvedValueOnce(bitmap()).mockResolvedValueOnce(next)},
    onError: vi.fn(),
    show,
    surface,
  })
  try {
    presenter.queue(job)
    await presenter.flush()
    presenter.queue(job)
    const displayed = presenter.flush()
    await Promise.resolve()
    hide()
    await displayed
    expect(show).toHaveBeenLastCalledWith(next, job)
  } finally {
    presenter.destroy()
  }
})

test('should display a completed image without requesting a refresh callback', async () => {
  const request = vi.fn()
  vi.stubGlobal('requestAnimationFrame', request)
  const image = bitmap()
  const client = {draw: vi.fn().mockResolvedValue(image)}
  const show = vi.fn()
  const presenter = createGpuPresenter({client, onError: vi.fn(), show})
  presenter.queue(job)
  const done = presenter.flush()
  try {
    await done
    expect(show).toHaveBeenCalledExactlyOnceWith(image, job)
    expect(request).not.toHaveBeenCalled()
  } finally {
    presenter.destroy()
  }
})

test('should coalesce pending redraws while displaying each completed image immediately', async () => {
  const first = deferred<ImageBitmap>()
  const second = deferred<ImageBitmap>()
  const started = deferred<void>()
  const client = {
    draw: vi
      .fn((_command: DrawGpu) => first.promise)
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(() => {
        started.resolve()
        return second.promise
      }),
  }
  const show = vi.fn()
  const onError = vi.fn()
  const presenter = createGpuPresenter({client, onError, show})
  const a = bitmap()
  const b = bitmap()
  presenter.queue(job)
  presenter.queue({...job, width: 2})
  presenter.queue({...job, width: 3})
  const done = presenter.flush()
  first.resolve(a)
  await started.promise
  expect(client.draw).toHaveBeenCalledTimes(2)
  expect(client.draw.mock.calls[1]?.[0].width).toBe(3)
  expect(show).toHaveBeenCalledExactlyOnceWith(a, job)
  second.resolve(b)
  await done
  expect(show.mock.calls.map((call) => call[1].width)).toEqual([1, 3])
  expect(onError).not.toHaveBeenCalled()
  presenter.destroy()
})

test.each(['cancel', 'destroy'] as const)(
  'should close an image completed after %s without displaying it',
  async (operation) => {
    const pending = deferred<ImageBitmap>()
    const closed = deferred<void>()
    const image = {close: vi.fn(() => closed.resolve()), height: 1, width: 1}
    const show = vi.fn()
    const presenter = createGpuPresenter({
      client: {draw: vi.fn().mockReturnValue(pending.promise)},
      onError: vi.fn(),
      show,
    })
    presenter.queue(job)
    const done = presenter.flush()
    presenter[operation]()
    await done
    pending.resolve(image)
    await closed.promise
    expect(show).not.toHaveBeenCalled()
    expect(image.close).toHaveBeenCalledOnce()
    presenter.destroy()
  },
)

test('should reject pending display and report a GPU failure once', async () => {
  const error = new Error('device lost')
  const onError = vi.fn()
  const client = {draw: vi.fn().mockRejectedValue(error)}
  const presenter = createGpuPresenter({client, onError, show: vi.fn()})
  presenter.queue(job)
  await expect(presenter.flush()).rejects.toBe(error)
  await expect(presenter.flush()).rejects.toMatchObject({cause: error, message: error.message})
  expect(onError).toHaveBeenCalledExactlyOnceWith(error)
  presenter.destroy()
})

test('should display successive GPU results without a refresh boundary', async () => {
  const a = bitmap()
  const b = bitmap()
  const client = {draw: vi.fn().mockResolvedValueOnce(a).mockResolvedValueOnce(b)}
  const show = vi.fn()
  const presenter = createGpuPresenter({client, onError: vi.fn(), show})
  presenter.queue(job)
  presenter.queue({...job, width: 2})
  await presenter.flush()
  expect(show.mock.calls.map((call) => call[0])).toEqual([a, b])
  expect(a.close).not.toHaveBeenCalled()
  expect(b.close).not.toHaveBeenCalled()
  presenter.destroy()
})

test.each(['cancel', 'destroy'] as const)(
  'should leave the displayed image owned by the consumer after %s',
  async (operation) => {
    const image = bitmap()
    const show = vi.fn()
    const presenter = createGpuPresenter({
      client: {draw: vi.fn().mockResolvedValue(image)},
      onError: vi.fn(),
      show,
    })
    presenter.queue(job)
    await presenter.flush()
    presenter[operation]()
    expect(show).toHaveBeenCalledOnce()
    expect(image.close).not.toHaveBeenCalled()
    presenter.destroy()
  },
)

test('should reject display and discard queued redraws when canvas submission fails', async () => {
  const pending = deferred<ImageBitmap>()
  const image = bitmap()
  const error = new Error('canvas lost')
  const onError = vi.fn()
  const client = {draw: vi.fn().mockReturnValue(pending.promise)}
  const show = vi.fn(() => {
    throw error
  })
  const presenter = createGpuPresenter({client, onError, show})
  presenter.queue(job)
  presenter.queue({...job, width: 2})
  const done = expect(presenter.flush()).rejects.toBe(error)
  pending.resolve(image)
  await done
  presenter.queue({...job, width: 3})
  await expect(presenter.flush()).rejects.toMatchObject({cause: error})
  expect(image.close).toHaveBeenCalledOnce()
  expect(client.draw).toHaveBeenCalledOnce()
  expect(onError).toHaveBeenCalledExactlyOnceWith(error)
  presenter.destroy()
})

test('should settle requested display without waiting for a newer GPU job', async () => {
  const first = deferred<ImageBitmap>()
  const second = deferred<ImageBitmap>()
  const started = deferred<void>()
  const closed = deferred<void>()
  const later = {close: vi.fn(() => closed.resolve()), height: 1, width: 1}
  const client = {
    draw: vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(() => {
        started.resolve()
        return second.promise
      }),
  }
  const show = vi.fn()
  const presenter = createGpuPresenter({client, onError: vi.fn(), show})
  const image = bitmap()
  presenter.queue(job)
  const done = presenter.flush()
  presenter.queue({...job, width: 2})
  first.resolve(image)
  await done
  await started.promise
  expect(show).toHaveBeenCalledExactlyOnceWith(image, job)
  expect(client.draw).toHaveBeenCalledTimes(2)
  presenter.destroy()
  second.resolve(later)
  await closed.promise
})

test('should resume after cancellation while an obsolete GPU job completes', async () => {
  const first = deferred<ImageBitmap>()
  const second = deferred<ImageBitmap>()
  const started = deferred<void>()
  const client = {
    draw: vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockImplementationOnce(() => {
        started.resolve()
        return second.promise
      }),
  }
  const show = vi.fn()
  const onError = vi.fn()
  const presenter = createGpuPresenter({client, onError, show})
  const obsolete = bitmap()
  const current = bitmap()
  presenter.queue(job)
  const cancelled = presenter.flush()
  presenter.cancel()
  await cancelled
  presenter.queue({...job, width: 2})
  const done = presenter.flush()
  first.resolve(obsolete)
  await started.promise
  expect(obsolete.close).toHaveBeenCalledOnce()
  expect(show).not.toHaveBeenCalled()
  second.resolve(current)
  await done
  expect(show).toHaveBeenCalledExactlyOnceWith(current, {...job, width: 2})
  expect(onError).not.toHaveBeenCalled()
  presenter.destroy()
})
