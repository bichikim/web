import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'

import type {PrimaryMoodId} from '../text-mood/labels'

export const localizeErrorMessage = (message: string, englishFallback: string) =>
  getLocale() === 'en' && /[가-힣]/u.test(message) ? englishFallback : message

export const localizeImageGenerationProgress = (message: string): string => {
  if (getLocale() !== 'en') {
    return message
  }

  switch (message) {
    case '모델 다운로드를 준비하고 있어요':
      return m.picture_diary_generation_prepare_download()
    case '프롬프트 모델을 준비하고 있어요':
      return m.picture_diary_generation_prepare_prompt_model()
    case '이미지 생성을 위한 프롬프트를 준비하고 있어요':
      return m.picture_diary_generation_prepare_prompt()
    case 'Bonsai Image 4B를 준비하고 있어요…':
    case '이미지 모델을 준비하고 있어요':
      return m.picture_diary_generation_prepare_image_model()
    default: {
      const generating = /^이미지 생성 중 · (?<completed>\d+)\/(?<total>\d+)$/u.exec(message)
      if (generating?.groups === undefined) {
        return message
      }

      return m.picture_diary_generation_generating({
        completed: Number(generating.groups.completed),
        total: Number(generating.groups.total),
      })
    }
  }
}

export const getLocalizedPrimaryMoodLabel = (id: PrimaryMoodId) => {
  switch (id) {
    case 'cheerful':
      return m.dialogue_mood_cheerful()
    case 'calm':
      return m.dialogue_mood_calm()
    case 'warm':
      return m.dialogue_mood_warm()
    case 'hopeful':
      return m.dialogue_mood_hopeful()
    case 'dreamlike':
      return m.dialogue_mood_dreamlike()
    case 'awe':
      return m.dialogue_mood_awe()
    case 'nostalgic':
      return m.dialogue_mood_nostalgic()
    case 'sad':
      return m.dialogue_mood_sad()
    case 'anxious':
      return m.dialogue_mood_anxious()
    case 'fearful':
      return m.dialogue_mood_fearful()
    case 'angry':
      return m.dialogue_mood_angry()
    case 'neutral':
      return m.dialogue_mood_neutral()
  }
}
