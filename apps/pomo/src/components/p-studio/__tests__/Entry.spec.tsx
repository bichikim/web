/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {PButton} from '../../p-button/PButton'
import {PServicePolicyLinks} from '../../p-service-policy-links/PServicePolicyLinks'
import {PEntry} from '../Entry'

vi.mock('../../p-button/PButton', () => ({
  PButton: vi.fn((props: {children?: JSX.Element; disabled?: boolean; onPress?: () => void}) => {
    Object.values(props)
    return (
      <button disabled={props.disabled} onClick={() => props.onPress?.()} type="button">
        {props.children}
      </button>
    )
  }),
}))
vi.mock('../../p-service-policy-links/PServicePolicyLinks', () => ({
  PServicePolicyLinks: vi.fn(() => null),
}))
vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children: JSX.Element; readonly href: string}) => (
    <a href={props.href}>{props.children}</a>
  ),
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should enter and finish its own exit animation', () => {
  const onEnter = vi.fn()
  const onExitComplete = vi.fn()
  const result = render(() => (
    <PEntry isExiting={false} onEnter={onEnter} onExitComplete={onExitComplete} />
  ))
  const section = screen.getByRole('region')

  expect(PButton).toHaveBeenCalledWith(expect.objectContaining({leadingOverflow: true, pill: true}))
  expect(section).not.toHaveAttribute('data-exiting')
  expect(section).not.toHaveAttribute('style')
  expect(screen.getByText(/Pomo와 함께 포모도로 타이머/u)).toBeInTheDocument()
  expect(screen.getByRole('link', {name: '새로운 소식'})).toHaveAttribute('href', '/whats-new')
  fireEvent.click(screen.getByRole('button', {name: '시작하기'}))
  expect(onEnter).toHaveBeenCalledOnce()
  fireEvent.animationEnd(section)
  expect(onExitComplete).toHaveBeenCalledOnce()
  expect(PServicePolicyLinks).toHaveBeenCalledWith(expect.objectContaining({tone: 'overlay'}))
})

it('should ignore child animations and disable entry while exiting', () => {
  const onExitComplete = vi.fn()
  const result = render(() => (
    <PEntry isExiting onEnter={vi.fn()} onExitComplete={onExitComplete} />
  ))

  expect(screen.getByRole('region')).toHaveAttribute('data-exiting', '')
  expect(screen.getByRole('button')).toBeDisabled()
  fireEvent.animationEnd(result.container.querySelector('div')!)
  expect(onExitComplete).not.toHaveBeenCalled()
  expect(PButton).toHaveBeenCalledWith(expect.objectContaining({disabled: true}))
})
