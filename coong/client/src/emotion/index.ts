import {createDirective} from '@winter-love/emotion'
import createEmotion, {Emotion} from '@emotion/css/create-instance'
import {App, Directive, h, resolveDirective, withDirectives} from 'vue'
import {DesignSystemProperties} from 'src/design-system'

export type {Emotion}

export const DIRECTIVE_EMOTION_NAME = 'emotion'

export type PluginInstallFunction = (app: App, ...options: any[]) => any

export interface CreateEmotionPluginReturn {
  emotion: Emotion
  install: PluginInstallFunction
}

const createEmotionPlugin = (): CreateEmotionPluginReturn => {
  const emotion = createEmotion({key: 'css'})
  return {
    emotion,
    install: (app) => {
      const emotionDirective = createDirective(emotion, {})
      app.directive(DIRECTIVE_EMOTION_NAME, emotionDirective as any)
    },
  }
}

export const useDirectiveEmotion = (): Directive<any, DesignSystemProperties> =>
  resolveDirective(DIRECTIVE_EMOTION_NAME) ?? (() => null)

export const useCreateEmotionNode = (): typeof h => {
  const emotion = useDirectiveEmotion()

  return (element, props, child?: any) => {
    if (typeof props === 'object' && !Array.isArray(props) && props.$emotion) {
      const {$emotion, ...newProps} = props
      return withDirectives(h(element, newProps, child), [[emotion, $emotion]])
    }
    return h(element, props, child)
  }
}

export default createEmotionPlugin
