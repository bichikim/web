# Emotion Styled for Vue3 / vue2 composition-api

[Winter Love packages document](https://winter-love.github.io/web/)

## warning 
이 라이브러리는 시간 제약으로 인해 관리 되고 있지 않습니다 
지금은 @winter-love/stitches 를 관리 하고 있습니다

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
