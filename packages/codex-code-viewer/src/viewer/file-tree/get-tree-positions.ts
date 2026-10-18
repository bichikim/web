interface TreePosition {
  readonly position: number
  readonly size: number
}
/** Describes sibling positions for partially rendered tree rows. */
export const getTreePositions = (paths: readonly string[]): ReadonlyMap<string, TreePosition> => {
  const groups = new Map<string, string[]>()
  for (const path of paths) {
    const parent = path.split('/').slice(0, -1).join('/')
    const siblings = groups.get(parent) ?? []
    siblings.push(path)
    groups.set(parent, siblings)
  }
  return new Map(
    [...groups.values()].flatMap((siblings) =>
      siblings.map((path, index) => [path, {position: index + 1, size: siblings.length}] as const),
    ),
  )
}
