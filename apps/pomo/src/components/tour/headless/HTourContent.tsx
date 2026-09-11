import {Dialog} from '@kobalte/core/dialog'
import {cx} from 'class-variance-authority'
import {createEffect, createMemo, createSignal, type JSX, onCleanup} from 'solid-js'

import type {TourTargetBounds} from './types'

export interface HTourContentProps {
  readonly 'aria-label'?: string
  readonly 'aria-labelledby'?: string
  readonly children?: JSX.Element
  readonly class?: string
  readonly gap?: number
  readonly id?: string
  readonly targetBounds?: TourTargetBounds | null
  readonly viewportInset?: number
}

interface TourContentPlacement {
  readonly name: 'bottom' | 'center' | 'top'
  readonly left?: number
  readonly edge?: number
  readonly maxHeight?: number
}

interface ResolvePlacementOptions {
  readonly bounds: TourTargetBounds | null | undefined
  readonly contentWidth: number | null
  readonly gap: number | undefined
  readonly viewportInset: number | undefined
}

const DEFAULT_GAP = 12
const DEFAULT_VIEWPORT_INSET = 16

const resolvePlacement = (options: ResolvePlacementOptions): TourContentPlacement => {
  const {bounds} = options

  if (bounds === null || bounds === undefined) {
    return {
      name: 'center',
    }
  }

  const gap = Math.max(0, options.gap ?? DEFAULT_GAP)
  const viewportInset = Math.max(0, options.viewportInset ?? DEFAULT_VIEWPORT_INSET)
  const availableWidth = Math.max(0, bounds.viewportWidth - viewportInset * 2)
  const contentWidth = Math.min(Math.max(0, options.contentWidth ?? availableWidth), availableWidth)
  const left = Math.max(
    viewportInset,
    Math.min(bounds.left, bounds.viewportWidth - contentWidth - viewportInset),
  )
  const spaceAbove = bounds.top
  const spaceBelow = bounds.viewportHeight - bounds.bottom

  if (spaceBelow >= spaceAbove) {
    return {
      edge: bounds.bottom + gap,
      left,
      maxHeight: Math.max(0, spaceBelow - gap - viewportInset),
      name: 'bottom',
    }
  }

  return {
    edge: bounds.viewportHeight - bounds.top + gap,
    left,
    maxHeight: Math.max(0, spaceAbove - gap - viewportInset),
    name: 'top',
  }
}

/** 대상 위치에 맞춰 접근 가능한 투어 패널을 배치합니다. */
export const HTourContent = (props: HTourContentProps) => {
  const [contentElement, setContentElement] = createSignal<HTMLDivElement>()
  const [contentWidth, setContentWidth] = createSignal<number | null>(null)
  let returnTarget: HTMLElement | null = null
  const handleOpenAutoFocus = () => {
    const active = contentElement()?.ownerDocument.activeElement
    returnTarget = active instanceof HTMLElement ? active : null
  }
  const handleCloseAutoFocus = (event: Event) => {
    const content = contentElement()
    const document = content?.ownerDocument
    const active = document?.activeElement
    if (
      returnTarget?.isConnected &&
      (active === document?.body || content?.contains(active ?? null))
    ) {
      event.preventDefault()
      returnTarget.focus({preventScroll: true})
    }
  }

  createEffect(() => {
    const element = contentElement()

    if (element === undefined) {
      return
    }

    const updateWidth = () => setContentWidth(element.getBoundingClientRect().width)
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateWidth)

    updateWidth()
    resizeObserver?.observe(element)

    onCleanup(() => resizeObserver?.disconnect())
  })

  const placement = createMemo(() =>
    resolvePlacement({
      bounds: props.targetBounds,
      contentWidth: contentWidth(),
      gap: props.gap,
      viewportInset: props.viewportInset,
    }),
  )
  const variables = createMemo(() => {
    const current = placement()
    return {
      '--tour-edge': current.edge === undefined ? undefined : `${current.edge}px`,
      '--tour-left': current.left === undefined ? undefined : `${current.left}px`,
      '--tour-max-height': current.maxHeight === undefined ? undefined : `${current.maxHeight}px`,
    }
  })

  return (
    <Dialog.Content
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      class={cx(
        'fixed data-[placement=center]:left-1/2 data-[placement=center]:top-1/2 ' +
          'data-[placement=center]:[transform:translate(-50%,-50%)] ' +
          'data-[placement=bottom]:[left:var(--tour-left)] data-[placement=bottom]:[top:var(--tour-edge)] ' +
          'data-[placement=top]:[left:var(--tour-left)] data-[placement=top]:[bottom:var(--tour-edge)] ' +
          'data-[placement=bottom]:[max-height:var(--tour-max-height)] ' +
          'data-[placement=top]:[max-height:var(--tour-max-height)]',
        props.class,
      )}
      data-placement={placement().name}
      id={props.id}
      onCloseAutoFocus={handleCloseAutoFocus}
      onOpenAutoFocus={handleOpenAutoFocus}
      ref={setContentElement}
      style={variables()}
    >
      {props.children}
    </Dialog.Content>
  )
}
