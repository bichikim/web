/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  type DialogueClient,
  type DialogueWriterController,
  type DialogueWriterRuntime,
  useDialogueWriter,
} from '../index'
import type {DialogueWorkerResponse} from '../messages'

interface DialogueTestRoot {
  readonly controller: DialogueWriterController
  readonly dispose: () => void
}

interface TestRuntime extends DialogueWriterRuntime {
  readonly client: DialogueClient
  readonly emit: (response: DialogueWorkerResponse) => void
}

const createRuntime = (supported: boolean): TestRuntime => {
  let onResponse: ((response: DialogueWorkerResponse) => void) | null = null
  const client: DialogueClient = {
    dispose: vi.fn(),
    generate: vi.fn(),
    prepare: vi.fn(),
  }

  return {
    client,
    createClient: vi.fn((options) => {
      onResponse = options.onResponse
      return client
    }),
    emit: (response) => {
      if (onResponse === null) {
        throw new Error('대화문 client가 생성되지 않았습니다.')
      }

      onResponse(response)
    },
    supportsWebGpu: vi.fn(() => supported),
  }
}

const createDialogueRoot = (
  runtime: DialogueWriterRuntime,
  onComplete?: (output: string) => void,
): DialogueTestRoot => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useDialogueWriter({
      initialRequest: '  삶의 행복  ',
      modelId: 'qwen-2b',
      onComplete,
      runtime,
    })
  })

  return {controller, dispose: disposeRoot}
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('useDialogueWriter', () => {
  it('should expose an unsupported state without creating a browser client', () => {
    const runtime = createRuntime(false)
    const root = createDialogueRoot(runtime)

    root.controller.prepare()
    root.controller.generate()

    expect(root.controller.state()).toEqual({status: 'unsupported'})
    expect(root.controller.canPrepare()).toBe(false)
    expect(root.controller.canGenerate()).toBe(false)
    expect(root.controller.statusMessage()).toContain('WebGPU를 사용할 수 없어요')
    expect(runtime.createClient).not.toHaveBeenCalled()
    root.dispose()
  })

  it('should use optional defaults and release without WebGPU', () => {
    vi.stubGlobal('navigator', {})
    let disposeRoot: () => void = () => undefined
    const controller = createRoot((dispose) => {
      disposeRoot = dispose
      return useDialogueWriter({modelId: 'qwen-2b'})
    })

    expect(controller.request()).toBe('')
    expect(controller.state()).toEqual({status: 'unsupported'})
    controller.release()
    expect(controller.state()).toEqual({status: 'unsupported'})
    disposeRoot()
  })

  it('should prepare, stream, complete, copy, and dispose one client session', async () => {
    const onComplete = vi.fn()
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', {clipboard: {writeText}})
    const runtime = createRuntime(true)
    const root = createDialogueRoot(runtime, onComplete)

    expect(root.controller.state()).toEqual({status: 'idle'})
    expect(root.controller.statusMessage()).toContain('처음 한 번만 내려받고')
    expect(root.controller.statusMessage()).not.toContain('브라우저')
    root.controller.prepare()
    root.controller.prepare()
    expect(root.controller.state()).toMatchObject({percentage: 0, status: 'loading'})
    expect(runtime.client.prepare).toHaveBeenCalledTimes(1)
    expect(runtime.createClient).toHaveBeenCalledWith(expect.objectContaining({modelId: 'qwen-2b'}))

    runtime.emit({
      files: [],
      loadedBytes: 50,
      percentage: 50,
      totalBytes: 100,
      type: 'loading',
    })
    expect(root.controller.statusMessage()).toBe('모델 전체 내려받는 중 · 50%')
    runtime.emit({files: [], loadedBytes: 100, percentage: 100, totalBytes: 100, type: 'loading'})
    expect(root.controller.statusMessage()).toBe('다운로드 완료 · 모델 시작 중…')
    runtime.emit({type: 'ready'})
    expect(root.controller.canGenerate()).toBe(true)
    expect(root.controller.statusMessage()).toContain('모델 준비가 끝났어요')

    root.controller.generate()
    expect(runtime.client.generate).toHaveBeenCalledWith('삶의 행복')
    runtime.emit({type: 'started'})
    runtime.emit({text: '행복은 ', type: 'token'})
    runtime.emit({text: '가까이에 있어요.', type: 'token'})
    expect(root.controller.output()).toBe('행복은 가까이에 있어요.')
    expect(root.controller.canCopy()).toBe(false)
    expect(root.controller.statusMessage()).toContain('답변을 만들고')

    runtime.emit({text: '행복은 가까이에 있어요.', type: 'complete'})
    expect(root.controller.canCopy()).toBe(true)
    expect(root.controller.statusMessage()).toContain('완성했어요')
    expect(onComplete).toHaveBeenCalledWith('행복은 가까이에 있어요.')
    await root.controller.copyOutput()
    expect(writeText).toHaveBeenCalledWith('행복은 가까이에 있어요.')

    root.dispose()
    expect(runtime.client.dispose).toHaveBeenCalledTimes(1)
  })

  it('should apply completed output before reporting completion', () => {
    const runtime = createRuntime(true)
    let controller: DialogueWriterController | null = null
    let stateDuringCompletion: ReturnType<DialogueWriterController['state']> | null = null
    const root = createDialogueRoot(runtime, () => {
      stateDuringCompletion = controller?.state() ?? null
    })
    controller = root.controller
    controller.prepare()
    runtime.emit({type: 'ready'})
    controller.generate()
    runtime.emit({type: 'started'})

    runtime.emit({text: '완성된 대사예요.', type: 'complete'})

    expect(stateDuringCompletion).toEqual({status: 'generating'})
    expect(controller.state()).toEqual({status: 'complete'})
    root.dispose()
  })

  it('should prepare and then generate from one request', () => {
    const runtime = createRuntime(true)
    const root = createDialogueRoot(runtime)

    root.controller.generateWithPreparation()
    expect(runtime.client.prepare).toHaveBeenCalledTimes(1)
    expect(runtime.client.generate).not.toHaveBeenCalled()

    runtime.emit({type: 'ready'})
    expect(runtime.client.generate).toHaveBeenCalledWith('삶의 행복')

    root.dispose()
  })

  it('should skip unavailable preparation and generate immediately from a ready model', () => {
    const unsupportedRuntime = createRuntime(false)
    const unsupportedRoot = createDialogueRoot(unsupportedRuntime)

    unsupportedRoot.controller.generateWithPreparation()
    expect(unsupportedRuntime.createClient).not.toHaveBeenCalled()
    unsupportedRoot.dispose()

    const runtime = createRuntime(true)
    const root = createDialogueRoot(runtime)
    root.controller.prepare()
    runtime.emit({type: 'ready'})

    root.controller.generateWithPreparation()

    expect(runtime.client.prepare).toHaveBeenCalledOnce()
    expect(runtime.client.generate).toHaveBeenCalledWith('삶의 행복')
    root.dispose()
  })

  it('should preserve model readiness after a generation error and allow retry', () => {
    const runtime = createRuntime(true)
    const root = createDialogueRoot(runtime)

    root.controller.prepare()
    runtime.emit({message: '준비 실패', restartRequired: false, type: 'error'})
    expect(root.controller.state()).toEqual({
      message: '준비 실패',
      modelReady: false,
      status: 'error',
    })
    expect(root.controller.canPrepare()).toBe(true)
    expect(root.controller.statusMessage()).toBe('준비 실패')

    root.controller.prepare()
    runtime.emit({type: 'ready'})
    root.controller.generate()
    runtime.emit({message: '생성 실패', restartRequired: false, type: 'error'})

    expect(root.controller.state()).toEqual({
      message: '생성 실패',
      modelReady: true,
      status: 'error',
    })
    expect(root.controller.canGenerate()).toBe(true)
    root.controller.generate()
    expect(runtime.client.generate).toHaveBeenCalledTimes(2)
    root.dispose()
  })

  it('should replace a crashed worker before retrying preparation', () => {
    const runtime = createRuntime(true)
    const root = createDialogueRoot(runtime)

    root.controller.prepare()
    runtime.emit({message: 'Worker 충돌', restartRequired: true, type: 'error'})

    expect(root.controller.state()).toEqual({
      message: 'Worker 충돌',
      modelReady: false,
      status: 'error',
    })
    expect(runtime.client.dispose).toHaveBeenCalledTimes(1)

    root.controller.prepare()
    expect(runtime.createClient).toHaveBeenCalledTimes(2)
    root.dispose()
    expect(runtime.client.dispose).toHaveBeenCalledTimes(2)
  })

  it('should ignore generation when the request is empty', async () => {
    const runtime = createRuntime(true)
    const root = createDialogueRoot(runtime)

    root.controller.prepare()
    runtime.emit({type: 'ready'})
    root.controller.setRequest('   ')
    root.controller.generate()
    await root.controller.copyOutput()

    expect(runtime.client.generate).not.toHaveBeenCalled()
    expect(root.controller.canCopy()).toBe(false)
    root.dispose()
  })

  it('should release model memory while preserving the completed output', () => {
    const runtime = createRuntime(true)
    const root = createDialogueRoot(runtime)

    root.controller.prepare()
    runtime.emit({type: 'ready'})
    root.controller.generate()
    runtime.emit({text: '보존할 결과예요.', type: 'complete'})
    root.controller.release()

    expect(root.controller.state()).toEqual({status: 'idle'})
    expect(root.controller.output()).toBe('보존할 결과예요.')
    expect(runtime.client.dispose).toHaveBeenCalledTimes(1)

    root.controller.prepare()
    expect(runtime.createClient).toHaveBeenCalledTimes(2)
    root.dispose()
    expect(runtime.client.dispose).toHaveBeenCalledTimes(2)
  })
})
