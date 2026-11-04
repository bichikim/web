import type {RuntimeInputPatch} from './types'
interface PendingField {
  readonly path: ReadonlyArray<string>
  readonly revision: number
  readonly value: unknown
}

/** Retains one latest value per control field, including independently acknowledged motion fields. */
export const createInputMailbox = () => {
  const fields = new Map<string, PendingField>()
  let revision = 0
  let settled = 0
  let requested = 0
  const store = (path: ReadonlyArray<string>, value: unknown) => {
    const key = path.join('\0')
    if (value === null) {
      for (const existing of fields.keys()) {
        if (existing.startsWith(`${key}\0`)) {
          fields.delete(existing)
        }
      }
    }
    fields.set(key, {path, revision, value})
  }
  const storeAdditional = (entries: NonNullable<RuntimeInputPatch['additional']>) => {
    for (const [id, update] of Object.entries(entries)) {
      if (update === null) {
        store(['additional', id], null)
      } else {
        for (const [field, nested] of Object.entries(update)) {
          store(['additional', id, field], nested)
        }
      }
    }
  }
  const snapshot = () => {
    const patch: Record<string, unknown> = {}
    for (const entry of fields.values()) {
      let target = patch
      entry.path.slice(0, -1).forEach((key) => {
        const nested = target[key]
        if (nested === undefined) {
          target[key] = {}
        }
        target = target[key] as Record<string, unknown>
      })
      target[entry.path.at(-1)!] = entry.value
    }
    return {patch: patch as RuntimeInputPatch, revision, settle: settled > 0}
  }
  return {
    acknowledge(applied: number) {
      for (const [key, entry] of fields) {
        if (entry.revision <= applied) {
          fields.delete(key)
        }
      }
      if (settled <= applied) {
        settled = 0
      }
      if (requested <= applied) {
        requested = 0
      }
    },
    add(patch: RuntimeInputPatch, settle = false, force = false) {
      if (Object.keys(patch).length > 0 || settle || force) {
        revision += 1
        requested = revision
        for (const [key, value] of Object.entries(patch)) {
          if (key === 'look' || key === 'playback') {
            for (const [field, nested] of Object.entries(value)) {
              store([key, field], nested)
            }
          } else if (key === 'additional') {
            storeAdditional(value as NonNullable<RuntimeInputPatch['additional']>)
          } else {
            store([key], value)
          }
        }
        if (settle) {
          settled = revision
        }
      }
      return revision
    },
    clear() {
      fields.clear()
      settled = 0
      requested = 0
    },
    pending: () => fields.size > 0 || settled > 0 || requested > 0,
    revision: () => revision,
    snapshot,
  }
}
