/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {withViewer} from './with-viewer'

const state = vi.hoisted(() => ({
  browserClose: vi.fn(),
  cleanup: new Error('cleanup failed'),
  close: vi.fn(),
  launch: vi.fn(),
  post: vi.fn(),
  readInitial: vi.fn(async (session: string) => ({content: [], structuredContent: {session}})),
  sessions: vi.fn<() => string[]>().mockReturnValue(['one']),
}))
vi.mock('./create-preview', () => ({
  createPreview: async () => ({
    close: state.close,
    directory: '/test',
    stderr: () => 'server diagnostic',
    url: 'http://preview/',
    workspace: '/test/workspace',
  }),
}))
vi.mock('playwright', () => ({
  chromium: {
    launch: async () => {
      await state.launch()
      return {
        close: state.browserClose,
        newPage: async () => ({
          addInitScript: vi.fn(),
          frameLocator: () => ({locator: () => ({innerText: async () => 'viewer state'})}),
          off: vi.fn(),
          on: (name: string, listener: (response: unknown) => void) => {
            if (name === 'response') {
              for (const session of state.sessions()) {
                listener({
                  json: () => state.readInitial(session),
                  url: () => 'http://preview/initial',
                })
              }
            }
          },
          request: {post: state.post},
          setDefaultTimeout: vi.fn(),
        }),
      }
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  state.post.mockResolvedValue({
    json: async () => ({content: [], structuredContent: {closed: true}}),
    ok: () => true,
  })
})

it('should return the exercise result and close owned resources', async () => {
  expect(await withViewer({}, async () => 0)).toBe(0)
  expect(state.close).toHaveBeenCalledOnce()
  expect(state.browserClose).toHaveBeenCalledOnce()
})

it('should retain the exercise cause and server stderr when cleanup succeeds', async () => {
  const original = new Error('exercise failed')
  const error = await withViewer({}, async () => {
    throw original
  }).catch((failure: unknown) => failure)
  expect(error).toMatchObject({
    cause: original,
    message: expect.stringContaining('server diagnostic'),
  })
  expect(state.close).toHaveBeenCalledOnce()
  expect(state.browserClose).toHaveBeenCalledOnce()
})

it('should report a cleanup-only failure with server stderr', async () => {
  state.post.mockRejectedValueOnce(state.cleanup)
  const error = await withViewer({}, async () => 0).catch((failure: unknown) => failure)
  expect(error).toMatchObject({
    errors: [state.cleanup],
    message: expect.stringContaining('server diagnostic'),
  })
  expect(state.close).toHaveBeenCalledOnce()
  expect(state.browserClose).toHaveBeenCalledOnce()
})

it('should retain the original failure and server stderr when session cleanup also fails', async () => {
  state.post.mockRejectedValueOnce(state.cleanup)
  const original = new Error('original exercise failed')
  const error = await withViewer({}, async () => {
    throw original
  }).catch((failure: unknown) => failure)
  expect(error).toBeInstanceOf(AggregateError)
  expect(error).toMatchObject({message: expect.stringContaining('server diagnostic')})
  if (!(error instanceof AggregateError)) {
    throw new Error('Missing retained failures')
  }
  const aggregate = error
  expect(aggregate.errors[0]).toMatchObject({cause: original})
  expect(aggregate.errors[1]).toBe(state.cleanup)
  expect(state.close).toHaveBeenCalledOnce()
  expect(state.browserClose).toHaveBeenCalledOnce()
})

it('should retain exercise, session, browser and preview failures together', async () => {
  const original = new Error('exercise failed')
  const browserFailure = new Error('browser close failed')
  const previewFailure = new Error('preview close failed')
  state.post.mockRejectedValueOnce(state.cleanup)
  state.browserClose.mockRejectedValueOnce(browserFailure)
  state.close.mockRejectedValueOnce(previewFailure)

  await expect(
    withViewer({}, async () => {
      throw original
    }),
  ).rejects.toMatchObject({
    errors: [
      expect.objectContaining({cause: original}),
      state.cleanup,
      browserFailure,
      previewFailure,
    ],
    message: expect.stringContaining('server diagnostic'),
  })
})

it('should retain the browser launch failure if the preview cannot close', async () => {
  const original = new Error('launch failed')
  const previewFailure = new Error('preview close failed')
  state.launch.mockRejectedValueOnce(original)
  state.close.mockRejectedValueOnce(previewFailure)

  await expect(withViewer({}, async () => 0)).rejects.toMatchObject({
    errors: [original, previewFailure],
  })
  expect(state.browserClose).not.toHaveBeenCalled()
})

it('should retain every failure when several sessions fail to release', async () => {
  const first = new Error('first session close failed')
  const second = new Error('second session close failed')
  state.sessions.mockReturnValueOnce(['one', 'two'])
  state.post.mockRejectedValueOnce(first).mockRejectedValueOnce(second)

  await expect(withViewer({}, async () => 0)).rejects.toMatchObject({
    errors: [expect.objectContaining({errors: [first, second]})],
  })
  expect(state.post).toHaveBeenCalledTimes(2)
  expect(state.browserClose).toHaveBeenCalledOnce()
})

it('should report a failed initial response and still close valid sessions', async () => {
  const initialFailure = new Error('initial response could not be read')
  state.sessions.mockReturnValueOnce(['one', 'two'])
  state.readInitial.mockRejectedValueOnce(initialFailure)

  await expect(withViewer({}, async () => 0)).rejects.toMatchObject({errors: [initialFailure]})
  expect(state.post).toHaveBeenCalledExactlyOnceWith('http://preview/tool', {
    data: {arguments: {session: 'two'}, name: 'code.close'},
  })
  expect(state.browserClose).toHaveBeenCalledOnce()
})
