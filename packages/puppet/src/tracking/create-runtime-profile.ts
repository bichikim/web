import type {PuppetDocument} from '../player'
import {DEFAULT_MOUTH_SETTINGS} from './mouth-calibration'
import {getTrackingRange} from './tracking-inputs'
import type {ParameterMapping, RuntimeProfile, TrackingInput} from './types'

const SUGGESTED_INPUTS: Readonly<Record<string, TrackingInput>> = {
  'brow-left-height': 'browLeft',
  'brow-right-height': 'browRight',
  'eye-close-left': 'eyeBlinkLeft',
  'eye-close-right': 'eyeBlinkRight',
  'face-x': 'faceYaw',
  'face-y': 'facePitch',
  'face-z': 'faceRoll',
  'mouth-open': 'mouthOpen',
  'mouth-round': 'mouthRound',
  'mouth-smile': 'mouthSmile',
  'mouth-spread': 'mouthSpread',
  ParamAngleX: 'faceYaw',
  ParamAngleY: 'facePitch',
  ParamAngleZ: 'faceRoll',
  ParamEyeLOpen: 'eyeBlinkLeft',
  ParamEyeROpen: 'eyeBlinkRight',
  ParamMouthForm: 'mouthSmile',
  ParamMouthOpenY: 'mouthOpen',
}
/** Creates deterministic model identification and editable mapping suggestions. */
export const createRuntimeProfile = (document: PuppetDocument): RuntimeProfile => ({
  expressions: [],
  mappings: (document.parameters ?? []).flatMap((parameter): ParameterMapping[] => {
    const input = SUGGESTED_INPUTS[parameter.id]
    if (input === undefined) {
      return []
    }
    const range = getTrackingRange(input)
    const eyeOpen = parameter.id === 'ParamEyeLOpen' || parameter.id === 'ParamEyeROpen'
    return [
      {
        enabled: input === 'mouthRound' || input === 'mouthSpread',
        input,
        inputMaximum: range[1],
        inputMinimum: range[0],
        outputMaximum: eyeOpen ? parameter.minimum : parameter.maximum,
        outputMinimum: eyeOpen
          ? parameter.maximum
          : range[0] === 0
            ? parameter.defaultValue
            : parameter.minimum,
        parameterId: parameter.id,
        smoothing: 0.08,
      },
    ]
  }),
  motions: document.motions.map((motion) => ({key: '', motionId: motion.id})),
  mouth: DEFAULT_MOUTH_SETTINGS,
  signature: JSON.stringify({
    parameters: document.parameters?.map((parameter) => [
      parameter.id,
      parameter.minimum,
      parameter.maximum,
    ]),
    parts: document.parts.map((part) => part.id),
  }),
  version: 2,
})
