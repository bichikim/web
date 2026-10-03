/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {
  type DialogueClient,
  type DialogueWriterController,
  type DialogueWriterRuntime,
  useDialogueWriter,
} from '../../../features/dialogue-writer'
import type {DialogueWorkerResponse} from '../../../features/dialogue-writer/messages'
import {createTextGenerationProgress} from '../../../features/text-generation/progress'
import type {TextModelDefinition} from '../../../features/text-generation'
import {ModelPanel} from '../ModelPanel'

interface TestRuntime extends DialogueWriterRuntime {
  readonly emit: (response: DialogueWorkerResponse) => void
}

const model: TextModelDefinition = {
  description: '한국어 답변 품질을 비교합니다.',
  downloadSize: '약 1GB',
  id: 'qwen-0.8b',
  label: 'Qwen',
}

const createRuntime = (): TestRuntime => {
  let onResponse: ((response: DialogueWorkerResponse) => void) | null = null
  const client: DialogueClient = {
    dispose: vi.fn(),
    generate: vi.fn(),
    prepare: vi.fn(),
  }

  return {
    createClient: (options) => {
      onResponse = options.onResponse
      return client
    },
    emit: (response) => {
      if (onResponse === null) {
        throw new Error('대화문 client가 생성되지 않았습니다.')
      }

      onResponse(response)
    },
    supportsWebGpu: () => true,
  }
}

const mountModelPanel = (runtime: DialogueWriterRuntime) => {
  const [writer, setWriter] = createSignal<DialogueWriterController | null>(null)

  render(() => {
    const currentWriter = useDialogueWriter({
      initialRequest: '질문',
      modelId: model.id,
      runtime,
    })
    setWriter(currentWriter)

    return <ModelPanel disabled={false} model={model} onActivate={vi.fn()} writer={currentWriter} />
  })

  const mountedWriter = writer()

  if (mountedWriter === null) {
    throw new Error('대화문 writer가 마운트되지 않았습니다.')
  }

  return mountedWriter
}

afterEach(cleanup)

