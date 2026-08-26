/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {PSelect} from '../../PSelect'

it('should render a hidden label through the actual Kobalte Select boundary', () => {
  render(() => (
    <>
      <PSelect
        hideLabel
        label="실제 레이블"
        onChange={vi.fn()}
        options={[{label: '첫 번째', value: 'first'}]}
        value="first"
      />
      <PSelect
        label="표시 레이블"
        onChange={vi.fn()}
        options={[{label: '두 번째', value: 'second'}]}
        value="second"
      />
    </>
  ))

  expect(screen.getByText('실제 레이블')).toHaveClass('sr-only')
  expect(screen.getByText('표시 레이블')).not.toHaveClass('sr-only')
})
