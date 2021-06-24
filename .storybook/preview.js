import {createEmotion} from '@winter-love/emotion'
import {theme} from 'src/theme'
import {app} from '@storybook/vue3'

const emotion = createEmotion({theme})

app.use(emotion)

export const decorators = [
  (story) => ({
    components: {story}, template: '<story/>',
  })]
export const parameters = {
  actions: {argTypesRegex: '^on[A-Z].*'}, controls: {
    matchers: {
      color: /(background|color)$/i, date: /Date$/,
    },
  },
}
