import type {
  PuppetParameter,
  PuppetParameterKeyformBase,
  PuppetParameterVisibility,
  PuppetSceneNode,
} from '../../player/document'

export interface NativeForm extends PuppetParameterKeyformBase {
  readonly values: ReadonlyArray<number>
}

export interface NativeObject {
  readonly rotationScaleFactor?: number
  readonly visibilityRanges?: ReadonlyArray<PuppetParameterVisibility>
  readonly sourceId?: string
  readonly id: string
  readonly node: PuppetSceneNode
  readonly forms: ReadonlyArray<NativeForm>
  readonly axes: ReadonlyArray<PuppetParameter>
  readonly parent: number
  readonly deformer?: number
}

export interface Moc3Record {
  /** Native table containing the record. */
  readonly table: string
  /** Zero-based record index in the table. */
  readonly index: number
}
