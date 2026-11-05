/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {withViewer} from './with-viewer'

const state = vi.hoisted(() => ({
  browserClose: vi.fn(),
  cleanup: new Error('cleanup failed'),
  close: vi.fn(),
  post: vi.fn(),
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
    launch: async () => ({
      close: state.browserClose,
      newPage: async () => ({
        addInitScript: vi.fn(),
        frameLocator: () => ({locator: () => ({innerText: async () => 'viewer state'})}),
        on: (name: string, listener: (response: unknown) => void) => {
          if (name === 'response') {
            listener({
              json: async () => ({content: [], structuredContent: {session: 'one'}}),
              url: () => 'http://preview/initial',
            })
          }
        },
        request: {post: state.post},
        setDefaultTimeout: vi.fn(),
      }),
    }),
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
