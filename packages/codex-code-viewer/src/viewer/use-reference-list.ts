import {type Accessor, createMemo, createSignal} from 'solid-js'
import type {NavigationLocation} from '../shared/contracts'
import {useVirtualTree} from './use-virtual-tree'

interface ReferenceHeader {
  readonly kind: 'header'
  readonly path: string
  readonly count: number
}
interface ReferenceDestination {
  readonly kind: 'destination'
  readonly location: NavigationLocation
}
type ReferenceRow = ReferenceHeader | ReferenceDestination
interface ReferenceListOptions {
  readonly element: Accessor<HTMLDivElement | null>
  readonly locations: Accessor<readonly NavigationLocation[]>
  readonly rowHeight?: Accessor<number>
}
export const REFERENCE_ROW_HEIGHT = 40
const VIRTUAL_THRESHOLD = 200

/** Windows expanded reference groups and keeps keyboard destinations mounted before focusing. */
export const useReferenceList = (options: ReferenceListOptions) => {
  const entries = createMemo(() =>
    [...Map.groupBy(options.locations(), (location) => location.path)]
      .flatMap(([path, locations]): ReferenceRow[] => [
        {count: locations.length, kind: 'header', path},
        ...locations.map((location): ReferenceDestination => ({kind: 'destination', location})),
      ])
      .map((row) => ({
        key:
          row.kind === 'header'
            ? JSON.stringify(['header', row.path])
            : JSON.stringify([
                'destination',
                row.location.path,
                row.location.line,
                row.location.column,
              ]),
        row,
      })),
  )
  const lookup = createMemo(() => new Map(entries().map((entry) => [entry.key, entry])))
  const headers = createMemo(
    () =>
      new Map(entries().flatMap(({key, row}) => (row.kind === 'header' ? [[row.path, key]] : []))),
  )
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set())
  const visible = createMemo(() => {
    const hidden = collapsed()
    return entries().filter(({row}) => row.kind === 'header' || !hidden.has(row.location.path))
  })
  const paths = createMemo(() => visible().map((entry) => entry.key))
  const positions = createMemo(() => new Map(paths().map((key, index) => [key, index + 1])))
  const virtual = () => entries().length > VIRTUAL_THRESHOLD
  const [active, setActive] = createSignal<string | null>(null)
  const window = useVirtualTree({
    active,
    current: () => '',
    element: options.element,
    paths,
    rowHeight: options.rowHeight ?? (() => REFERENCE_ROW_HEIGHT),
  })
  const move = (key: string): void => {
    setActive(key)
    window.reveal(key)
    const focus = (): void =>
      Array.from(options.element()?.querySelectorAll<HTMLButtonElement>('button[value]') ?? [])
        .find((button) => button.value === key)
        ?.focus({preventScroll: true})
    focus()
    queueMicrotask(focus)
  }
  const expand = (path: string, expanded: boolean): void => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (expanded) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
    const header = headers().get(path)
    if (header !== undefined) {
      move(header)
    }
  }
  const handleKeyboard = (event: KeyboardEvent): void => {
    if (event.isComposing) {
      return
    }
    const keys = paths()
    const current = keys.indexOf(active() ?? keys[0])
    const entry = lookup().get(keys[current])
    if (entry !== undefined && event.key === 'ArrowLeft') {
      event.preventDefault()
      expand(entry.row.kind === 'header' ? entry.row.path : entry.row.location.path, false)
      return
    }
    if (entry?.row.kind === 'header' && event.key === 'ArrowRight') {
      event.preventDefault()
      if (collapsed().has(entry.row.path)) {
        expand(entry.row.path, true)
      } else {
        move(keys[current + 1] ?? entry.key)
      }
      return
    }
    const destination = {
      ArrowDown: (current + 1) % keys.length,
      ArrowUp: (current - 1 + keys.length) % keys.length,
      End: keys.length - 1,
      Home: 0,
    }[event.key]
    const key = destination === undefined ? undefined : keys[destination]
    if (key !== undefined) {
      event.preventDefault()
      move(key)
    }
  }
  return {
    bottom: () => (virtual() ? window.bottom() : 0),
    destination: (key: string): ReferenceDestination | null => {
      const row = lookup().get(key)?.row
      return row?.kind === 'destination' ? row : null
    },
    expanded: (path: string): boolean => !collapsed().has(path),
    focus: setActive,
    gap: (key: string): number => (virtual() ? window.gap(key) : 0),
    handleKeyboard,
    header: (key: string): ReferenceHeader | null => {
      const row = lookup().get(key)?.row
      return row?.kind === 'header' ? row : null
    },
    position: (key: string): number | undefined => positions().get(key),
    rows: createMemo(() => (virtual() ? window.paths() : paths())),
    scroll: window.scroll,
    size: () => paths().length,
    toggle: (path: string): void => expand(path, collapsed().has(path)),
  }
}
