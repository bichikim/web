/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {findCompanion} from '../companion'
import {showFrame, type ShowFrameOptions} from '../show-frame'

vi.mock('../companion', () => ({findCompanion: vi.fn()}))
const first = {id: 'a', kind: 'photo' as const, name: 'A', size: 10}
const second = {...first, id: 'b'}
const renderer = {
  addPhoto: vi.fn<ShowFrameOptions['renderer']['addPhoto']>(),
  photoSize: () => ({height: 1000, width: 600}),
  present: vi.fn<ShowFrameOptions['renderer']['present']>(),
  show: vi.fn<ShowFrameOptions['renderer']['show']>(),
  viewportSize: () => ({height: 1000, width: 1500}),
} satisfies ShowFrameOptions['renderer']
let controller: AbortController
let options: ShowFrameOptions
beforeEach(() => {
  vi.clearAllMocks()
  controller = new AbortController()
  options = {
    background: {
      items: () => [first, second],
      load: vi.fn<ShowFrameOptions['background']['load']>(async () => new Blob(['a'])),
      markFailed: vi.fn<ShowFrameOptions['background']['markFailed']>(),
    },
    candidates: () => ['b'],
    item: first,
    pairPhotos: true,
    renderer,
    signal: controller.signal,
    sizes: new Map(),
    transition: 'fade',
  }
  renderer.present.mockResolvedValue(true)
  renderer.show.mockResolvedValue(true)
  renderer.addPhoto.mockReturnValue(true)
  vi.mocked(findCompanion).mockResolvedValue(null)
})

it.each([
  {requests: 16, rows: 32},
  {requests: 17, rows: 33},
  {requests: 64, rows: 63},
  {requests: 63, rows: 64},
  {requests: 64, rows: 64},
  {requests: 999, rows: 1000},
])(
  'should retain candidate order and first item identity for $rows rows and $requests requests',
  async ({rows, requests}) => {
    const items = Array.from({length: rows}, (_, index) => ({...first, id: `media-${index}`}))
    const original = items[0]!
    items[1] = {...original, name: 'Later duplicate'}
    const last = items.at(-1)!
    const remaining = Array.from(
      {length: requests - 4},
      (_, index) => items[2 + (index % (rows - 2))]!,
    )
    const ids = Object.freeze([
      last.id,
      original.id,
      'missing',
      original.id,
      ...remaining.map((item) => item.id),
    ])
    options = {
      ...options,
      background: {...options.background, items: () => Object.freeze(items)},
      candidates: () => ids,
    }

    expect(await showFrame(options)).toEqual({companionId: null})

    const candidates = vi.mocked(findCompanion).mock.calls[0]![0].candidates
    const expected = [last, original, original, ...remaining]
    expect(candidates).toHaveLength(expected.length)
    candidates.forEach((candidate, index) => expect(candidate).toBe(expected[index]))
  },
)

it.each([2, 1000])(
  'should read items before candidate IDs once after preparing %s rows',
  async (rows) => {
    const items = Array.from({length: rows}, (_, index) => ({...first, id: `media-${index}`}))
    const trace: string[] = []
    const companion = {id: items.at(-1)!.id, image: {} as HTMLImageElement, release: vi.fn()}
    const readItems = vi.fn(() => {
      trace.push('items')
      return items
    })
    const candidates = vi.fn(() => {
      trace.push('candidates')
      return items.slice(1).map((item) => item.id)
    })
    vi.mocked(findCompanion).mockImplementation(async ({sizes}) => {
      trace.push('find')
      expect(sizes.get(first.id)).toEqual({height: 1000, width: 600})
      return companion
    })
    const localRenderer = {
      ...renderer,
      addPhoto: vi.fn(() => {
        trace.push('add')
        return true
      }),
      photoSize: () => {
        trace.push('size')
        return renderer.photoSize()
      },
      present: vi.fn(async () => {
        trace.push('present')
        return true
      }),
      show: vi.fn(async () => {
        trace.push('show')
        return true
      }),
      viewportSize: () => {
        trace.push('viewport')
        return renderer.viewportSize()
      },
    }
    options = {
      ...options,
      background: {
        ...options.background,
        items: readItems,
        load: vi.fn(async () => {
          trace.push('load')
          return new Blob()
        }),
      },
      candidates,
      renderer: localRenderer,
    }

    expect(await showFrame(options)).toEqual({companionId: companion.id})
    expect(trace).toEqual([
      'load',
      'show',
      'size',
      'items',
      'candidates',
      'viewport',
      'find',
      'items',
      'add',
      'present',
    ])
    expect(readItems).toHaveBeenCalledTimes(2)
    expect(candidates).toHaveBeenCalledOnce()
  },
)

it.each([true, false])(
  'should recheck companion membership after awaiting discovery when retained is %s',
  async (retained) => {
    const items = Array.from({length: 1000}, (_, index) => ({...first, id: `media-${index}`}))
    const selected = items.at(-1)!
    const replacement = {...selected, name: 'Replacement'}
    let current = items
    const companion = {id: selected.id, image: {} as HTMLImageElement, release: vi.fn()}
    vi.mocked(findCompanion).mockImplementation(async () => {
      current = retained ? [replacement] : []
      return companion
    })
    options = {
      ...options,
      background: {...options.background, items: () => current},
      candidates: () => items.slice(1).map((item) => item.id),
    }

    expect(await showFrame(options)).toEqual({companionId: retained ? selected.id : null})
    expect(vi.mocked(findCompanion).mock.calls[0]![0].candidates.at(-1)).toBe(selected)
    if (retained) {
      expect(renderer.addPhoto).toHaveBeenCalledWith(companion)
      expect(companion.release).not.toHaveBeenCalled()
    } else {
      expect(renderer.addPhoto).not.toHaveBeenCalled()
      expect(companion.release).toHaveBeenCalledOnce()
    }
  },
)

