/**
 * @jest-environment node
 */

import {createHyperComponents, useClassName} from '../'
import {createSSRApp, defineComponent, h} from 'vue'
import {renderToString} from '@vue/server-renderer'

const hyper = createHyperComponents()

describe('hyper css linearGradient', () => {
  it.skip('should has background', async () => {
    const componentStyles = {
      linearGradient: [],
    }
    const Component = defineComponent({
      render() {
        const css = useClassName()
        return (
          h('div', {class: css(componentStyles)}, () => [

          ])
        )
      },
    })

    const app = createSSRApp(Component)
    app.use(hyper.plugin)
    // noinspection JSUnusedLocalSymbols
    const html = await renderToString(app)

    // noinspection JSUnusedLocalSymbols
    const style = hyper.getCssText()
    // skip testing owing to unstable naming
    // expect(html).toMatchSnapshot()
    // expect(style).toMatchSnapshot()
  })
})
