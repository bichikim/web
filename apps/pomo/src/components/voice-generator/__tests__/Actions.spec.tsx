/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {VoiceActions} from '../Actions'

describe('VoiceActions', () => {
  it('should enable preparation and call its callback before a model is ready', () => {
    const onPrepare = vi.fn()
    const onGenerate = vi.fn()

    render(() => (
      <VoiceActions
        canGenerate={false}
        canPrepare
        errorMessage={null}
        isModelReady={false}
        onGenerate={onGenerate}
        onPrepare={onPrepare}
        progress={0}
        status="unprepared"
      />
    ))

    const prepareButton = screen.getByRole('button', {name: 'Supertonic 준비하기'})
    expect(prepareButton).toBeEnabled()
    fireEvent.click(prepareButton)
    expect(onPrepare).toHaveBeenCalledOnce()
    expect(onGenerate).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('should show preparation, generation, ready, and disabled action states', () => {
    const onGenerate = vi.fn()
    const onPrepare = vi.fn()
    render(() => (
      <>
        <VoiceActions
          canGenerate={false}
          canPrepare={false}
          errorMessage={null}
          isModelReady={false}
          onGenerate={onGenerate}
          onPrepare={onPrepare}
          progress={63}
          status="preparing"
        />
        <VoiceActions
          canGenerate={false}
          canPrepare={false}
          errorMessage={null}
          isModelReady
          onGenerate={onGenerate}
          onPrepare={onPrepare}
          progress={100}
          status="generating"
        />
        <VoiceActions
          canGenerate
          canPrepare={false}
          errorMessage={null}
          isModelReady
          onGenerate={onGenerate}
          onPrepare={onPrepare}
          progress={100}
          status="ready"
        />
        <VoiceActions
          canGenerate={false}
          canPrepare={false}
          errorMessage="모델을 준비하지 못했어요."
          isModelReady={false}
          onGenerate={onGenerate}
          onPrepare={onPrepare}
          progress={0}
          status="error"
        />
      </>
    ))

    expect(screen.getByRole('button', {name: '모델 준비 중… 63%'})).toBeDisabled()
    expect(screen.getByRole('button', {name: '음성 만드는 중…'})).toBeDisabled()
    const generateButton = screen.getByRole('button', {name: '음성 만들기'})
    expect(generateButton).toBeEnabled()
    expect(screen.getByRole('button', {name: 'Supertonic 준비하기'})).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('모델을 준비하지 못했어요.')

    fireEvent.click(generateButton)
    expect(onGenerate).toHaveBeenCalledOnce()
    expect(onPrepare).not.toHaveBeenCalled()
  })

  it('should show completed generation as an enabled generate action', () => {
    const onGenerate = vi.fn()

    render(() => (
      <VoiceActions
        canGenerate
        canPrepare={false}
        errorMessage={null}
        isModelReady
        onGenerate={onGenerate}
        onPrepare={vi.fn()}
        progress={100}
        status="complete"
      />
    ))

    fireEvent.click(screen.getByRole('button', {name: '음성 만들기'}))
    expect(onGenerate).toHaveBeenCalledOnce()
  })
})
