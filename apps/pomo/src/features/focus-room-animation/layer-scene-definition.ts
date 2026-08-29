export interface PixiScenePoint {
  readonly x: number
  readonly y: number
}

export interface CreateStaticLayerSceneOptions {
  readonly background: string
  readonly height: number
  readonly id: string
  readonly source: string
  readonly width: number
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

export interface PixiSceneStatePixelPush {
  readonly channel: string
  readonly effect: PixiScenePushEffect
}

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

export interface PixiSceneLoopingTranslation {
  readonly channel?: string
  readonly fade?: {
    readonly edgeFraction: number
    readonly minimumOpacity: number
  }
  readonly from: PixiScenePoint
  readonly kind: 'looping-translation'
  readonly phase?: number
  readonly to: PixiScenePoint
  readonly travel: PixiSceneTravelRange
}

export interface PixiSceneOpacityPulse {
  readonly channel?: string
  readonly kind: 'opacity-pulse'
  readonly maximumOpacity: number
  readonly minimumOpacity: number
  readonly phase?: number
  readonly transitionSeconds?: number
  readonly travel: PixiSceneTravelRange
}

export interface PixiSceneVisibilityCycle {
  readonly channel?: string
  readonly kind: 'visibility-cycle'
  readonly phase?: number
  readonly travel: PixiSceneTravelRange
  readonly visibleFraction: number
}

export interface PixiSceneOpacityTwinkle {
  readonly channel?: string
  readonly fall: PixiSceneTravelRange
  readonly flashChance: number
  readonly flashFall: PixiSceneTravelRange
  readonly flashHold: PixiSceneTravelRange
  readonly flashRise: PixiSceneTravelRange
  readonly kind: 'opacity-twinkle'
  readonly maximumOpacity: number
  readonly minimumOpacity: number
  readonly rise: PixiSceneTravelRange
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
  | PixiSceneLoopingTranslation
  | PixiSceneOpacityPulse
  | PixiSceneOpacityTwinkle
  | PixiScenePivotRotation
  | PixiScenePixelOscillation
  | PixiSceneTranslation
  | PixiSceneVisibilityCycle

export interface PixiSceneLayerDefinition {
  readonly attachmentId?: string
  readonly channel?: string
  readonly id: string
  readonly maskSource?: string
  readonly motion?: PixiSceneMotion
  readonly motions?: readonly PixiSceneMotion[]
  readonly opacity?: number
  readonly parentAttachmentId?: string
  readonly position?: PixiScenePoint
  readonly repeat?: 'horizontal'
  readonly rotationDegrees?: number
  readonly source: string
  readonly statePixelPush?: PixiSceneStatePixelPush
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
  readonly pixelPushProgress?: number
  readonly visible?: boolean
}

export interface PixiLayerSceneState {
  readonly animationEnabled: boolean
  readonly channels?: Readonly<Record<string, PixiSceneChannelState>>
}
