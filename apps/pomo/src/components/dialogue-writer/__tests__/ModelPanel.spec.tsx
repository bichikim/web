/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {DialogueWriterController, DialogueWriterState} from '../../../features/dialogue-writer'
import type {TextModelDefinition} from '../../../features/text-generation'
import {describe, expect, it, vi} from 'vitest'
import {ModelPanel} from '../ModelPanel'

interface WriterOptions {
  readonly canCopy?: boolean
  readonly canGenerate?: boolean
  readonly canPrepare?: boolean
  readonly isModelReady?: boolean
  readonly output?: string
  readonly state: DialogueWriterState
}

const model: TextModelDefinition = {
  description: '한국어 답변 품질을 비교합니다.',
  downloadSize: '약 1GB',
  id: 'qwen-0.8b',
  label: 'Qwen',
}

const createWriter = (options: WriterOptions): DialogueWriterController => ({
  canCopy: () => options.canCopy ?? false,
  canGenerate: () => options.canGenerate ?? false,
  canPrepare: () => options.canPrepare ?? false,
  copyOutput: vi.fn().mockResolvedValue(undefined),
  generate: vi.fn(),
  generateWithPreparation: vi.fn(),
  isBusy: () => false,
  isModelReady: () => options.isModelReady ?? false,
  output: () => options.output ?? '',
  prepare: vi.fn(),
  progress: () => 42,
  release: vi.fn(),
  request: () => '질문',
  setRequest: vi.fn(),
  state: () => options.state,
  statusMessage: () => '현재 상태 설명',
})

describe('ModelPanel', () => {
  it('should describe every writer status with its activation label', () => {
    render(() => (
      <>
        <ModelPanel
          model={model}
          onActivate={vi.fn()}
          writer={createWriter({
            state: {files: [], loadedBytes: 0, percentage: 0, status: 'loading', totalBytes: 1},
          })}
          disabled
        />
        <ModelPanel
          model={model}
          onActivate={vi.fn()}
          writer={createWriter({state: {status: 'generating'}})}
          disabled
        />
        <ModelPanel
          model={model}
          onActivate={vi.fn()}
          writer={createWriter({isModelReady: true, state: {status: 'complete'}})}
          disabled
        />
        <ModelPanel
          model={model}
          onActivate={vi.fn()}
          writer={createWriter({isModelReady: true, state: {status: 'ready'}})}
          disabled
        />
        <ModelPanel
          model={model}
          onActivate={vi.fn()}
          writer={createWriter({
            isModelReady: true,
            state: {message: '재시도', modelReady: true, status: 'error'},
          })}
          disabled
        />
        <ModelPanel
          model={model}
          onActivate={vi.fn()}
          writer={createWriter({state: {message: '준비 실패', modelReady: false, status: 'error'}})}
          disabled
        />
        <ModelPanel
          model={model}
          onActivate={vi.fn()}
          writer={createWriter({state: {status: 'idle'}})}
          disabled
        />
        <ModelPanel
          model={model}
          onActivate={vi.fn()}
          writer={createWriter({state: {status: 'unsupported'}})}
          disabled
        />
      </>
    ))

    expect(screen.getByRole('button', {name: '모델 준비 중…'})).toBeDisabled()
    expect(screen.getByRole('button', {name: '답변 만드는 중…'})).toBeDisabled()
    expect(screen.getAllByRole('button', {name: '이 모델로 답변 만들기'})).toHaveLength(3)
    expect(screen.getAllByRole('button', {name: 'Qwen 준비하기'})).toHaveLength(3)
    expect(screen.getAllByText('한국어 답변 품질을 비교합니다.')).toHaveLength(8)
  })

  it('should activate only panels whose model can generate or prepare', () => {
    const generateActivation = vi.fn()
    const prepareActivation = vi.fn()
    const blockedGenerationActivation = vi.fn()
    const blockedPreparationActivation = vi.fn()
    const disabledActivation = vi.fn()

    render(() => (
      <>
        <ModelPanel
          model={model}
          onActivate={generateActivation}
          writer={createWriter({
            canGenerate: true,
            isModelReady: true,
            output: '답변',
            state: {status: 'ready'},
          })}
          disabled={false}
        />
        <ModelPanel
          model={model}
          onActivate={prepareActivation}
          writer={createWriter({canPrepare: true, state: {status: 'idle'}})}
          disabled={false}
        />
        <ModelPanel
          model={model}
          onActivate={blockedGenerationActivation}
          writer={createWriter({isModelReady: true, state: {status: 'ready'}})}
          disabled={false}
        />
        <ModelPanel
          model={model}
          onActivate={blockedPreparationActivation}
          writer={createWriter({state: {status: 'idle'}})}
          disabled={false}
        />
        <ModelPanel
          model={model}
          onActivate={disabledActivation}
          writer={createWriter({canGenerate: true, isModelReady: true, state: {status: 'ready'}})}
          disabled
        />
      </>
    ))

    const generateButton = screen.getAllByRole('button', {name: '이 모델로 답변 만들기'})[0]
    const prepareButton = screen.getAllByRole('button', {name: 'Qwen 준비하기'})[0]

    expect(generateButton).toBeEnabled()
    expect(prepareButton).toBeEnabled()
    expect(screen.getAllByRole('button', {name: '이 모델로 답변 만들기'})[1]).toBeDisabled()
    expect(screen.getAllByRole('button', {name: 'Qwen 준비하기'})[1]).toBeDisabled()
    expect(screen.getAllByRole('button', {name: '이 모델로 답변 만들기'})[2]).toBeDisabled()

    fireEvent.click(generateButton)
    fireEvent.click(prepareButton)

    expect(generateActivation).toHaveBeenCalledOnce()
    expect(prepareActivation).toHaveBeenCalledOnce()
    expect(blockedGenerationActivation).not.toHaveBeenCalled()
    expect(blockedPreparationActivation).not.toHaveBeenCalled()
    expect(disabledActivation).not.toHaveBeenCalled()
  })

  it('should pass its copy callback through the rendered output and tolerate an unknown runtime status', () => {
    const copyWriter = createWriter({
      canCopy: true,
      output: '복사할 답변',
      state: {status: 'complete'},
    })
    const invalidStatusWriter = createWriter({
      state: {status: 'external-state'} as unknown as DialogueWriterState,
    })

    render(() => (
      <>
        <ModelPanel disabled model={model} onActivate={vi.fn()} writer={copyWriter} />
        <ModelPanel disabled model={model} onActivate={vi.fn()} writer={invalidStatusWriter} />
      </>
    ))

    fireEvent.click(screen.getAllByRole('button', {name: '복사하기'})[0])

    expect(vi.mocked(copyWriter.copyOutput)).toHaveBeenCalledOnce()
    expect(screen.getAllByRole('button', {name: ''})).toHaveLength(1)
  })
})
