import createEmotionOriginal, {
  Emotion as _Emotion,
  Options as OriginalEmotionOptions,
} from '@emotion/css/create-instance'
import {Plugin} from 'vue'
import {EMOTION_CACHE_CONTEXT} from './cache'
import {createStyled} from './create-styled'
import {EMOTION_THEME_CONTEXT, Theme} from './theme'
export {CSSObject} from '@emotion/css/create-instance'

export interface EmotionExtend extends _Emotion {
  styled: ReturnType<typeof createStyled>
}

export interface EmotionPluginOptions {
  theme?: Theme
}

export interface EmotionOptions extends Omit<OriginalEmotionOptions, 'key'>, EmotionPluginOptions {
  key?: string
}

export type EmotionPlugin = Plugin & EmotionExtend

/**
 * creates emotion members & the styled function
 * @param options
 */
export const createEmotion = (options: EmotionOptions = {}): EmotionPlugin => {
  const {theme, key = 'css', ...restOptions} = options

  const emotion = createEmotionOriginal({...restOptions, key})

  const styled = createStyled({...emotion, theme})

  return {
    ...emotion,
    install: (app, options: EmotionPluginOptions = {}) => {
      const {theme: _theme = theme} = options
      app.provide(EMOTION_CACHE_CONTEXT, emotion.cache)

      // provide theme if the options have it
      if (_theme) {
        app.provide(EMOTION_THEME_CONTEXT, _theme)
      }
    },
    styled,
  }
}
