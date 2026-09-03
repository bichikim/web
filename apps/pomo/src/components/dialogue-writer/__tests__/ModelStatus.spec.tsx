/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {TextModelDefinition} from '../../../features/text-generation'
import {describe, expect, it} from 'vitest'
import {ModelStatus} from '../ModelStatus'

const model: TextModelDefinition = {
  description: '한국어 답변 품질을 비교합니다.',
  downloadSize: '약 1GB',
  id: 'qwen-0.8b',
  label: 'Qwen',
}

describe('ModelStatus', () => {
  it('should show loading progress and its active status presentation', () => {
    const {container} = render(() => (
      <ModelStatus
        model={model}
        percentage={42}
        status="loading"
        statusMessage="모델을 내려받는 중이에요."
      />
    ))

    expect(screen.getByText('Qwen · WebGPU')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
    expect(screen.getByText('모델을 내려받는 중이에요.')).toHaveClass('text-#9f93a7')
    const progress = screen.getByRole('progressbar', {name: '모델 준비 42%'})
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '42')
    expect(
      (progress.firstElementChild as HTMLElement).style.getPropertyValue('--pomo-progress-width'),
    ).toBe('42%')
    expect((progress.firstElementChild as HTMLElement).style.width).toBe('')
    expect(progress.firstElementChild).toHaveClass('[width:var(--pomo-progress-width)]')
    expect(container.querySelector('.bg-\\#f2a7b8')).not.toBeNull()
  })

  it('should show ready and complete models with their download size', () => {
    const {container} = render(() => (
      <>
        <ModelStatus model={model} percentage={100} status="ready" statusMessage="준비됐어요." />
        <ModelStatus model={model} percentage={100} status="complete" statusMessage="완료했어요." />
      </>
    ))

    expect(screen.getAllByText('약 1GB')).toHaveLength(2)
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('준비됐어요.')).toHaveClass('text-#9f93a7')
    expect(screen.getByText('완료했어요.')).toHaveClass('text-#9f93a7')
    expect(container.querySelectorAll('.bg-\\#9ed6bb')).toHaveLength(2)
  })

  it('should show error and unsupported models with attention styling', () => {
    const {container} = render(() => (
      <>
        <ModelStatus
          model={model}
          percentage={0}
          status="error"
          statusMessage="다운로드에 실패했어요."
        />
        <ModelStatus
          model={model}
          percentage={0}
          status="unsupported"
          statusMessage="이 브라우저에서는 지원하지 않아요."
        />
        <ModelStatus
          model={model}
          percentage={0}
          status="generating"
          statusMessage="답변 생성 중이에요."
        />
        <ModelStatus model={model} percentage={0} status="idle" statusMessage="시작을 기다려요." />
      </>
    ))

    expect(screen.getByText('다운로드에 실패했어요.')).toHaveClass('text-#ff9aa8')
    expect(screen.getByText('이 브라우저에서는 지원하지 않아요.')).toHaveClass('text-#ff9aa8')
    expect(screen.getByText('답변 생성 중이에요.')).toHaveClass('text-#9f93a7')
    expect(screen.getByText('시작을 기다려요.')).toHaveClass('text-#9f93a7')
    expect(container.querySelectorAll('.bg-\\#ff9aa8')).toHaveLength(2)
  })
})
