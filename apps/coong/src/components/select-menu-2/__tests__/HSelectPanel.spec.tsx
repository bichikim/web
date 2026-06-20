/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {useSelectMenu2Context} from '../context'
import {HSelectPanel} from '../HSelectPanel'
import {HSelectRoot} from '../HSelectRoot'

const autoUpdateMock = vi.fn()

vi.mock('@floating-ui/dom', () => ({
  autoUpdate: (...args: unknown[]) => autoUpdateMock(...args),
}))

interface ContextTriggerProps {
  trigger: HTMLButtonElement
}

const ContextTrigger = (props: ContextTriggerProps) => {
  const {onOpen} = useSelectMenu2Context()

  return (
    <button type="button" onClick={() => onOpen(props.trigger)}>
      Open
    </button>
  )
}

describe('HSelectPanel with autoUpdate', () => {
  it('should reposition anchorBounds when autoUpdate fires', () => {
    let updateCallback: (() => void) | undefined

    autoUpdateMock.mockImplementation((_anchor, _panel, update) => {
      updateCallback = update
      update()

      return vi.fn()
    })

    const trigger = document.createElement('button')
    const initialRect = {
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    }
    const scrolledRect = {
      bottom: 20,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: -12,
      width: 224,
      x: 100,
      y: -12,
    }

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(initialRect)

    render(() => (
      <HSelectRoot>
        <ContextTrigger trigger={trigger} />
        <HSelectPanel class=":uno: fixed w-56">
          <div>Menu item</div>
        </HSelectPanel>
      </HSelectRoot>
    ))

    const panel = screen.getByRole('menu')
    panel.showPopover = vi.fn()
    panel.hidePopover = vi.fn()
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 224,
      toJSON: () => ({}),
      top: 0,
      width: 224,
      x: 0,
      y: 0,
    })

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    })

    fireEvent.click(screen.getByRole('button', {name: 'Open'}))

    expect(panel.style.getPropertyValue('--top')).toBe('48px')

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(scrolledRect)
    updateCallback?.()

    expect(panel.style.getPropertyValue('--top')).toBe('28px')
  })
})
