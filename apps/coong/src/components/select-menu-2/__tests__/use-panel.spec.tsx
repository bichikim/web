/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {HSelectPanel} from '../HSelectPanel'
import {HSelectRoot} from '../HSelectRoot'
import {useSelectMenu2Context} from '../context'
import {usePanel} from '../use-panel'

const autoUpdateMock = vi.fn()

vi.mock('@floating-ui/dom', () => ({
  autoUpdate: (...args: unknown[]) => autoUpdateMock(...args),
}))

interface OpenTriggerProps {
  trigger: HTMLButtonElement
}

const OpenTrigger = (props: OpenTriggerProps) => {
  const {onOpen} = useSelectMenu2Context()

  return (
    <button type="button" onClick={() => onOpen(props.trigger)}>
      Open
    </button>
  )
}

describe('usePanel', () => {
  it('should register panel and expose positioning from context', () => {
    autoUpdateMock.mockImplementation((_anchor, _panel, update) => {
      update()

      return vi.fn()
    })

    const trigger = document.createElement('button')

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    render(() => (
      <HSelectRoot>
        <OpenTrigger trigger={trigger} />
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

    expect(autoUpdateMock).toHaveBeenCalledTimes(1)
    expect(panel.style.getPropertyValue('--top')).toBe('48px')
    expect(panel.showPopover).toHaveBeenCalledTimes(1)
  })

  it('should unregister panel on unmount', () => {
    const cleanup = vi.fn()
    autoUpdateMock.mockReturnValue(cleanup)

    const trigger = document.createElement('button')

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    const view = render(() => (
      <HSelectRoot>
        <OpenTrigger trigger={trigger} />
        <HSelectPanel>
          <div>Menu item</div>
        </HSelectPanel>
      </HSelectRoot>
    ))

    fireEvent.click(screen.getByRole('button', {name: 'Open'}))
    view.unmount()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('should throw when used outside HSelectRoot', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // void
    })

    expect(() => {
      render(() => {
        usePanel({panelElement: () => undefined})

        return null
      })
    }).toThrow('useSelectMenu2Context must be used within HSelectRoot')

    consoleError.mockRestore()
  })
})
