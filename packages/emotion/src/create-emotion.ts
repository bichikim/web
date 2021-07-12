import {Options as OriginalEmotionOptions} from '@emotion/cache'
import createEmotionOriginal, {Emotion as _Emotion, CSSObject} from '@emotion/css/create-instance'
import {Plugin} from 'vue-demi'
import {EMOTION_THEME_CONTEXT, Theme} from './theme'
import {EMOTION_CACHE_CONTEXT} from './cache'
import {createStyled} from './create-styled'
import {createDirective} from './directive'

export interface EmotionExtend extends _Emotion {
  styled: ReturnType<typeof createStyled>
}

export interface EmotionPluginOptions {
  system?: (props: any) => any
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
  // eslint-disable-next-line object-curly-newline
  const {theme, key = 'css', system, ...restOptions} = options

  const emotion = createEmotionOriginal({...restOptions, key})

  const styled = createStyled({...emotion, theme})

  const directive = createDirective(emotion)

  directive.setTheme(theme)
  directive.setSystem(system)

  return {
    ...emotion,
    install: (app, options: EmotionPluginOptions = {}) => {
      const {theme: _theme = theme, system} = options
      app.provide(EMOTION_CACHE_CONTEXT, emotion.cache)

      // provide theme if the options have it
      if (_theme) {
        app.provide(EMOTION_THEME_CONTEXT, _theme)
        directive.setTheme(_theme)
        directive.setSystem(system)
        app.directive('emotion', directive)
      }
    },
    styled,
  }
}

export {CSSObject}
