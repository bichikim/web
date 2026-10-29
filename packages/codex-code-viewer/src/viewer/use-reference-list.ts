import {type Accessor, createEffect, createMemo, createSignal, on} from 'solid-js'
import type {NavigationGroup, NavigationLocation} from '../shared/contracts'
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
interface UseReferenceListProps {
  readonly element: Accessor<HTMLDivElement | null>
  readonly filter?: Accessor<string>
  readonly groups?: Accessor<readonly NavigationGroup[]>
  readonly locations: Accessor<readonly NavigationLocation[]>
  readonly rowHeight?: Accessor<number>
}
export const REFERENCE_ROW_HEIGHT = 40
const VIRTUAL_THRESHOLD = 200

const fileKey = (path: string): string => JSON.stringify(['file', path])

const rowKey = (row: ReferenceRow): string =>
  row.kind === 'header'
    ? JSON.stringify(['header', row.path])
    : JSON.stringify(['destination', row.location.path, row.location.line, row.location.column])

/** Windows expanded reference groups and keeps keyboard destinations mounted before focusing. */
export const useReferenceList = (props: UseReferenceListProps) => {
  const entries = createMemo(() => {
    const locations = Map.groupBy(props.locations(), (location) => location.path)
    const groups = new Map((props.groups?.() ?? []).map((group) => [group.path, group.count]))
    const paths = new Set([...groups.keys(), ...locations.keys()])
    return [...paths]
      .flatMap((path): ReferenceRow[] => [
        {count: groups.get(path) ?? locations.get(path)?.length ?? 0, kind: 'header', path},
        ...(locations.get(path) ?? []).map(
          (location): ReferenceDestination => ({kind: 'destination', location}),
        ),
      ])
      .map((row) => ({key: rowKey(row), row}))
  })
  const lookup = createMemo(
    () =>
      new Map(
        entries().flatMap((entry) =>
          entry.row.kind === 'header'
            ? [
                [entry.key, entry],
                [fileKey(entry.row.path), entry],
              ]
            : [[entry.key, entry]],
        ),
      ),
  )
  const headers = createMemo(
    () =>
      new Map(entries().flatMap(({key, row}) => (row.kind === 'header' ? [[row.path, key]] : []))),
  )
  const [collapsed, setCollapsed] = createSignal<ReadonlySet<string>>(new Set())
  const visible = createMemo(() => {
    const hidden = collapsed()
    return entries().filter(({row}) => row.kind === 'header' || !hidden.has(row.location.path))
  })
  const rowKeys = createMemo(() => visible().map((entry) => entry.key))
  const paths = createMemo(() =>
    visible().flatMap(({key, row}) => (row.kind === 'header' ? [key, fileKey(row.path)] : [key])),
  )
  const positions = createMemo(() => new Map(paths().map((key, index) => [key, index + 1])))
  const virtual = () => entries().length > VIRTUAL_THRESHOLD
  const [active, setActive] = createSignal<string | null>(null)
  const window = useVirtualTree({
    active: () => lookup().get(active() ?? '')?.key ?? null,
    current: () => '',
    element: props.element,
    paths: rowKeys,
    rowHeight: props.rowHeight ?? (() => REFERENCE_ROW_HEIGHT),
  })
  createEffect(
    on(
      props.filter ?? (() => ''),
      () => {
        setActive(null)
        window.reveal(rowKeys()[0] ?? null)
      },
      {defer: true},
    ),
  )
  const move = (key: string): void => {
    setActive(key)
    window.reveal(lookup().get(key)?.key ?? key)
    const focus = (): void =>
      Array.from(props.element()?.querySelectorAll<HTMLButtonElement>('button[value]') ?? [])
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
      if (keys[current] === fileKey(entry.row.path)) {
        move(entry.key)
        return
      }
      if (collapsed().has(entry.row.path)) {
        expand(entry.row.path, true)
      } else {
        move(keys[current + 2] ?? entry.key)
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
    fileKey,
    focus: setActive,
    gap: (key: string): number => (virtual() ? window.gap(key) : 0),
    handleKeyboard,
    header: (key: string): ReferenceHeader | null => {
      const row = lookup().get(key)?.row
      return row?.kind === 'header' ? row : null
    },
    position: (key: string): number | undefined => positions().get(key),
    rows: createMemo(() => (virtual() ? window.paths() : rowKeys())),
    scroll: window.scroll,
    size: () => paths().length,
    toggle: (path: string): void => expand(path, collapsed().has(path)),
  }
}
