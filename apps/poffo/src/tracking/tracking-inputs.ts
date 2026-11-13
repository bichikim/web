import type {MappingInput} from './types'

export const TRACKING_LABELS: Readonly<Record<MappingInput, string>> = {
  browLeft: '왼쪽 눈썹',
  browRight: '오른쪽 눈썹',
  buttonValue: '버튼 입력',
  eyeBlinkLeft: '왼쪽 눈 감김',
  eyeBlinkRight: '오른쪽 눈 감김',
  facePitch: '고개 위아래',
  faceRoll: '고개 기울기',
  faceYaw: '고개 좌우',
  manualValue: '수동 입력',
  mouthOpen: '입 벌림',
  mouthRound: '입술 오므림',
  mouthSmile: '미소',
  mouthSpread: '입 가로 벌림',
}
const FACE_RANGE = 30
export const getTrackingRange = (input: MappingInput): readonly [number, number] =>
  input.startsWith('face') || input.startsWith('brow')
    ? input.startsWith('face')
      ? [-FACE_RANGE, FACE_RANGE]
      : [-1, 1]
    : [0, 1]

export const getInputNode = (input: MappingInput) =>
  input.startsWith('manualValue')
    ? 'manual'
    : input.startsWith('buttonValue')
      ? 'button'
      : 'tracking'

export const getInputGroup = (input: MappingInput) => {
  if (input.startsWith('manualValue') || input.startsWith('buttonValue')) {
    return '수동·버튼'
  }
  if (input.startsWith('mouth')) {
    return '입'
  }
  if (input.startsWith('eye')) {
    return '눈'
  }
  return '고개·눈썹'
}

export const getInputLabel = (input: MappingInput) =>
  TRACKING_LABELS[input] ?? (input.startsWith('manualValue') ? '수동 입력' : '버튼 입력')
