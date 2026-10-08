import {batch, createSignal} from 'solid-js'
import type {CodeLocation} from '../shared/contracts'

/** Tracks successful file visits and discards forward history after a new visit. */
export const useFileHistory = () => {
  const [locations, setLocations] = createSignal<CodeLocation[]>([])
  const [index, setIndex] = createSignal(0)
  const record = (location: CodeLocation, existing?: number): void => {
    if (existing !== undefined) {
      setIndex(existing)
      return
    }
    const next = [...locations().slice(0, index() + 1), location]
    batch(() => {
      setLocations(next)
      setIndex(next.length - 1)
    })
  }
  return {
    canBack: () => index() > 0,
    canForward: () => index() < locations().length - 1,
    destination: (direction: -1 | 1) => locations()[index() + direction],
    index,
    record,
    reset: (location?: CodeLocation) =>
      batch(() => {
        setLocations(location === undefined ? [] : [location])
        setIndex(0)
      }),
  }
}
