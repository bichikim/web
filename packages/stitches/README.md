# Stitches for Vue3 / vue2 composition-api

[Winter Love packages document](https://winter-love.github.io/web/)

## Directive 

```typescript
import {createDirective} from '@winter-love/stitches'
import {createStitches} from '@stitches/core'
import {defineComponent, h, withDirectives} from 'vue'

const stitches = createStitches({
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

const directive = createDirective(stitches)

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
import {createStitches} from '@stitches/core'

const stitches = createStitches({
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

const styled = createStyled(stitches)

const Box = styeld('div', {name: 'BoX'}, {
  color: '$red1'
})
```