describe('ModelPanel progress', () => {
  it('should preserve telemetry while bounding visible progress to 100%', () => {
    const runtime = createRuntime()
    const writer = mountModelPanel(runtime)
    const rawProgress = createTextGenerationProgress({
      files: {'weights.bin': {loaded: 120, total: 100}},
      loadedBytes: 120,
      totalBytes: 100,
    })

    writer.prepare()
    runtime.emit({...rawProgress, type: 'loading'})

    expect(writer.state()).toMatchObject({percentage: 120, status: 'loading'})
    expect(writer.progress()).toBe(120)
    expect(writer.statusMessage()).toContain('100%')
    const progress = screen.getByRole('progressbar', {name: '모델 준비 100%'})
    const fill = progress.firstElementChild as HTMLElement
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.queryByText(/120%/u)).not.toBeInTheDocument()
    expect(fill.style.getPropertyValue('--pomo-progress-width')).toBe('100%')
    expect(writer.state().status).toBe('loading')
    expect(screen.getByRole('button', {name: '모델 준비 중…'})).toBeDisabled()

    const exactProgress = createTextGenerationProgress({
      files: {'weights.bin': {loaded: 100, total: 100}},
      loadedBytes: 100,
      totalBytes: 100,
    })
    runtime.emit({...exactProgress, type: 'loading'})

    expect(writer.state()).toMatchObject({percentage: 100, status: 'loading'})
    expect(screen.getByRole('progressbar', {name: '모델 준비 100%'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '모델 준비 중…'})).toBeDisabled()
  })

  it('should preserve negative telemetry while bounding visible progress to 0%', () => {
    const runtime = createRuntime()
    const writer = mountModelPanel(runtime)

    writer.prepare()
    runtime.emit({files: [], loadedBytes: -5, percentage: -5, totalBytes: 100, type: 'loading'})

    expect(writer.state()).toMatchObject({percentage: -5, status: 'loading'})
    expect(writer.statusMessage()).toContain('0%')
    const progress = screen.getByRole('progressbar', {name: '모델 준비 0%'})
    expect(progress).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(progress.firstElementChild).toHaveStyle('--pomo-progress-width: 0%')
  })

  it('should clear loading progress on release and after the worker becomes ready', () => {
    const runtime = createRuntime()
    const writer = mountModelPanel(runtime)
    const rawProgress = createTextGenerationProgress({
      files: {'weights.bin': {loaded: 120, total: 100}},
      loadedBytes: 120,
      totalBytes: 100,
    })

    writer.prepare()
    runtime.emit({...rawProgress, type: 'loading'})
    expect(screen.getByRole('progressbar', {name: '모델 준비 100%'})).toBeInTheDocument()

    writer.release()

    expect(writer.state()).toEqual({status: 'idle'})
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/완성했어요|Done\./u)).not.toBeInTheDocument()

    writer.prepare()
    runtime.emit({...rawProgress, type: 'loading'})
    runtime.emit({type: 'ready'})

    expect(writer.state()).toEqual({status: 'ready'})
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('약 1GB')).toBeInTheDocument()
  })

  it('should keep invalid loading progress indeterminate and recover reactively', () => {
    const runtime = createRuntime()
    const writer = mountModelPanel(runtime)

    writer.prepare()
    runtime.emit({
      files: [],
      loadedBytes: 0,
      percentage: Number.NaN,
      totalBytes: 0,
      type: 'loading',
    })

    const progress = screen.getByRole('progressbar', {name: '모델 준비 진행률 확인 중'})
    const fill = progress.firstElementChild as HTMLElement
    expect(progress).not.toHaveAttribute('aria-valuenow')
    expect(screen.getByText('진행률 확인 중')).toBeInTheDocument()
    expect(screen.queryByText(/NaN|Infinity/u)).not.toBeInTheDocument()
    expect(fill).toHaveAttribute('data-indeterminate')
    expect(fill.style.getPropertyValue('--pomo-progress-width')).toBe('')
    expect(writer.state().status).toBe('loading')

    runtime.emit({
      files: [],
      loadedBytes: 0,
      percentage: Number.POSITIVE_INFINITY,
      totalBytes: 0,
      type: 'loading',
    })

    expect(progress).not.toHaveAttribute('aria-valuenow')
    expect(screen.getByText('진행률 확인 중')).toBeInTheDocument()

    runtime.emit({
      files: [],
      loadedBytes: 0,
      percentage: Number.NEGATIVE_INFINITY,
      totalBytes: 0,
      type: 'loading',
    })

    expect(progress).not.toHaveAttribute('aria-valuenow')
    expect(screen.getByText('진행률 확인 중')).toBeInTheDocument()

    runtime.emit({files: [], loadedBytes: 0, percentage: 42, totalBytes: 100, type: 'loading'})

    expect(screen.getByRole('progressbar', {name: '모델 준비 42%'})).toHaveAttribute(
      'aria-valuenow',
      '42',
    )
    expect(screen.getByText('42%')).toBeInTheDocument()
    expect(fill).not.toHaveAttribute('data-indeterminate')
    expect(fill.style.getPropertyValue('--pomo-progress-width')).toBe('42%')
    expect(writer.state().status).toBe('loading')
  })

  it('should display a worker error only after an error response', () => {
    const runtime = createRuntime()
    const writer = mountModelPanel(runtime)

    writer.prepare()
    runtime.emit({files: [], loadedBytes: 120, percentage: 120, totalBytes: 100, type: 'loading'})

    expect(writer.state().status).toBe('loading')
    expect(screen.queryByRole('progressbar', {name: '모델 준비 100%'})).toBeInTheDocument()
    expect(screen.queryByText(/실패|could not complete/u)).not.toBeInTheDocument()

    runtime.emit({message: '다운로드 오류', restartRequired: false, type: 'error'})

    expect(writer.state()).toMatchObject({message: '다운로드 오류', status: 'error'})
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('다운로드 오류')).toBeInTheDocument()
  })
})
