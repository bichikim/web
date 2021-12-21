import {createStyled} from '../'
import {renderToString} from '@vue/server-renderer'
import {createSSRApp, h} from 'vue-demi'

describe('create-styled', () => {
  it('should reload', async () => {
    const {styled, toString} = createStyled({
      theme: {},
    })

    const Component = styled('div')

    const app = createSSRApp({
      setup() {
        return () => (
          h(Component)
        )
      },
    })

    await renderToString(app)

    expect(toString()).toMatchSnapshot()
  })
})
