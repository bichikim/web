/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {useDesktopBackgroundInteraction, useDesktopMode} from '../../features/desktop-mode'
import {PDesktopControls} from '../PDesktopControls'

vi.mock('@solidjs/meta', () => ({Title: (props: {readonly children?: unknown}) => props.children}))
vi.mock('../../features/desktop-mode', () => ({
  useDesktopBackgroundInteraction: vi.fn(),
  useDesktopMode: vi.fn(),
}))
vi.mock('../PMusicPlayer', () => ({PMusicPlayer: () => <p>music controls</p>}))
vi.mock('../PPomodoro', () => ({PPomodoro: () => <p>timer controls</p>}))
vi.mock('../PDesktopModeControl', () => ({
  PDesktopModeControl: (props: {readonly mode: string}) => {
    Object.values(props)
    return <p>mode: {props.mode}</p>
  },
}))
vi.mock('../PDesktopInteractionControl', () => ({
  PDesktopInteractionControl: (props: {readonly interaction: string}) => {
    Object.values(props)
    return <p>interaction: {props.interaction}</p>
  },
}))

it('should compose the transparent timer, player, and mode controls', () => {
  vi.mocked(useDesktopMode).mockReturnValue({
    error: () => null,
    isChanging: () => false,
    mode: () => 'desktop',
    onModeChange: vi.fn(),
  })
  vi.mocked(useDesktopBackgroundInteraction).mockReturnValue({
    error: () => null,
    interaction: () => 'passThrough',
    isChanging: () => false,
    onInteractionChange: vi.fn(),
  })

  render(() => <PDesktopControls />)

  expect(screen.getByRole('main')).toHaveClass('bg-transparent')
  expect(screen.getByText('timer controls')).toBeInTheDocument()
  expect(screen.getByText('music controls')).toBeInTheDocument()
  expect(screen.getByText('mode: desktop')).toBeInTheDocument()
  expect(screen.getByText('interaction: passThrough')).toBeInTheDocument()
})

it('should release timer and audio ownership outside desktop mode', () => {
  vi.mocked(useDesktopMode).mockReturnValue({
    error: () => null,
    isChanging: () => false,
    mode: () => 'normal',
    onModeChange: vi.fn(),
  })
  vi.mocked(useDesktopBackgroundInteraction).mockReturnValue({
    error: () => null,
    interaction: () => 'interactive',
    isChanging: () => false,
    onInteractionChange: vi.fn(),
  })

  render(() => <PDesktopControls />)

  expect(screen.queryByText('timer controls')).not.toBeInTheDocument()
  expect(screen.queryByText('music controls')).not.toBeInTheDocument()
})
