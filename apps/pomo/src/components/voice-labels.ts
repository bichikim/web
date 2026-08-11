import type {SupertonicVoiceGender} from '../features/supertonic'

export const getVoiceGenderLabel = (gender: SupertonicVoiceGender) => {
  switch (gender) {
    case 'female':
      return '여성'
    case 'male':
      return '남성'
    case 'neutral':
      return 'Pomo 기본'
    default: {
      const exhaustiveGender: never = gender
      return exhaustiveGender
    }
  }
}
