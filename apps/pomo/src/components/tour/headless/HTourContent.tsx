import {Dialog} from '@kobalte/core/dialog'
import {createMemo, type JSX} from 'solid-js'

import type {TourTargetBounds} from './types'

export interface HTourContentProps {
  readonly 'aria-label'?: string
  readonly 'aria-labelledby'?: string
  readonly children?: JSX.Element
  readonly class?: string
  readonly gap?: number
  readonly id?: string
  readonly style?: JSX.CSSProperties
  readonly targetBounds?: TourTargetBounds | null
  readonly viewportInset?: number
  readonly width?: number
}

interface TourContentPlacement {
  readonly name: 'bottom' | 'center' | 'top'
  readonly style: JSX.CSSProperties
}

interface ResolvePlacementOptions {
  readonly bounds: TourTargetBounds | null | undefined
  readonly gap: number | undefined
  readonly viewportInset: number | undefined
  readonly width: number | undefined
}

const DEFAULT_GAP = 12
const DEFAULT_VIEWPORT_INSET = 16
const DEFAULT_WIDTH = 352

const resolvePlacement = (options: ResolvePlacementOptions): TourContentPlacement => {
  const {bounds} = options

  if (bounds === null || bounds === undefined) {
    return {
      name: 'center',
      style: {left: '50%', position: 'fixed', top: '50%', transform: 'translate(-50%, -50%)'},
    }
  }

  const gap = Math.max(0, options.gap ?? DEFAULT_GAP)
  const viewportInset = Math.max(0, options.viewportInset ?? DEFAULT_VIEWPORT_INSET)
  const availableWidth = Math.max(0, bounds.viewportWidth - viewportInset * 2)
  const contentWidth = Math.min(Math.max(0, options.width ?? DEFAULT_WIDTH), availableWidth)
  const left = Math.max(
    viewportInset,
    Math.min(bounds.left, bounds.viewportWidth - contentWidth - viewportInset),
  )
  const spaceAbove = bounds.top
  const spaceBelow = bounds.viewportHeight - bounds.bottom

  if (spaceBelow >= spaceAbove) {
    return {
      name: 'bottom',
      style: {
        left: `${left}px`,
        'max-height': `${Math.max(0, spaceBelow - gap - viewportInset)}px`,
        position: 'fixed',
        top: `${bounds.bottom + gap}px`,
      },
    }
  }

  return {
    name: 'top',
    style: {
      bottom: `${bounds.viewportHeight - bounds.top + gap}px`,
      left: `${left}px`,
      'max-height': `${Math.max(0, spaceAbove - gap - viewportInset)}px`,
      position: 'fixed',
    },
  }
}

/** 대상 위치에 맞춰 접근 가능한 투어 패널을 배치합니다. */
export const HTourContent = (props: HTourContentProps) => {
  const placement = createMemo(() =>
    resolvePlacement({
      bounds: props.targetBounds,
      gap: props.gap,
      viewportInset: props.viewportInset,
      width: props.width,
    }),
  )

  return (
    <Dialog.Content
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      class={props.class}
      data-placement={placement().name}
      id={props.id}
      style={{...placement().style, ...props.style}}
    >
      {props.children}
    </Dialog.Content>
  )
}
