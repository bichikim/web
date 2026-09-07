/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createDemoDocument,
  parseDocument,
  type ParseDocumentResult,
  preparePuppetDocument,
  serializeDocument,
} from '..'

class MockWorker extends EventTarget {
  public static instances: MockWorker[] = []
  public static postError: unknown

  public readonly postMessage = vi.fn(() => {
    if (MockWorker.postError !== undefined) {
      throw MockWorker.postError
    }
  })

  public readonly terminate = vi.fn()

  public constructor() {
    super()
    MockWorker.instances.push(this)
  }

  public emitError(error: Error) {
    this.dispatchEvent(new ErrorEvent('error', {error}))
  }

  public emitMessage(data: ParseDocumentResult) {
    this.dispatchEvent(new MessageEvent('message', {data}))
  }

  public emitMessageError(data: unknown) {
    this.dispatchEvent(new MessageEvent('messageerror', {data}))
  }
}

const getWorker = () => {
  const worker = MockWorker.instances[0]

  expect(worker).toBeDefined()

  if (worker === undefined) {
    throw new Error('Expected preparePuppetDocument to create a Worker')
  }

  return worker
}

beforeEach(() => {
  MockWorker.instances = []
  MockWorker.postError = undefined
  vi.stubGlobal('Worker', MockWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('preparePuppetDocument', () => {
  it('should resolve the prepared result from the Worker', async () => {
    const result: ParseDocumentResult = {error: {code: 'invalid-document'}, ok: false}
    const promise = preparePuppetDocument({source: '{}'})
    const worker = getWorker()

    expect(worker.postMessage).toHaveBeenCalledWith({source: '{}', type: 'source'})
    worker.emitMessage(result)

    expect(await promise).toEqual(result)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it('should send document objects to the Worker without serializing them', async () => {
    const document = createDemoDocument()
    const promise = preparePuppetDocument({document})
    const worker = getWorker()
    const result: ParseDocumentResult = {error: {code: 'invalid-document'}, ok: false}

    expect(worker.postMessage).toHaveBeenCalledWith({document, type: 'document'})
    worker.emitMessage(result)

    expect(await promise).toEqual(result)
  })

  it('should reuse a document that was already prepared', async () => {
    const result = parseDocument(serializeDocument(createDemoDocument()))

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    await expect(preparePuppetDocument({document: result.document})).resolves.toEqual(result)
    expect(MockWorker.instances).toHaveLength(0)
  })

  it('should prepare synchronously when Worker is unavailable', () => {
    vi.stubGlobal('Worker', undefined)

    return expect(preparePuppetDocument({source: '{}'})).resolves.toEqual({
      error: {code: 'invalid-document'},
      ok: false,
    })
  })

  it('should reject an already aborted request without creating a Worker', () => {
    const abortController = new AbortController()
    abortController.abort(new Error('cancelled'))

    const promise = preparePuppetDocument({signal: abortController.signal, source: '{}'})

    expect(MockWorker.instances).toHaveLength(0)
    return expect(promise).rejects.toThrow('cancelled')
  })

  it('should terminate the Worker when the request is aborted', () => {
    const abortController = new AbortController()
    const promise = preparePuppetDocument({signal: abortController.signal, source: '{}'})
    const worker = getWorker()

    abortController.abort(new Error('cancelled'))

    expect(worker.terminate).toHaveBeenCalledOnce()
    return expect(promise).rejects.toThrow('cancelled')
  })

  it('should reject Worker execution errors', () => {
    const promise = preparePuppetDocument({source: '{}'})
    const worker = getWorker()

    worker.emitError(new Error('worker failed'))

    expect(worker.terminate).toHaveBeenCalledOnce()
    return expect(promise).rejects.toThrow('Puppet document validation Worker failed')
  })

  it('should reject unreadable Worker responses', () => {
    const promise = preparePuppetDocument({source: '{}'})
    const worker = getWorker()

    worker.emitMessageError('unreadable')

    expect(worker.terminate).toHaveBeenCalledOnce()
    return expect(promise).rejects.toThrow(
      'Puppet document validation Worker returned an unreadable response',
    )
  })

  it('should reject Worker request errors', () => {
    MockWorker.postError = new Error('post failed')

    return expect(preparePuppetDocument({source: '{}'})).rejects.toThrow(
      'Puppet document validation Worker request failed',
    )
  })
})
