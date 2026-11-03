import {isEqual} from 'es-toolkit'
import type {RuntimeInputPatch, RuntimeInputs} from './types'

interface DiffRuntimeInputsOptions {
  /** Owned control snapshot before the command. */
  readonly before: RuntimeInputs
  /** Owned control snapshot after the command. */
  readonly after: RuntimeInputs
  /** Explicit timeline resets replace all fields even when a requested time was already selected. */
  readonly playback?: 'replace'
  /** Explicit independent seek must replace time even if the host mirror was already there. */
  readonly additionalReset?: number
}
const diffFields = <T extends object>(before: T, after: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(after).filter(([key, value]) => !isEqual(value, Reflect.get(before, key))),
  ) as Partial<T>

/** Preserves new controls without copying stale integrated look/timeline state over a Worker reply. */
export const diffRuntimeInputs = (options: DiffRuntimeInputsOptions): RuntimeInputPatch => {
  const {additional, look, playback, ...before} = options.before
  const {
    additional: nextAdditional,
    look: nextLook,
    playback: nextPlayback,
    ...after
  } = options.after
  const lookPatch = diffFields(look, nextLook)
  const playbackPatch =
    options.playback === 'replace' ? nextPlayback : diffFields(playback, nextPlayback)
  const previous = new Map(additional.map((entry) => [entry.id, entry]))
  const next = new Map(nextAdditional.map((entry) => [entry.id, entry]))
  const changed = Object.fromEntries(
    [...new Set([...previous.keys(), ...next.keys()])].flatMap((id) => {
      const original = previous.get(id)
      const current = next.get(id)
      const difference =
        current === undefined
          ? null
          : original === undefined
            ? current
            : diffFields(original, current)
      const value =
        current !== undefined && id === options.additionalReset
          ? {...difference, status: current.status, time: current.time}
          : difference
      return value === null || Object.keys(value).length > 0 ? [[String(id), value]] : []
    }),
  )
  return {
    ...diffFields(before, after),
    ...(Object.keys(changed).length === 0 ? {} : {additional: changed}),
    ...(Object.keys(lookPatch).length === 0 ? {} : {look: lookPatch}),
    ...(Object.keys(playbackPatch).length === 0 ? {} : {playback: playbackPatch}),
  }
}
