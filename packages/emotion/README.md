# Emotion Styled for Vue3 / vue2 composition-api

## Styled 

```typescript
import {createStyled} from '@winter-love/emotion'
import createEmotionOriginal from '@emotion/css/create-instance'

const styled = createStyled(createEmotionOriginal({key: 'css'}))
// vue component
const StyledComponent = styled(element, {
  props: {
    color: {type: String},
  },
})(
  {
    backgroundColor: 'red',
  },
  (props) => {
    return {
      color: props.color,
    }
  },
)
```

## All of Emotion

```typescript
import {createEmotion} from '@winter-love/emotion'

const {
  styled,
  css,
  cx,
  flush,
  hydrate,
  injectGlobal,
  keyframes,
  sheet,
  cache,
  marge,
  getRegisteredStyles,
} = createEmotion({key: 'css'})

```
