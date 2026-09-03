/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {PButton} from '../../PButton'
import {PServicePolicyLinks} from '../../PServicePolicyLinks'
import {PEntry} from '../Entry'

vi.mock('../../PButton', () => ({
  PButton: vi.fn((props: {children?: JSX.Element; disabled?: boolean; onPress?: () => void}) => {
    Object.values(props)
    return (
      <button disabled={props.disabled} onClick={() => props.onPress?.()} type="button">
        {props.children}
      </button>
    )
  }),
}))
vi.mock('../../PServicePolicyLinks', () => ({PServicePolicyLinks: vi.fn(() => null)}))

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

  expect(section).not.toHaveAttribute('data-exiting')
  expect(section).not.toHaveAttribute('style')
  fireEvent.click(screen.getByRole('button'))
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
