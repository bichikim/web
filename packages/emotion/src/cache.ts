import {EmotionCache} from '@emotion/css/create-instance'
import {InjectionKey} from 'vue'

export const EMOTION_CACHE_CONTEXT: InjectionKey<EmotionCache> = Symbol('emotion-cash')
