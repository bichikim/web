import type {PuppetMesh} from '../../../../player'

export const createDenseMesh = (count: number): PuppetMesh => ({
  indices: [0, 1, 2],
  uvs: Array.from({length: count * 2}, () => 0),
  vertices: Array.from({length: count * 2}, (_, index) =>
    index % 2 === 0 ? Math.floor(index / 2) : Math.floor(index / 2) % 2,
  ),
})
