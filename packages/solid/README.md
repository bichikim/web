# Solid js utils


Use hooks 
```ts 
import {watch} from '@winter-love/solid/use'
```

Use testing utils

```tsx
import {render} from '@winter-love/solid/test'
import {describe} from 'vitest'

const Foo = () => <span>hello</span>

describe('Component', () => {
  it('should render hello text', () => {
    const wrapper = render(() => <Foo />)
    
    expect(wrapper.text).toBe('hello')
  })
})
```

Use Components
```tsx
import {createImg} from '@winter-love/solid/components'

const WImg = createImg({sizeUrl: ({src, width, height}) => `/${src}?width=${width}&height=${height}`})

export const SomePage = () => {
  return (
    <div>
      <span>Funny img</span>
      <WImg width={[30, 50, 100]} src="/imgs/funny-img.png" />
    </div>
  )
}
```