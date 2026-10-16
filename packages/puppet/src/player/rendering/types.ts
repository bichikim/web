import type {
  ColorMatrixFilter,
  Container,
  MaskFilter,
  MeshSimple,
  RenderTexture,
  Sprite,
} from 'pixi.js'
import type {PartBlendFilter} from './part-blend-filter'

/** Filters created on demand for a part's or layer's render properties. */
export interface RuntimeEffects {
  blendFilter?: PartBlendFilter
  colorFilter?: ColorMatrixFilter
  readonly mask?: RuntimePartMask
}

export interface RuntimePart extends RuntimeEffects {
  /** Whether the drawn indices currently leave out turned-over triangles. */
  culled?: boolean
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

/** An offscreen group drawn as an isolated container. */
export interface RuntimeLayer extends RuntimeEffects {
  readonly container: Container
  readonly groupId: string
  /** Visible parts drawn into the layer in the last frame; they bound its mask. */
  memberPartIds: ReadonlyArray<string>
}
