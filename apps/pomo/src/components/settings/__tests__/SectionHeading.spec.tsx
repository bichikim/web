/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PSettingsSectionHeading} from '../SectionHeading'

it('should render a settings section heading without optional content', () => {
  render(() => <PSettingsSectionHeading divider="none" title="학습 항목" />)

  expect(screen.getByRole('heading', {name: '학습 항목'}).parentElement?.className).toContain(
    'pt-0',
  )
  expect(screen.queryByText(/개$/u)).toBeNull()
})
