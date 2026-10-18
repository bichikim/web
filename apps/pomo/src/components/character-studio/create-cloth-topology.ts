export interface CreateClothTopologyOptions {
  readonly positions: readonly number[] | Float32Array
  readonly seamPrecision: number
  readonly selected: ReadonlySet<number>
  readonly triangles: ArrayLike<number>
}

export interface ClothTopology {
  readonly edges: ReadonlyArray<readonly [number, number]>
  readonly mapping: ReadonlyMap<number, number>
  readonly pinned: ReadonlyArray<boolean>
  readonly representatives: ReadonlyArray<number>
}

const COMPONENTS = 3

/** Connects selected triangle vertices, welding coincident seams and pinning their boundary. */
export const createClothTopology = (
  options: CreateClothTopologyOptions,
): ClothTopology | undefined => {
  const {positions, seamPrecision, selected, triangles} = options
  if (selected.size === 0) {
    return undefined
  }
  const included = new Set(selected)
  const connections: [number, number][] = []
  for (let index = 0; index < triangles.length; index += COMPONENTS) {
    const triangle = [triangles[index], triangles[index + 1], triangles[index + 2]]
    if (triangle.some((vertex) => selected.has(vertex))) {
      triangle.forEach((vertex) => included.add(vertex))
      connections.push(
        [triangle[0], triangle[1]],
        [triangle[1], triangle[2]],
        [triangle[2], triangle[0]],
      )
    }
  }
  // Weld UV seams so duplicate render vertices cannot tear apart.
  const welded = new Map<string, number>()
  const mapping = new Map<number, number>()
  const representatives: number[] = []
  const pinned: boolean[] = []
  for (const vertex of included) {
    const key = Array.from(
      positions.slice(vertex * COMPONENTS, vertex * COMPONENTS + COMPONENTS),
      (value) => value.toFixed(seamPrecision),
    ).join(',')
    let particle = welded.get(key)
    if (particle === undefined) {
      particle = representatives.length
      welded.set(key, particle)
      representatives.push(vertex)
      pinned.push(false)
    }
    mapping.set(vertex, particle)
    pinned[particle] ||= !selected.has(vertex)
  }
  const edgeKeys = new Set<string>()
  const edges: [number, number][] = []
  for (const [first, second] of connections) {
    const left = mapping.get(first)!
    const right = mapping.get(second)!
    const key = left < right ? `${left}:${right}` : `${right}:${left}`
    if (left !== right && !edgeKeys.has(key)) {
      edgeKeys.add(key)
      edges.push([left, right])
    }
  }

  return {edges, mapping, pinned, representatives}
}
