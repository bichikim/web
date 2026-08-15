/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PIconButton} from '../PIconButton'

it('should expose the icon button class contract', () => {
  const result = render(() => (
    <PIconButton
      accessibleLabel="시간대 낮"
      feedback="낮"
      icon="i-tabler-sun"
      onPress={() => undefined}
    />
  ))

  expect(
    result.getByRole('button', {name: '시간대 낮'}).classList.contains('pomo-icon-button'),
  ).toBe(true)
})
