import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'
import {getPopoverPosition} from './get-popover-position'
interface UsePopoverSurfaceProps {
  readonly open: Accessor<boolean>
  readonly trigger: Accessor<HTMLElement | undefined>
  readonly surface: Accessor<HTMLElement | undefined>
}
export const usePopoverSurface = (props: UsePopoverSurfaceProps) => {
  const [position, setPosition] = createSignal({x: 0, y: 0})
  const [active, setActive] = createSignal(false)
  createEffect(() => {
    if (!props.open()) {
      return
    }
    const trigger = props.trigger()
    const surface = props.surface()
    if (
      trigger === undefined ||
      surface === undefined ||
      !surface.isConnected ||
      typeof surface.showPopover !== 'function'
    ) {
      return
    }
    const document = surface.ownerDocument
    const window = document.defaultView
    if (window === null) {
      return
    }
    setActive(true)
    surface.showPopover()
    const update = () => {
      const bounds = surface.getBoundingClientRect()
      setPosition(
        getPopoverPosition({
          anchor: trigger.getBoundingClientRect(),
          height: bounds.height,
          viewport: {
            height: document.documentElement.clientHeight,
            width: document.documentElement.clientWidth,
          },
          width: bounds.width,
        }),
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(surface)
    observer.observe(trigger)
    window.addEventListener('resize', update)
    document.addEventListener('scroll', update, true)
    onCleanup(() => {
      setActive(false)
      observer.disconnect()
      window.removeEventListener('resize', update)
      document.removeEventListener('scroll', update, true)
      if (surface.isConnected) {
        surface.hidePopover()
      }
    })
  })
  return {active, position}
}
