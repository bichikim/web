import {flush, mocks, setupTarotReading} from './fixtures/reading'
import {describe, expect, it} from 'vitest'

describe('useTarotReading model selection', () => {
  const getFixture = setupTarotReading()

  it.each(['resolve', 'reject'] as const)(
    'should cancel projected unsupported checking before readiness %s and retry the same cards',
    async (settlement) => {
      const fixture = getFixture()
      const readiness = Promise.withResolvers<boolean>()
      mocks.supported = false
      mocks.setModelId?.('lfm-2.6b-qad')
      mocks.downloaded.mockReturnValueOnce(readiness.promise)
      fixture.reading.draw()
      const selected = fixture.reading.cards()
      expect(fixture.reading.status()).toBe('checking')

      mocks.setModelId?.('gemma-4-e2b')
      expect(fixture.reading.status()).toBe('unsupported')
      fixture.reading.cancel()
      expect(fixture.reading.status()).toBe('idle')
      if (settlement === 'resolve') {
        readiness.resolve(true)
      } else {
        readiness.reject(new Error('cancelled model readiness'))
      }
      await flush()

      expect(mocks.generate).not.toHaveBeenCalled()
      expect(fixture.reading.error()).toBeNull()
      expect(fixture.reading.output()).toBe('')
      expect(fixture.reading.cards()).toBe(selected)
      mocks.setModelId?.('lfm-2.6b-qad')
      fixture.reading.retry()
      await flush()
      expect(mocks.generate).toHaveBeenCalledWith(
        expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
      )
      expect(fixture.reading.status()).toBe('preparing')
    },
  )

  it('should expose same-card interpretation when the default model becomes supported', async () => {
    const fixture = getFixture()
    mocks.supported = false
    fixture.reading.draw()
    const selected = fixture.reading.cards()
    expect(fixture.reading.status()).toBe('unsupported')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.status()).toBe('idle')
    expect(mocks.downloaded).not.toHaveBeenCalled()

    fixture.reading.retry()
    await flush()

    expect(mocks.downloaded).toHaveBeenCalledWith({modelId: 'lfm-2.6b-qad'})
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(fixture.reading.status()).toBe('preparing')
  })

  it('should ignore stale readiness after repeated model switches in the same mount', async () => {
    const fixture = getFixture()
    const firstReadiness = Promise.withResolvers<boolean>()
    const secondReadiness = Promise.withResolvers<boolean>()
    const thirdReadiness = Promise.withResolvers<boolean>()
    let lfmReadinessCalls = 0
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) => {
      if (modelId === 'lfm-2.6b-qad') {
        lfmReadinessCalls += 1
        if (lfmReadinessCalls === 1) {
          return firstReadiness.promise
        }
        return lfmReadinessCalls === 2 ? secondReadiness.promise : thirdReadiness.promise
      }
      return Promise.resolve(true)
    })

    fixture.reading.draw()
    const selected = fixture.reading.cards()
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    mocks.setModelId?.('gemma-4-e2b')
    await flush()
    expect(fixture.reading.status()).toBe('unsupported')
    firstReadiness.resolve(true)
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(fixture.reading.cards()).toBe(selected)

    fixture.reading.retry()
    await flush()
    expect(fixture.reading.status()).toBe('unsupported')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()

    mocks.setModelId?.('gemma-4-e2b')
    expect(fixture.reading.status()).toBe('unsupported')
    secondReadiness.resolve(true)
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.status()).toBe('unsupported')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    thirdReadiness.resolve(true)
    await flush()
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(fixture.reading.status()).toBe('preparing')
  })

  it('should recover after a stale readiness rejection on a model round trip', async () => {
    const fixture = getFixture()
    const firstReadiness = Promise.withResolvers<boolean>()
    const retryReadiness = Promise.withResolvers<boolean>()
    let lfmReadinessCalls = 0
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) => {
      if (modelId !== 'lfm-2.6b-qad') {
        return Promise.resolve(true)
      }
      lfmReadinessCalls += 1
      return lfmReadinessCalls === 1 ? firstReadiness.promise : retryReadiness.promise
    })

    fixture.reading.draw()
    const selected = fixture.reading.cards()
    mocks.setModelId?.('lfm-2.6b-qad')
    fixture.reading.retry()
    await flush()
    mocks.setModelId?.('gemma-4-e2b')
    expect(fixture.reading.status()).toBe('unsupported')
    firstReadiness.reject(new Error('stale readiness failure'))
    await flush()

    expect(fixture.reading.error()).toBeNull()
    expect(fixture.reading.status()).toBe('unsupported')
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    retryReadiness.resolve(true)
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(fixture.reading.status()).toBe('preparing')
  })

  it('should invalidate pending readiness when locale changes behind a projected unsupported status', async () => {
    const fixture = getFixture()
    const firstReadiness = Promise.withResolvers<boolean>()
    const secondReadiness = Promise.withResolvers<boolean>()
    let lfmReadinessCalls = 0
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) => {
      if (modelId !== 'lfm-2.6b-qad') {
        return Promise.resolve(true)
      }
      lfmReadinessCalls += 1
      return lfmReadinessCalls === 1 ? firstReadiness.promise : secondReadiness.promise
    })

    fixture.reading.draw()
    const selected = fixture.reading.cards()
    mocks.setModelId?.('lfm-2.6b-qad')
    fixture.reading.retry()
    await flush()
    expect(fixture.reading.status()).toBe('checking')

    mocks.setModelId?.('gemma-4-e2b')
    expect(fixture.reading.status()).toBe('unsupported')
    fixture.setLocale('en')
    expect(fixture.reading.status()).toBe('idle')
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.status()).toBe('idle')

    firstReadiness.resolve(true)
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(fixture.reading.status()).toBe('idle')

    fixture.reading.retry()
    await flush()
    secondReadiness.resolve(true)
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, locale: 'en', modelId: 'lfm-2.6b-qad'}),
    )
    expect(fixture.reading.status()).toBe('preparing')
  })

  it('should recover an idle retry after returning to a model whose readiness completed stale', async () => {
    const fixture = getFixture()
    const lfmReadiness = Promise.withResolvers<boolean>()
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) =>
      modelId === 'lfm-2.6b-qad' ? lfmReadiness.promise : Promise.resolve(true),
    )

    fixture.reading.draw()
    const selected = fixture.reading.cards()
    expect(fixture.reading.status()).toBe('unsupported')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    expect(fixture.reading.status()).toBe('checking')

    mocks.setModelId?.('gemma-4-e2b')
    expect(fixture.reading.status()).toBe('unsupported')
    lfmReadiness.resolve(true)
    await flush()
    expect(mocks.generate).not.toHaveBeenCalled()

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(fixture.reading.status()).toBe('preparing')
  })

  it('should discard a previous model response after repeated switches without remounting', async () => {
    const fixture = getFixture()
    mocks.supported = false
    fixture.reading.draw()
    const selected = fixture.reading.cards()
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    const firstRequestId = mocks.generate.mock.lastCall?.[0].requestId as string
    const firstResponse = mocks.responses[0]

    mocks.setModelId?.('gemma-4-e2b')
    fixture.reading.cancel()
    fixture.reading.retry()
    await flush()
    expect(fixture.reading.status()).toBe('unsupported')
    firstResponse?.({requestId: firstRequestId, text: '오래된 해석', type: 'complete'})
    expect(fixture.reading.output()).toBe('')

    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    const secondRequestId = mocks.generate.mock.lastCall?.[0].requestId as string
    expect(secondRequestId).not.toBe(firstRequestId)
    expect(mocks.generate).toHaveBeenCalledTimes(2)
    expect(mocks.generate.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )

    mocks.responses[1]?.({requestId: firstRequestId, text: '오래된 해석', type: 'complete'})
    expect(fixture.reading.output()).toBe('')
    mocks.responses[1]?.({requestId: secondRequestId, text: '새 해석', type: 'complete'})
    expect(fixture.reading.cards()).toBe(selected)
    expect(fixture.reading.output()).toBe('새 해석')
    expect(fixture.reading.status()).toBe('complete')
  })

  it('should ignore model readiness that resolves after the tarot owner is disposed', async () => {
    const fixture = getFixture()
    const readiness = Promise.withResolvers<boolean>()
    mocks.supported = false
    mocks.downloaded.mockImplementation(({modelId}) =>
      modelId === 'lfm-2.6b-qad' ? readiness.promise : Promise.resolve(true),
    )
    fixture.reading.draw()
    mocks.setModelId?.('lfm-2.6b-qad')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()
    expect(fixture.reading.status()).toBe('checking')

    fixture.dispose()
    readiness.resolve(true)
    await flush()

    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('should recover locally after cloud inference errors without downloading cloud assets', async () => {
    const fixture = getFixture()
    mocks.supported = false
    fixture.reading.draw()
    const selected = fixture.reading.cards()
    mocks.setModelId?.('cloud')
    expect(fixture.reading.status()).toBe('idle')
    fixture.reading.retry()
    await flush()

    const cloudRequestId = mocks.generate.mock.lastCall?.[0].requestId as string
    expect(mocks.downloaded).toHaveBeenCalledWith({modelId: 'cloud'})
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({cards: selected, modelId: 'cloud'}),
    )
    expect(mocks.startTextModel).not.toHaveBeenCalled()
    mocks.responses[0]?.({
      message: '일일 한도에 도달했어요.',
      requestId: cloudRequestId,
      restartRequired: false,
      type: 'error',
    })
    expect(fixture.reading.status()).toBe('error')
    expect(fixture.reading.error()).toBe('일일 한도에 도달했어요.')

    mocks.setModelId?.('lfm-2.6b-qad')
    fixture.reading.retry()
    await flush()
    expect(mocks.generate).toHaveBeenCalledTimes(2)
    expect(mocks.generate.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({cards: selected, modelId: 'lfm-2.6b-qad'}),
    )
    expect(mocks.startTextModel).not.toHaveBeenCalled()
    expect(fixture.reading.error()).toBeNull()
    expect(fixture.reading.status()).toBe('preparing')
  })
})
