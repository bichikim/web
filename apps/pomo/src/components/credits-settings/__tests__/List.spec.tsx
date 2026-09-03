/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {CreditList} from '../List'

it('should present each license as a distinct content surface', () => {
  render(() => (
    <CreditList
      entries={[
        {
          condition: 'Keep the license notice.',
          license: 'MIT',
          links: [{label: 'License', url: 'https://example.com/license'}],
          name: 'Example library',
          use: 'Example interface',
        },
      ]}
    />
  ))

  expect(screen.getByRole('heading', {name: 'Example library'}).closest('li')).toHaveClass(
    'border-content-border',
    'bg-content-surface',
  )
})