it.each(['load', 'show'] as const)(
  'should skip candidate access after cancellation during %s',
  async (phase) => {
    const candidates = vi.fn(() => ['b'])
    const items = vi.fn(() => [first, second])
    options = {...options, background: {...options.background, items}, candidates}
    if (phase === 'load') {
      options = {
        ...options,
        background: {
          ...options.background,
          load: async () => {
            controller.abort()
            return new Blob()
          },
        },
      }
    } else {
      renderer.show.mockImplementation(async () => {
        controller.abort()
        return true
      })
    }

    expect(await showFrame(options)).toBeNull()
    expect(items).not.toHaveBeenCalled()
    expect(candidates).not.toHaveBeenCalled()
    expect(findCompanion).not.toHaveBeenCalled()
    expect(renderer.present).not.toHaveBeenCalled()
  },
)

it.each(['items', 'candidates'] as const)(
  'should propagate %s accessor errors without presenting',
  async (source) => {
    const error = new Error('Snapshot failed')
    const items = vi.fn(() => {
      if (source === 'items') {
        throw error
      }
      return [first, second]
    })
    const candidates = vi.fn(() => {
      throw error
    })
    options = {...options, background: {...options.background, items}, candidates}

    await expect(showFrame(options)).rejects.toBe(error)
    expect(items).toHaveBeenCalledOnce()
    expect(candidates).toHaveBeenCalledTimes(source === 'items' ? 0 : 1)
    expect(findCompanion).not.toHaveBeenCalled()
    expect(renderer.present).not.toHaveBeenCalled()
  },
)

it('should keep candidate snapshots independent when discovery starts another frame', async () => {
  const items = Array.from({length: 1000}, (_, index) => ({...first, id: `media-${index}`}))
  const replacements = items.map((item) => ({...item, name: 'Replacement'}))
  const ids = items.slice(1).map((item) => item.id)
  const companion = {id: items.at(-1)!.id, image: {} as HTMLImageElement, release: vi.fn()}
  const next = {...companion, release: vi.fn()}
  let nested: Promise<Awaited<ReturnType<typeof showFrame>>> | undefined
  const nestedOptions = {
    ...options,
    background: {...options.background, items: () => replacements},
    candidates: () => ids,
    signal: new AbortController().signal,
  }
  vi.mocked(findCompanion)
    .mockImplementationOnce(async () => {
      nested = showFrame(nestedOptions)
      return companion
    })
    .mockResolvedValueOnce(next)
  options = {
    ...options,
    background: {...options.background, items: () => items},
    candidates: () => ids,
  }

  expect(await showFrame(options)).toEqual({companionId: companion.id})
  expect(await nested).toEqual({companionId: next.id})
  expect(vi.mocked(findCompanion).mock.calls[0]![0].candidates[0]).toBe(items[1])
  expect(vi.mocked(findCompanion).mock.calls[1]![0].candidates[0]).toBe(replacements[1])
  expect(companion.release).not.toHaveBeenCalled()
  expect(next.release).not.toHaveBeenCalled()
})
it('should return a companion only after the renderer accepts it', async () => {
  const companion = {id: 'b', image: {} as HTMLImageElement, release: vi.fn()}
  vi.mocked(findCompanion).mockResolvedValue(companion)
  expect(await showFrame(options)).toEqual({companionId: 'b'})
  expect(companion.release).not.toHaveBeenCalled()
  renderer.addPhoto.mockReturnValue(false)
  expect(await showFrame(options)).toEqual({companionId: null})
  expect(companion.release).toHaveBeenCalledOnce()
})
it('should release a late companion after cancellation without adding it', async () => {
  const companion = {id: 'b', image: {} as HTMLImageElement, release: vi.fn()}
  vi.mocked(findCompanion).mockImplementation(async () => {
    controller.abort()
    return companion
  })
  expect(await showFrame(options)).toBeNull()
  expect(renderer.addPhoto).not.toHaveBeenCalled()
  expect(companion.release).toHaveBeenCalledOnce()
})
it('should skip companion discovery when disabled or playing a video', async () => {
  await showFrame({...options, pairPhotos: false})
  await showFrame({...options, item: {...first, kind: 'video'}})
  expect(findCompanion).not.toHaveBeenCalled()
})

it('should wait for the completed group transition before reporting the companion as shown', async () => {
  const companion = {id: 'b', image: {} as HTMLImageElement, release: vi.fn()}
  vi.mocked(findCompanion).mockResolvedValue(companion)
  let finish!: (completed: boolean) => void
  renderer.present.mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve
      }),
  )
  const completed = vi.fn()
  const showing = showFrame(options).then(completed)
  await vi.waitFor(() => expect(renderer.present).toHaveBeenCalledWith('fade'))
  expect(renderer.addPhoto).toHaveBeenCalledWith(companion)
  expect(completed).not.toHaveBeenCalled()
  finish(true)
  await showing
  expect(completed).toHaveBeenCalledWith({companionId: 'b'})
})

it('should not consume a companion when the transition is canceled', async () => {
  vi.mocked(findCompanion).mockResolvedValue(null)
  renderer.present.mockResolvedValue(false)
  expect(await showFrame(options)).toBeNull()
})
