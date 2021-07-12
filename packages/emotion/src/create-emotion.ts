import {Options as OriginalEmotionOptions} from '@emotion/cache'
import createEmotionOriginal, {Emotion as _Emotion, CSSObject} from '@emotion/css/create-instance'
import {Plugin} from 'vue-demi'
import {EMOTION_CACHE_CONTEXT} from './cache'
import {createStyled} from './create-styled'
import {createDirective} from './directive'
import {EMOTION_THEME_CONTEXT, Theme} from './theme'

export interface EmotionExtend extends _Emotion {
  styled: ReturnType<typeof createStyled>
}

export interface EmotionPluginOptions {
  directiveSystem?: (props: any) => any
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
  const {
    theme,
    key = 'css',
    directiveSystem,
    ...restOptions
  } = options

  const emotion = createEmotionOriginal({...restOptions, key})

  const styled = createStyled({...emotion, theme})

  const directive = createDirective(emotion)

  directive.setTheme(theme)
  directive.setSystem(directiveSystem)

  return {
    ...emotion,
    install: (app, options: EmotionPluginOptions = {}) => {
      const {theme: _theme = theme, directiveSystem} = options
      app.provide(EMOTION_CACHE_CONTEXT, emotion.cache)

      // provide theme if the options have it
      if (_theme) {
        app.provide(EMOTION_THEME_CONTEXT, _theme)
        directive.setTheme(_theme)
        directive.setSystem(directiveSystem)
        app.directive('emotion', directive)
      }
    },
    styled,
  }
}

export {CSSObject}
