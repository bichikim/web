/**
 * @jest-environment node
 */

import {createHyperComponents, useClassName} from '../'
import {createSSRApp, defineComponent, h} from 'vue'
import {renderToString} from '@vue/server-renderer'

const hyper = createHyperComponents()

describe('hyper css linearGradient', () => {
  it('should has background', async () => {
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
    const html = await renderToString(app)

    const style = hyper.getCssText()
    expect(html).toMatchSnapshot()
    expect(style).toMatchSnapshot()
  })
})
