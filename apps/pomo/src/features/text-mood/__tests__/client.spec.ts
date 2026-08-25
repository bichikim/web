import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createTextMoodAnalyzer, type TextMoodAnalysis} from '../index'
import type {TextMoodWorkerResponse} from '../messages'

type WorkerListener = (event: ErrorEvent | MessageEvent<TextMoodWorkerResponse>) => void

const ANALYSIS: TextMoodAnalysis = {
  margin: 0.4,
  modifiers: [],
  primary: {id: 'calm', probability: 0.7},
  scores: [
    {id: 'calm', probability: 0.7},
    {id: 'warm', probability: 0.3},
  ],
  secondary: null,
  uncertain: false,
}

class FakeWorker {
  static current: FakeWorker | null = null

  readonly postMessage = vi.fn()
  readonly terminate = vi.fn()
  readonly #listeners = new Map<string, Array<WorkerListener>>()

  constructor() {
    FakeWorker.current = this
  }

  addEventListener(type: string, listener: WorkerListener) {
    const listeners = this.#listeners.get(type) ?? []
    listeners.push(listener)
    this.#listeners.set(type, listeners)
  }

  emitError(message: string, error?: unknown) {
    for (const listener of this.#listeners.get('error') ?? []) {
      listener({error, message} as ErrorEvent)
    }
  }

  emitMessage(message: TextMoodWorkerResponse) {
    for (const listener of this.#listeners.get('message') ?? []) {
      listener({data: message} as MessageEvent<TextMoodWorkerResponse>)
    }
  }

  emitMessageError() {
    for (const listener of this.#listeners.get('messageerror') ?? []) {
      listener({} as MessageEvent)
    }
  }
}

const getWorker = () => {
  const worker = FakeWorker.current

  if (worker === null) {
    throw new Error('분위기 분석 Worker가 생성되지 않았습니다.')
  }

  return worker
}

