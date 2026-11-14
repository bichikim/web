import {type Accessor, createEffect, createMemo, createSignal, on} from 'solid-js'
import type {ChangeHunk} from '../shared/change-contracts'
import type {InlineChange} from './types'

interface UseChangeInspectionProps {
  readonly path: Accessor<string | undefined>
  readonly base: Accessor<string | null>
  readonly source: Accessor<string>
  readonly hunks: Accessor<readonly ChangeHunk[]>
}
export const useChangeInspection = (props: UseChangeInspectionProps) => {
  const [active, setActive] = createSignal<number | null>(null)
  let origin: HTMLElement | null = null
  createEffect(on([props.path, props.source, props.hunks], () => setActive(null)))
  const inspection = createMemo<InlineChange | null>(() => {
    const index = active()
    const path = props.path()
    const hunks = props.hunks()
    return index === null || path === undefined || hunks[index] === undefined
      ? null
      : {
          active: index,
          base: props.base(),
          hunks,
          path,
          source: props.source(),
        }
  })
  return {
    close: (): void => {
      const label = origin?.getAttribute('aria-label')
      const document = origin?.ownerDocument
      setActive(null)
      const button = [
        ...(document?.querySelectorAll<HTMLButtonElement>('button[aria-label]') ?? []),
      ].find((element) => element.getAttribute('aria-label') === label)
      button?.focus({preventScroll: true})
    },
    inspection,
    navigate: (index: number): void => {
      if (props.hunks()[index] !== undefined) {
        setActive(index)
      }
    },
    open: (hunk: ChangeHunk): void => {
      const index = props.hunks().indexOf(hunk)
      const focused = globalThis.document?.activeElement
      if (active() === null && focused instanceof HTMLElement) {
        origin = focused
      }
      setActive(index < 0 || active() === index ? null : index)
    },
  }
}
