/** Checks whether an entry or one of its descendants has pending changes. */
export const hasPendingPath = (path: string, pending: readonly string[]): boolean =>
  pending.some((draft) => draft === path || draft.startsWith(`${path}/`))