beforeEach(() => {
  FakeWorker.current = null
  vi.stubGlobal('Worker', FakeWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createTextMoodAnalyzer', () => {
  it('should prepare the model and report download progress', async () => {
    const onProgress = vi.fn()
    const analyzer = createTextMoodAnalyzer({onProgress})
    const worker = getWorker()
    const preparation = analyzer.prepare()

    expect(worker.postMessage).toHaveBeenCalledWith({requestId: 1, type: 'prepare'})
    worker.emitMessage({progress: 52, type: 'loading'})
    worker.emitMessage({requestId: 1, type: 'ready'})

    await expect(preparation).resolves.toEqual({
      ok: true,
      value: {repositoryId: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'},
    })
    expect(onProgress).toHaveBeenCalledWith(52)
    analyzer.dispose()
  })

  it('should reject concurrent preparation and ignore unrelated ready events', async () => {
    const analyzer = createTextMoodAnalyzer()
    const worker = getWorker()
    const preparation = analyzer.prepare()

    await expect(analyzer.prepare()).resolves.toMatchObject({
      error: {code: 'model-failed'},
      ok: false,
    })
    worker.emitMessage({requestId: 99, type: 'ready'})
    worker.emitMessage({progress: 10, type: 'loading'})
    worker.emitMessage({requestId: 1, type: 'ready'})
    await expect(preparation).resolves.toMatchObject({ok: true})
  })

  it('should match analysis responses and reject concurrent analysis', async () => {
    const analyzer = createTextMoodAnalyzer()
    const worker = getWorker()
    const analysis = analyzer.analyze({context: '이전 문장', text: '현재 문장'})

    await expect(analyzer.analyze({text: '다른 문장'})).resolves.toMatchObject({
      error: {code: 'classification-failed'},
      ok: false,
    })
    worker.emitMessage({
      analysis: ANALYSIS,
      elapsedMilliseconds: 12,
      requestId: 99,
      type: 'complete',
    })
    worker.emitMessage({
      analysis: ANALYSIS,
      elapsedMilliseconds: 12,
      requestId: 1,
      type: 'complete',
    })

    await expect(analysis).resolves.toEqual({
      ok: true,
      value: {
        analysis: ANALYSIS,
        elapsedMilliseconds: 12,
        status: 'complete',
      },
    })
    expect(worker.postMessage).toHaveBeenCalledWith({
      context: '이전 문장',
      requestId: 1,
      text: '현재 문장',
      type: 'analyze',
    })
    analyzer.dispose()
  })

  it('should resolve learned insufficiency responses without a mood result', async () => {
    const analyzer = createTextMoodAnalyzer()
    const worker = getWorker()
    const analysis = analyzer.analyze({text: '뚜두둥'})

    worker.emitMessage({
      elapsedMilliseconds: 9,
      requestId: 1,
      sufficiency: {insufficient: true, probability: 0.98, threshold: 0.94},
      type: 'insufficient',
    })

    await expect(analysis).resolves.toEqual({
      ok: true,
      value: {
        elapsedMilliseconds: 9,
        status: 'insufficient',
        sufficiency: {insufficient: true, probability: 0.98, threshold: 0.94},
      },
    })
    analyzer.dispose()
  })

  it('should route domain errors to their matching request only', async () => {
    const analyzer = createTextMoodAnalyzer()
    const worker = getWorker()
    const preparation = analyzer.prepare()
    const analysis = analyzer.analyze({text: '문장'})
    const analyzeError = {
      code: 'classification-failed' as const,
      detail: '분석 실패',
      phase: 'analyze' as const,
      retryable: true as const,
    }
    worker.emitMessage({error: analyzeError, requestId: 99, type: 'error'})
    worker.emitMessage({error: analyzeError, requestId: 2, type: 'error'})
    await expect(analysis).resolves.toEqual({error: analyzeError, ok: false})

    const prepareError = {
      code: 'model-failed' as const,
      detail: '준비 실패',
      phase: 'prepare' as const,
      retryable: true as const,
    }
    worker.emitMessage({error: prepareError, requestId: 1, type: 'error'})
    await expect(preparation).resolves.toEqual({error: prepareError, ok: false})
  })

  it('should ignore unrelated insufficient results', async () => {
    const analyzer = createTextMoodAnalyzer()
    const worker = getWorker()
    const analysis = analyzer.analyze({text: '문장'})
    const sufficiency = {insufficient: true, probability: 0.98, threshold: 0.94}
    worker.emitMessage({elapsedMilliseconds: 1, requestId: 99, sufficiency, type: 'insufficient'})
    worker.emitMessage({analysis: ANALYSIS, elapsedMilliseconds: 2, requestId: 1, type: 'complete'})
    await expect(analysis).resolves.toMatchObject({ok: true})
  })

  it('should resolve pending requests after worker failure and disposal', async () => {
    const analyzer = createTextMoodAnalyzer()
    const worker = getWorker()
    const preparation = analyzer.prepare()
    const analysis = analyzer.analyze({text: '문장'})

    worker.emitError('Worker 연결 끊김')
    await expect(preparation).resolves.toMatchObject({
      error: {code: 'worker-failed', detail: 'Worker 연결 끊김', phase: 'prepare'},
      ok: false,
    })
    await expect(analysis).resolves.toMatchObject({
      error: {code: 'worker-failed', detail: 'Worker 연결 끊김', phase: 'analyze'},
      ok: false,
    })

    await expect(analyzer.prepare()).resolves.toMatchObject({
      error: {code: 'worker-failed'},
      ok: false,
    })
    await expect(analyzer.analyze({text: '다시'})).resolves.toMatchObject({
      error: {code: 'worker-failed'},
      ok: false,
    })
    worker.emitError('두 번째 오류')

    analyzer.dispose()
    analyzer.dispose()
    await expect(analyzer.prepare()).resolves.toMatchObject({
      error: {code: 'cancelled'},
      ok: false,
    })
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('should report detailed execution and deserialization failures', async () => {
    const first = createTextMoodAnalyzer()
    const firstWorker = getWorker()
    const firstPreparation = first.prepare()
    const cause = new Error('crashed')
    firstWorker.emitError('', cause)
    await expect(firstPreparation).resolves.toMatchObject({
      error: {detail: '분위기 분석 Worker 실행 오류'},
      ok: false,
    })

    const second = createTextMoodAnalyzer()
    const secondWorker = getWorker()
    const secondPreparation = second.prepare()
    secondWorker.emitMessageError()
    await expect(secondPreparation).resolves.toMatchObject({
      error: {detail: '분위기 분석 Worker 응답을 읽지 못했습니다.'},
      ok: false,
    })
    await expect(second.analyze({text: '폐기 후'})).resolves.toMatchObject({
      error: {code: 'worker-failed'},
      ok: false,
    })
    second.dispose()
    await expect(second.analyze({text: '폐기 후'})).resolves.toMatchObject({
      error: {code: 'cancelled'},
      ok: false,
    })
  })
})
