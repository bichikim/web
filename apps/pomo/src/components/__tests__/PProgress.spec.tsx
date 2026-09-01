/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'

import {PProgress} from '../PProgress'

describe('PProgress', () => {
  it('should expose a labeled determinate Kobalte progressbar', () => {
    render(() => <PProgress label="모델 다운로드 진행률" value={42} />)

    expect(screen.getByRole('progressbar', {name: '모델 다운로드 진행률'})).toHaveAttribute(
      'aria-valuenow',
      '42',
    )
  })

  it('should omit the current value while progress is indeterminate', () => {
    render(() => <PProgress label="준비 진행률" />)

    expect(screen.getByRole('progressbar', {name: '준비 진행률'})).not.toHaveAttribute(
      'aria-valuenow',
    )
  })
})
