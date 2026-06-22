import {autoUpdate, type AutoUpdateOptions} from '@floating-ui/dom'
import {MaybeAccessor, resolveAccessor} from '@winter-love/solid-use'
import {type Rect} from '@winter-love/utils'
import {type Accessor, createEffect, onCleanup} from 'solid-js'
import {getBounds} from './get-bounds'
import {computeSelectMenuPosition, type SelectMenuPositionState} from './select-menu-position'

/**
 * Non-reactive configuration for {@link useAnchorBoundsAutoUpdate}.
 *
 * **Position** — passed to {@link computeSelectMenuPosition} on each update.
 * **Subscription** — forwarded to Floating UI {@link autoUpdate}; omitted fields use library defaults (all `true` except `animationFrame`).
 */
export interface UseAnchorBoundsAutoUpdateOptions extends Pick<
  AutoUpdateOptions,
  'ancestorScroll' | 'ancestorResize' | 'elementResize' | 'layoutShift' | 'animationFrame'
> {
  /** @see SelectMenuPositionOptions.anchorGapPx */
  anchorGapPx?: number
  /** @see SelectMenuPositionOptions.listWidthPx */
  listWidthPx?: number
  /** @see SelectMenuPositionOptions.viewportPaddingPx */
  viewportPaddingPx?: number
}

const pickAutoUpdateOptions = (
  options: UseAnchorBoundsAutoUpdateOptions,
): AutoUpdateOptions | undefined => {
  const {ancestorScroll, ancestorResize, animationFrame, elementResize, layoutShift} = options

  if (
    ancestorScroll === undefined &&
    ancestorResize === undefined &&
    elementResize === undefined &&
    layoutShift === undefined &&
    animationFrame === undefined
  ) {
    return undefined
  }

  return {
    ...(ancestorScroll !== undefined && {ancestorScroll}),
    ...(ancestorResize !== undefined && {ancestorResize}),
    ...(elementResize !== undefined && {elementResize}),
    ...(layoutShift !== undefined && {layoutShift}),
    ...(animationFrame !== undefined && {animationFrame}),
  }
}

export interface UseAnchorBoundsAutoUpdateProps {
  anchorElement: Accessor<HTMLElement | undefined>
  open: Accessor<boolean>
  panelElement: Accessor<HTMLDivElement | undefined>
  setAnchorBounds: (bounds: Rect | undefined) => void
  setPanelPosition: (position: SelectMenuPositionState) => void
}

/**
 * Keeps `anchorBounds` and panel `left`/`top` in sync while the menu is open.
 *
 * Subscribes via Floating UI `autoUpdate` (scroll, resize, layout shift) and
 * recomputes bounds + position on each callback.
 */
export const useAnchorBoundsAutoUpdate = (
  props: UseAnchorBoundsAutoUpdateProps,
  options: MaybeAccessor<UseAnchorBoundsAutoUpdateOptions> = {},
) => {
  const optionsAccessor = resolveAccessor(options)

  createEffect(() => {
    if (!props.open()) {
      return
    }

    const anchor = props.anchorElement()
    const panel = props.panelElement()

    if (!anchor || !panel) {
      return
    }

    const update = () => {
      const resolvedOptions = optionsAccessor()
      const bounds = getBounds(anchor)
      props.setAnchorBounds(bounds)

      const nextPosition = computeSelectMenuPosition({
        anchorBounds: bounds,
        anchorGapPx: resolvedOptions.anchorGapPx,
        listWidthPx: resolvedOptions.listWidthPx,
        panelElement: panel,
        viewportPaddingPx: resolvedOptions.viewportPaddingPx,
      })

      if (nextPosition) {
        props.setPanelPosition(nextPosition)
      }
    }

    update()

    const cleanup = autoUpdate(anchor, panel, update, pickAutoUpdateOptions(optionsAccessor()))

    onCleanup(cleanup)
  })
}
