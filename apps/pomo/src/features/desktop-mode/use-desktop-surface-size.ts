import {type Accessor, createEffect, onCleanup} from 'solid-js'

interface DesktopSurfaceSize {
  readonly height: number
  readonly width: number
}

interface UseDesktopSurfaceSizeProps {
  readonly element: Accessor<HTMLElement | null>
}

const getElementSize = (element: HTMLElement): DesktopSurfaceSize => {
  const bounds = element.getBoundingClientRect()

  return {
    height: Math.ceil(bounds.height),
    width: Math.ceil(bounds.width),
  }
}

const resizeNativeWindow = async (size: DesktopSurfaceSize): Promise<void> => {
  const [{LogicalSize}, {getCurrentWindow}] = await Promise.all([
    import('@tauri-apps/api/dpi'),
    import('@tauri-apps/api/window'),
  ])

  await getCurrentWindow().setSize(new LogicalSize(size.width, size.height))
}

/** Keeps a desktop surface's native window aligned with its rendered frame. */
export const useDesktopSurfaceSize = (props: UseDesktopSurfaceSizeProps): void => {
  createEffect(() => {
    if (import.meta.env.VITE_POMO_IS_DESKTOP !== 'true') {
      return
    }

    const element = props.element()
    if (element === null) {
      return
    }

    let animationFrame: number | null = null
    let observer: ResizeObserver | null = null
    let lastRequestedSize: DesktopSurfaceSize | null = null
    const synchronizeSize = () => {
      const nextSize = getElementSize(element)
      if (nextSize.width <= 0 || nextSize.height <= 0) {
        return
      }
      if (
        lastRequestedSize?.height === nextSize.height &&
        lastRequestedSize.width === nextSize.width
      ) {
        return
      }

      lastRequestedSize = nextSize
      resizeNativeWindow(nextSize).catch((error: unknown) => {
        console.error('Failed to synchronize the desktop surface size.', error)
      })
    }

    const scheduleSynchronization = () => {
      if (animationFrame !== null) {
        return
      }

      animationFrame = requestAnimationFrame(() => {
        animationFrame = null
        synchronizeSize()
      })
    }

    observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleSynchronization)
    observer?.observe(element)
    scheduleSynchronization()
    if (observer === null) {
      synchronizeSize()
    }

    onCleanup(() => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
      }
      observer?.disconnect()
    })
  })
}
