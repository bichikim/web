/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {TextMoodInsufficientResult} from '../InsufficientResult'

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
it('should render its explanatory copy', () => {
  render(() => <TextMoodInsufficientResult />)
  expect(screen.getByText('조금 더 구체적으로 적어 주세요')).toBeDefined()
})
