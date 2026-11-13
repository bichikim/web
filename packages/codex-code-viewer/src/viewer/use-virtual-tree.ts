import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'

interface UseVirtualTreeProps {
  readonly element: Accessor<HTMLElement | null>
  readonly paths: Accessor<string[]>
  readonly current: Accessor<string>
  readonly active?: Accessor<string | null>
  readonly rowHeight?: number | Accessor<number>
}
export const TREE_ROW_HEIGHT = 28
const OVERSCAN = 10
const INITIAL_HEIGHT = 400

/** Exposes viewport rows and mounts offscreen destinations before keyboard focus moves. */
export const useVirtualTree = (props: UseVirtualTreeProps) => {
  const rowHeight = (): number =>
    typeof props.rowHeight === 'function' ? props.rowHeight() : (props.rowHeight ?? TREE_ROW_HEIGHT)
  const [offset, setOffset] = createSignal(0)
  const [height, setHeight] = createSignal(INITIAL_HEIGHT)
  const start = createMemo(() =>
    Math.max(0, Math.min(Math.floor(offset() / rowHeight()) - OVERSCAN, props.paths().length - 1)),
  )
  const end = createMemo(() =>
    Math.min(props.paths().length, start() + Math.ceil(height() / rowHeight()) + OVERSCAN * 2),
  )
  const rendered = createMemo(() => {
    const paths = props.paths()
    const indices = Array.from({length: end() - start()}, (_, index) => start() + index)
    const active = props.active?.()
    const selected = active === null || active === undefined ? -1 : paths.indexOf(active)
    if (selected >= 0 && (selected < start() || selected >= end())) {
      indices.push(selected)
    }
    return indices.sort((left, right) => left - right)
  })
  const gaps = createMemo(() => {
    const paths = props.paths()
    return new Map(
      rendered().map(
        (index, position, indices) =>
          [paths[index], (index - (indices[position - 1] ?? -1) - 1) * rowHeight()] as const,
      ),
    )
  })
  const reveal = (path: string | null): void => {
    const container = props.element()
    const index = path === null ? -1 : props.paths().indexOf(path)
    if (container === null || index < 0) {
      return
    }
    const top = index * rowHeight()
    if (top < container.scrollTop || top + rowHeight() > container.scrollTop + height()) {
      container.scrollTop = Math.max(0, top - (height() - rowHeight()) / 2)
      setOffset(container.scrollTop)
    }
  }
  createEffect(
    on(props.element, (container) => {
      if (container === null) {
        return
      }
      if (container.clientHeight > 0) {
        setHeight(container.clientHeight)
      }
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() =>
          setHeight(container.clientHeight || INITIAL_HEIGHT),
        )
        observer.observe(container)
        onCleanup(() => observer.disconnect())
      }
    }),
  )
  let revealed: {element: HTMLElement | null; path: string} | null = null
  createEffect(
    on([props.element, props.current, props.paths], ([container, path, paths]) => {
      if (
        container !== null &&
        paths.includes(path) &&
        (revealed?.element !== container || revealed.path !== path)
      ) {
        reveal(path)
        revealed = {element: container, path}
      }
    }),
  )
  return {
    bottom: () =>
      Math.max(0, (props.paths().length - ((rendered().at(-1) ?? -1) + 1)) * rowHeight()),
    gap: (path: string): number => gaps().get(path) ?? 0,
    paths: createMemo(() => rendered().map((index) => props.paths()[index])),
    reveal,
    scroll: (event: Event & {currentTarget: HTMLDivElement}) =>
      setOffset(event.currentTarget.scrollTop),
    top: () => (rendered()[0] ?? 0) * rowHeight(),
  }
}
