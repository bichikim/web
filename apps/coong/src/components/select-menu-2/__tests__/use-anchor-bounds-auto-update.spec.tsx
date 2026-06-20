/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {render} from '@solidjs/testing-library'
import {getBounds} from '../get-bounds'
import {useAnchorBoundsAutoUpdate} from '../use-anchor-bounds-auto-update'

const autoUpdateMock = vi.fn()

vi.mock('@floating-ui/dom', () => ({
  autoUpdate: (...args: unknown[]) => autoUpdateMock(...args),
}))

const AnchorBoundsAutoUpdateProbe = (props: {
  anchor: HTMLElement
  open: boolean
  panel: HTMLDivElement
  setAnchorBounds: (bounds: ReturnType<typeof getBounds> | undefined) => void
  setPanelPosition: (position: {left: number; top: number}) => void
}) => {
  useAnchorBoundsAutoUpdate({
    anchorElement: () => props.anchor,
    open: () => props.open,
    panelElement: () => props.panel,
    setAnchorBounds: props.setAnchorBounds,
    setPanelPosition: props.setPanelPosition,
  })

  return null
}

describe('useAnchorBoundsAutoUpdate', () => {
  it('should subscribe to autoUpdate when open with anchor and panel', () => {
    autoUpdateMock.mockImplementation((_anchor, _panel, update) => {
      update()

      return vi.fn()
    })

    const anchor = document.createElement('button')
    const panel = document.createElement('div')
    const setAnchorBounds = vi.fn()
    const setPanelPosition = vi.fn()

    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
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

    render(() => (
      <AnchorBoundsAutoUpdateProbe
        anchor={anchor}
        open
        panel={panel}
        setAnchorBounds={setAnchorBounds}
        setPanelPosition={setPanelPosition}
      />
    ))

    expect(autoUpdateMock).toHaveBeenCalledTimes(1)
    expect(autoUpdateMock).toHaveBeenCalledWith(anchor, panel, expect.any(Function), undefined)
    expect(setAnchorBounds).toHaveBeenCalledWith(getBounds(anchor))
    expect(setPanelPosition).toHaveBeenCalledWith({left: 100, top: 48})
  })

  it('should call cleanup when unmounted', () => {
    const cleanup = vi.fn()
    autoUpdateMock.mockReturnValue(cleanup)

    const anchor = document.createElement('button')
    const panel = document.createElement('div')

    const view = render(() => (
      <AnchorBoundsAutoUpdateProbe
        anchor={anchor}
        open
        panel={panel}
        setAnchorBounds={vi.fn()}
        setPanelPosition={vi.fn()}
      />
    ))

    view.unmount()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('should not subscribe when closed', () => {
    autoUpdateMock.mockClear()

    render(() => (
      <AnchorBoundsAutoUpdateProbe
        anchor={document.createElement('button')}
        open={false}
        panel={document.createElement('div')}
        setAnchorBounds={vi.fn()}
        setPanelPosition={vi.fn()}
      />
    ))

    expect(autoUpdateMock).not.toHaveBeenCalled()
  })
})
