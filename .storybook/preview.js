import {app} from '@storybook/vue3'
import {createHyperComponents} from '@winter-love/hyper-components'
import {Quasar} from 'quasar'
import 'quasar/dist/quasar.prod.css'

const hyperComponents = createHyperComponents({
  variants: {},
})

app.use(hyperComponents.plugin)
app.use(Quasar, {
  config: {
    brand: {
      darkBG: '#151515',
      primary: '#151515',
      sunshine: '#f4f4f4',
      whiteField: '#E2E1E1',
    },
    globalProperties: {},
    screen: {
      bodyClasses: true,
    },
  },
})

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
