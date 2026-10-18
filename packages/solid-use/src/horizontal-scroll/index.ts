import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'

const DEFAULT_PAGE_RATIO = 0.8
const EDGE_TOLERANCE = 1

export interface UseHorizontalScrollProps {
  /** 이동할 화면 너비의 비율입니다. 생략하면 0.8이며, 유한한 양수여야 합니다. */
  readonly pageRatio?: Accessor<number | undefined>
  readonly viewport: Accessor<HTMLElement | null>
}

export interface HorizontalScrollController {
  readonly canScrollLeft: Accessor<boolean>
  readonly canScrollRight: Accessor<boolean>
  /** 스크롤 영역의 JSX onScroll에 연결합니다. */
  readonly onScroll: () => void
  readonly scrollLeft: () => void
  readonly scrollRight: () => void
}

/** DOM을 렌더링하지 않고 가로 스크롤 방향과 이동을 제공하며, 내용·크기 변경을 관찰합니다. */
export const useHorizontalScroll = (
  props: UseHorizontalScrollProps,
): HorizontalScrollController => {
  const [canScrollLeft, setCanScrollLeft] = createSignal(false)
  const [canScrollRight, setCanScrollRight] = createSignal(false)
  const measure = () => {
    const element = props.viewport()
    if (element === null) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }
    const maximum = Math.max(0, element.scrollWidth - element.clientWidth)
    const direction = element.ownerDocument.defaultView?.getComputedStyle(element).direction
    const rawOffset = direction === 'rtl' ? maximum + element.scrollLeft : element.scrollLeft
    const offset = Math.min(maximum, Math.max(0, rawOffset))
    setCanScrollLeft(offset > EDGE_TOLERANCE)
    setCanScrollRight(offset < maximum - EDGE_TOLERANCE)
  }
  const scrollPage = (direction: -1 | 1) => {
    const element = props.viewport()
    if (element === null) {
      return
    }
    const pageRatio = props.pageRatio?.() ?? DEFAULT_PAGE_RATIO
    if (!Number.isFinite(pageRatio) || pageRatio <= 0) {
      throw new RangeError('pageRatio must be a finite positive number')
    }
    // Preserve keyboard scrolling when the activated edge control disappears.
    element.focus({preventScroll: true})
    element.scrollBy({left: direction * element.clientWidth * pageRatio})
  }

  createEffect(() => {
    const element = props.viewport()
    measure()
    if (element === null) {
      return
    }
    const resizeObserver =
      typeof globalThis.ResizeObserver === 'undefined'
        ? undefined
        : new globalThis.ResizeObserver(measure)
    const observed = new Set<Element>()
    const observeContent = () => {
      const targets = new Set<Element>([element, ...element.children])
      for (const target of observed) {
        if (!targets.has(target)) {
          resizeObserver?.unobserve(target)
          observed.delete(target)
        }
      }
      for (const target of targets) {
        if (!observed.has(target)) {
          resizeObserver?.observe(target)
          observed.add(target)
        }
      }
    }
    observeContent()
    const mutationObserver =
      typeof globalThis.MutationObserver === 'undefined'
        ? undefined
        : new globalThis.MutationObserver(() => {
            observeContent()
            measure()
          })
    mutationObserver?.observe(element, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })
    onCleanup(() => {
      resizeObserver?.disconnect()
      mutationObserver?.disconnect()
    })
  })

  return {
    canScrollLeft,
    canScrollRight,
    onScroll: measure,
    scrollLeft: () => scrollPage(-1),
    scrollRight: () => scrollPage(1),
  }
}
