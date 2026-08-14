export interface PixiScenePoint {
  readonly x: number
  readonly y: number
}

export interface PixiSceneTravelRange {
  readonly maximumSeconds: number
  readonly minimumSeconds: number
}

export interface PixiSceneRectangle extends PixiScenePoint {
  readonly height: number
  readonly width: number
}

export interface PixiScenePixelPush {
  readonly distance: PixiScenePoint
  readonly featherPixels: number
  readonly kind: 'pixel-push'
  readonly region: PixiSceneRectangle
}

export interface PixiSceneMaskedPixelPush {
  readonly distance: PixiScenePoint
  readonly kind: 'masked-pixel-push'
  readonly maskSource: string
}

export type PixiScenePushEffect = PixiSceneMaskedPixelPush | PixiScenePixelPush

export interface PixiScenePivotRotation {
  readonly channel?: string
  readonly center: PixiScenePoint
  readonly degrees: number
  readonly kind: 'pivot-rotation'
  readonly pixelPush?: readonly PixiScenePushEffect[]
  readonly travel: PixiSceneTravelRange
}

export interface PixiScenePixelOscillation {
  readonly channel?: string
  readonly effects: readonly PixiScenePushEffect[]
  readonly kind: 'pixel-oscillation'
  readonly travel: PixiSceneTravelRange
}

interface PixiSceneTranslationBase {
  readonly channel?: string
  readonly kind: 'translation'
  readonly transitionSeconds?: number
  readonly travel: PixiSceneTravelRange
}

export interface PixiSceneDistanceTranslation extends PixiSceneTranslationBase {
  readonly distance: PixiScenePoint
}

export interface PixiSceneTargetTranslation extends PixiSceneTranslationBase {
  readonly targets: readonly PixiScenePoint[]
}

export type PixiSceneTranslation = PixiSceneDistanceTranslation | PixiSceneTargetTranslation

export type PixiSceneMotion =
  | PixiScenePivotRotation
  | PixiScenePixelOscillation
  | PixiSceneTranslation

export interface PixiSceneLayerDefinition {
  readonly attachmentId?: string
  readonly channel?: string
  readonly id: string
  readonly motion?: PixiSceneMotion
  readonly motions?: readonly PixiSceneMotion[]
  readonly opacity?: number
  readonly parentAttachmentId?: string
  readonly source: string
  readonly visible?: boolean
}

export interface PixiLayerSceneDefinition {
  readonly background: string
  readonly height: number
  readonly id: string
  readonly layers: readonly PixiSceneLayerDefinition[]
  readonly width: number
}

export interface PixiSceneChannelState {
  readonly opacity?: number
  readonly visible?: boolean
}

export interface PixiLayerSceneState {
  readonly animationEnabled: boolean
  readonly channels?: Readonly<Record<string, PixiSceneChannelState>>
}
