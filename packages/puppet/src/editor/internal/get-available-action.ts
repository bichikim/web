export const getAvailableAction = <Action>(
  availability: unknown,
  action: Action,
): Action | undefined => (availability === undefined ? undefined : action)
