import createEmotionOriginal from '@emotion/css/create-instance'
import {h} from 'vue'
import {createStyled} from '../create-styled'

const styled = createStyled(createEmotionOriginal({key: 'css'}))

const StyledComponent = styled('div', {
  name: 'foo',
  props: {
    color: {type: String},
    height: {default: '100px', type: String},
    width: {type: String},
  },
})(
  {
    color: 'red',
  },
  ({width}) => {
    return {
      width,
    }
  },
  ({height}) => {
    return {
      height,
    }
  },
)

export default {
  title: 'emotion/styled',
}

export const Default = () => ({
  setup() {
    return () => {
      return (
        h(StyledComponent, {}, () => 'styled-component')
      )
    }
  },
})
