// import {createEmotion} from '@winter-love/emotion'
// import {theme} from 'src/theme'
import {app} from '@storybook/vue3'
import {createHyperComponents} from '@winter-love/hyper-components'
import 'quasar/dist/quasar.prod.css'

const hyperComponents = createHyperComponents({
  variants: {},
})

app.use(hyperComponents.plugin)

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
  docs: {
  },
  viewMode: 'docs',
}
