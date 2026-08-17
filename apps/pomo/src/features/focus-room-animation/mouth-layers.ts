import {P_VISEMES, type PViseme} from '../lip-sync'
import type {PixiSceneLayerDefinition, PixiScenePoint} from './layer-scene'
import {FOCUS_ROOM_MOUTH_CHANNELS} from './scene-catalog-channels'

export type PVisemeSources = Readonly<Partial<Record<PViseme, string>>>

export interface CreateMouthLayersOptions {
  readonly parentAttachmentId: string
  readonly position: PixiScenePoint
  readonly rotationDegrees?: number
  readonly sources: PVisemeSources
}

/** Creates mutually exclusive cropped mouth layers that inherit the current head transform. */
export const createMouthLayers = (
  options: CreateMouthLayersOptions,
): ReadonlyArray<PixiSceneLayerDefinition> =>
  P_VISEMES.flatMap((viseme) => {
    const source = options.sources[viseme]

    return source === undefined
      ? []
      : [
          {
            channel: FOCUS_ROOM_MOUTH_CHANNELS[viseme],
            id: `mouth-${viseme}`,
            parentAttachmentId: options.parentAttachmentId,
            position: options.position,
            rotationDegrees: options.rotationDegrees,
            source,
            visible: false,
          },
        ]
  })
