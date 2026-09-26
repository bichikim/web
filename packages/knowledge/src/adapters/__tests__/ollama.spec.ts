import {describe, expect, it, vi} from 'vitest'

import {createOllamaEmbeddingProvider} from '../ollama'

const createFetch = (response: Response): typeof fetch => vi.fn(async () => response)

describe('createOllamaEmbeddingProvider', () => {
  it('should use the runtime fetch implementation when none is provided', async () => {
    const fetch = createFetch(
      Response.json({
        embeddings: [[0.1]],
        model: 'bge-m3',
      }),
    )
    vi.stubGlobal('fetch', fetch)

    try {
      const provider = createOllamaEmbeddingProvider({
        baseUrl: 'http://127.0.0.1:11434',
        model: 'bge-m3',
      })

      await expect(provider.embed(['text'])).resolves.toMatchObject({ok: true})
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('should return a model identity and equal-size vectors for a batch', async () => {
    const fetch = createFetch(
      Response.json({
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ],
        model: 'bge-m3',
      }),
    )
    const provider = createOllamaEmbeddingProvider({
      baseUrl: 'http://127.0.0.1:11434/',
      fetch,
      model: 'bge-m3',
    })

    await expect(provider.embed(['인증 정책', 'payment policy'])).resolves.toEqual({
      ok: true,
      value: {
        identity: {
          dimensions: 3,
          model: 'bge-m3',
          provider: 'ollama',
        },
        vectors: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ],
      },
    })
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:11434/api/embed', {
      body: JSON.stringify({
        input: ['인증 정책', 'payment policy'],
        model: 'bge-m3',
        truncate: false,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })
  })

  it('should reject an empty input before sending a request', async () => {
    const fetch = createFetch(Response.json({}))
    const provider = createOllamaEmbeddingProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetch,
      model: 'bge-m3',
    })

    await expect(provider.embed([])).resolves.toEqual({
      error: {
        code: 'empty-embedding-input',
        retryable: false,
      },
      ok: false,
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    {
      body: {embeddings: [[0.1], [0.2, 0.3]], model: 'bge-m3'},
      issue: 'dimension',
    },
    {
      body: {embeddings: [[0.1]], model: 'bge-m3'},
      issue: 'count',
    },
    {
      body: {embeddings: [[], []], model: 'bge-m3'},
      issue: 'dimension',
    },
    {
      body: {embeddings: [['invalid']], model: 'bge-m3'},
      issue: 'response',
    },
  ])('should reject an invalid Ollama $issue response', async ({body, issue}) => {
    const provider = createOllamaEmbeddingProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetch: createFetch(Response.json(body)),
      model: 'bge-m3',
    })

    const result = await provider.embed(['one', 'two'])

    expect(result).toMatchObject({
      error: {
        code: 'invalid-embedding-response',
        retryable: false,
      },
      ok: false,
    })

    if (!result.ok && result.error.code === 'invalid-embedding-response') {
      expect(result.error.detail).toContain(issue)
    }
  })

  it.each([
    [429, true],
    [400, false],
    [503, true],
  ])('should classify HTTP %s retryability as %s', async (status, retryable) => {
    const provider = createOllamaEmbeddingProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetch: createFetch(new Response(null, {status})),
      model: 'bge-m3',
    })

    await expect(provider.embed(['text'])).resolves.toEqual({
      error: {
        code: 'embedding-request-failed',
        retryable,
        status,
      },
      ok: false,
    })
  })

  it('should normalize a network failure as unavailable', async () => {
    const provider = createOllamaEmbeddingProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetch: vi.fn(async () => {
        throw new Error('connection refused')
      }),
      model: 'bge-m3',
    })

    await expect(provider.embed(['text'])).resolves.toEqual({
      error: {
        code: 'embedding-unavailable',
        detail: 'connection refused',
        retryable: true,
      },
      ok: false,
    })
  })

  it('should stringify a non-Error network failure', async () => {
    const provider = createOllamaEmbeddingProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetch: vi.fn(async () => {
        const failure: unknown = 'connection stopped'
        // oxlint-disable-next-line no-throw-literal -- exercises the unknown error boundary.
        throw failure
      }),
      model: 'bge-m3',
    })

    await expect(provider.embed(['text'])).resolves.toMatchObject({
      error: {
        code: 'embedding-unavailable',
        detail: 'connection stopped',
      },
      ok: false,
    })
  })

  it('should reject a response that is not JSON', async () => {
    const provider = createOllamaEmbeddingProvider({
      baseUrl: 'http://127.0.0.1:11434',
      fetch: createFetch(new Response('not-json')),
      model: 'bge-m3',
    })

    await expect(provider.embed(['text'])).resolves.toMatchObject({
      error: {
        code: 'invalid-embedding-response',
        detail: expect.stringContaining('response:'),
      },
      ok: false,
    })
  })
})
