import type {PuppetMesh} from '../../src/player'

export const createFanMesh = (triangleCount: number): PuppetMesh => {
  const indices: number[] = []
  const textureCenter = 0.5
  const uvs: number[] = [textureCenter, textureCenter]
  const vertices: number[] = [0, 0]

  for (let index = 0; index < triangleCount; index += 1) {
    const angle = (index / triangleCount) * Math.PI * 2
    const x = Math.cos(angle)
    const y = Math.sin(angle)

    vertices.push(x, y)
    uvs.push((x + 1) / 2, (y + 1) / 2)
  }

  for (let index = 0; index < triangleCount; index += 1) {
    indices.push(0, index + 1, ((index + 1) % triangleCount) + 1)
  }

  return {indices, uvs, vertices}
}

export const createGridMesh = (size: number): PuppetMesh => {
  const indices: number[] = []
  const uvs: number[] = []
  const vertices: number[] = []

  for (let row = 0; row <= size; row += 1) {
    for (let column = 0; column <= size; column += 1) {
      vertices.push(column, row)
      uvs.push(column / size, row / size)
    }
  }

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const topLeft = row * (size + 1) + column
      const topRight = topLeft + 1
      const bottomLeft = topLeft + size + 1
      const bottomRight = bottomLeft + 1

      indices.push(topLeft, topRight, bottomRight, topLeft, bottomRight, bottomLeft)
    }
  }

  return {indices, uvs, vertices}
}
