/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {SpeechModelDefinition} from '../../features/speech-to-text'
import {describe, expect, it, vi} from 'vitest'
import SpeechToTextLab, {SpeechToTextLab as NamedSpeechToTextLab} from '../SpeechToTextLab'

vi.mock('../speech-to-text-lab/ModelWorkspace', () => ({
  SpeechModelWorkspace: (props: {readonly model: SpeechModelDefinition}) => (
    <section data-model-id={props.model.id}>
      <p>선택 워크스페이스 · {props.model.label}</p>
      <p>녹음 · 준비 · 오류 · 결과 상태는 선택한 모델에서 이어집니다.</p>
    </section>
  ),
}))

describe('SpeechToTextLab', () => {
  it('should show every model and start with the recommended recording workspace', () => {
    const {container} = render(() => <SpeechToTextLab />)

    expect(screen.getByRole('heading', {name: '한국어 받아쓰기 모델 비교'})).toBeInTheDocument()
    expect(screen.getByText('추천')).toBeInTheDocument()
    expect(screen.getByRole('radio', {name: /Moonshine Tiny KO/})).toBeChecked()
    expect(screen.getByRole('radio', {name: /Whisper Tiny/})).not.toBeChecked()
    expect(screen.getByRole('radio', {name: /Whisper Base/})).not.toBeChecked()
    expect(screen.getByText('선택 워크스페이스 · Moonshine Tiny KO')).toBeInTheDocument()
    expect(container.querySelector('[data-model-id]')).toHaveAttribute(
      'data-model-id',
      'moonshine-tiny-ko',
    )
  })

  it('should switch the active workspace when a user selects another model', () => {
    const {container} = render(() => <NamedSpeechToTextLab />)
    const baseModel = screen.getByRole('radio', {name: /Whisper Base/})

    fireEvent.click(baseModel)

    expect(baseModel).toBeChecked()
    expect(screen.getByRole('radio', {name: /Moonshine Tiny KO/})).not.toBeChecked()
    expect(screen.getByText('선택 워크스페이스 · Whisper Base')).toBeInTheDocument()
    expect(container.querySelector('[data-model-id]')).toHaveAttribute(
      'data-model-id',
      'whisper-base',
    )
  })
})
