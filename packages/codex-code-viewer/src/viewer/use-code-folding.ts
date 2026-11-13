import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
} from 'solid-js'
import type {CodeDocument} from '../shared/contracts'
import type {TextMatch} from './find-text'
import type {CodeSelection} from './types'
import {useFileViewState} from './view-state/context'
import {readCodeFolds} from './editor/read-code-folds'

interface UseCodeFoldingProps {
  readonly document: Accessor<CodeDocument>
  readonly selection: Accessor<CodeSelection | undefined>
  readonly matches: Accessor<readonly TextMatch[] | undefined>
  readonly active: Accessor<number | undefined>
  readonly searchRequest: Accessor<number | undefined>
}

/** Retains per-revision folds and reveals explicit navigation and active search destinations. */
export const useCodeFolding = (props: UseCodeFoldingProps) => {
  const binding = useFileViewState()
  const initial = untrack(() => binding?.read()?.codeFolds)
  const [closed, setClosed] = createSignal<ReadonlySet<number>>(
    new Set(initial?.revision === props.document().revision ? initial.lines : []),
  )
  const [ranges, setRanges] = createSignal<ReadonlyMap<number, number>>(new Map())
  const path = createMemo(() => props.document().location.path)
  const source = createMemo(() => props.document().source)
  const revision = createMemo(() => props.document().revision)
  createEffect(on(revision, () => setClosed(new Set<number>()), {defer: true}))
  createEffect(() => {
    const name = path()
    const text = source()
    let cancelled = false
    setRanges(new Map())
    let reader: ReturnType<typeof readCodeFolds> | undefined
    let request: number | undefined
    const schedule = (): void => {
      if (typeof globalThis.requestIdleCallback === 'function') {
        request = globalThis.requestIdleCallback(discover)
      } else if (typeof globalThis.requestAnimationFrame === 'function') {
        request = globalThis.requestAnimationFrame(discover)
      } else {
        queueMicrotask(discover)
      }
    }
    const discover = (): void => {
      if (!cancelled) {
        reader ??= readCodeFolds(name, text)
        const next = reader.next()
        if (!next.done && next.value !== null) {
          setRanges(next.value)
        } else if (!next.done) {
          schedule()
        }
      }
    }
    schedule()
    onCleanup(() => {
      cancelled = true
      reader?.return(undefined)
      if (request !== undefined) {
        if (typeof globalThis.cancelIdleCallback === 'function') {
          globalThis.cancelIdleCallback(request)
        } else {
          globalThis.cancelAnimationFrame?.(request)
        }
      }
    })
  })
  createEffect(() => {
    const lines = [...closed()]
    const current = revision()
    untrack(() => binding?.update({codeFolds: {lines, revision: current}}))
  })
  const reveal = (line: number): void => {
    const available = ranges()
    setClosed(
      (previous) =>
        new Set(
          [...previous].filter(
            (start) => !(start < line && line <= (available.get(start) ?? start)),
          ),
        ),
    )
  }
  createEffect(
    on(
      () => [props.document().location, props.selection(), ranges()] as const,
      ([location, selection]) => {
        if (binding?.request().restore !== true) {
          untrack(() => reveal(selection?.line ?? location.line))
        }
      },
    ),
  )
  createEffect(
    on(
      () => [props.searchRequest(), ranges()] as const,
      ([request]) => {
        if ((request ?? 0) > 0) {
          untrack(() => {
            const match = props.matches()?.[props.active() ?? -1]
            if (match !== undefined) {
              reveal(
                source()
                  .slice(0, match.start)
                  .split(/\r\n|\r|\n/u).length,
              )
            }
          })
        }
      },
    ),
  )
  const lines = createMemo(() => props.document().lines)
  const rows = createMemo(() => lines().map((tokens, index) => ({line: index + 1, tokens})))
  const visible = createMemo(() => {
    const hidden = new Set<number>()
    const available = ranges()
    for (const start of closed()) {
      const end = available.get(start) ?? start
      for (let line = start + 1; line <= end; line += 1) {
        hidden.add(line)
      }
    }
    return rows().filter((row) => !hidden.has(row.line))
  })
  const toggle = (line: number): void => {
    setClosed((previous) => {
      const next = new Set(previous)
      if (next.has(line)) {
        next.delete(line)
      } else if (ranges().has(line)) {
        next.add(line)
      }
      return next
    })
  }
  return {closed, ranges, toggle, visible}
}
