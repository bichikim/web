/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {VoiceHeader} from '../Header'

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
  render(() => <VoiceHeader />)
  expect(screen.getByText('캐릭터의 목소리를 만들어 보세요')).toBeDefined()
})
