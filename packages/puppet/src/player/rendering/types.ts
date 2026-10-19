import type {
  ColorMatrixFilter,
  Container,
  MaskFilter,
  MeshSimple,
  RenderTexture,
  Sprite,
} from 'pixi.js'

export interface RuntimePart {
  colorFilter?: ColorMatrixFilter
  mask?: RuntimePartMask
  readonly mesh: MeshSimple
  readonly partId: string
  restVertices: ReadonlyArray<number>
  vertices: Float32Array
}

export interface RuntimePartMaskMesh {
  readonly mask?: RuntimePartMask
  readonly mesh: MeshSimple
  readonly sourcePartId: string
}

export interface RuntimePartMask {
  readonly container: Container
  readonly filter: MaskFilter
  readonly meshes: ReadonlyArray<RuntimePartMaskMesh>
  readonly sprite: Sprite
  readonly texture: RenderTexture
}
