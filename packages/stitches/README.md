# Stitches for Vue3 / vue2 composition-api

[Winter Love packages document](https://winter-love.github.io/web/)

## Plugin

```typescript
import {createStitchesPlugin} from '@winter-love/stitches'
import {createApp} from 'vue'
import App from './App.vue'

const stitches = createStitchesPlugin({
  media: {
    bp1: '(min-width: 640px)',
    bp2: '(min-width: 768px)',
    bp3: '(min-width: 1024px)',
  },
  theme: {
    colors: {
      red1: 'rgb(253,37,37)',
    },
  },
})

const app = createApp(App)

app.use(stitches)
app.mount("#app")

```


## Directive 

```typescript
import {createCreateDirective} from '@winter-love/stitches'
import {defineComponent, h, withDirectives} from 'vue'

const createDirective = createCreateDirective({
  media: {
    bp1: '(min-width: 640px)',
    bp2: '(min-width: 768px)',
    bp3: '(min-width: 1024px)',
  },
  theme: {
    colors: {
      red1: 'rgb(253,37,37)',
    },
  },
})

const directive = createDirective()

const Box = defineComponent({
  name: 'Box',
  setup() {
    return () => (
      withDirectives(h('div'), [[directive, {color: '$red1'}]])
    )
  }
})
```

## Styled

```typescript
import {createStyled} from '@winter-love/stitches'

const {styled, createDirective} = createStyled({
  media: {
    bp1: '(min-width: 640px)',
    bp2: '(min-width: 768px)',
    bp3: '(min-width: 1024px)',
  },
  theme: {
    colors: {
      red1: 'rgb(253,37,37)',
    },
  },
})

const Box = styeld('div', {name: 'BoX'}, {
  color: '$red1'
})
```
