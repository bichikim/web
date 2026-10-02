/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {ModelStatus} from '../components/dialogue-writer/ModelStatus'
import {createTextGenerationProgress} from '../features/text-generation/progress'
import type {TextModelDefinition} from '../features/text-generation'

const model: TextModelDefinition = {
  description: '테스트',
  downloadSize: '약 1GB',
  id: 'qwen-0.8b',
  label: 'Qwen',
}

describe('dialogue writer model download progress display', () => {
  const oversizedProgress = createTextGenerationProgress({
    files: {'weights.bin': {loaded: 120, total: 100}},
    loadedBytes: 120,
    totalBytes: 100,
  })

  it('should cap loading progress at 100 for progressbar semantics', () => {
    expect(oversizedProgress.percentage).toBeLessThanOrEqual(100)
  })

  it('should keep aria-valuenow within aria-valuemax while loading', () => {
    render(() => (
      <ModelStatus
        model={model}
        percentage={oversizedProgress.percentage}
        status="loading"
        statusMessage="모델을 내려받는 중이에요."
      />
    ))

    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(Number(progress.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(100)
    expect(
      Number.parseInt(
        (progress.firstElementChild as HTMLElement).style
          .getPropertyValue('--pomo-progress-width')
          .replace('%', ''),
        10,
      ),
    ).toBeLessThanOrEqual(100)
  })
})
