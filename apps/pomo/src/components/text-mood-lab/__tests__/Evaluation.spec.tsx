/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {TextMoodEvaluation} from '../Evaluation'

vi.mock('@solidjs/router', () => ({
  A: (props: {children?: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('../../dialogue-settings/Panel', () => ({
  PDialogueSettingsPanel: (props: {onRequestClose?: () => void}) => (
    <button onClick={() => props.onRequestClose?.()} type="button">
      dialogue settings
    </button>
  ),
}))

afterEach(() => {
  vi.clearAllMocks()
})
it('should render text mood evaluation metrics', () => {
  render(() => <TextMoodEvaluation />)

  expect(screen.getByRole('heading', {name: '현재 파일럿 성능'})).toBeDefined()
  expect(screen.getByText('Macro F1')).toBeDefined()
  expect(screen.getByText(/mean pooling/)).toBeDefined()
})
