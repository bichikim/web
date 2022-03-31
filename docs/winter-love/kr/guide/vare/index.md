# Vare

## Vare 는 무엇이고 왜 사용 하여야 하나요?

1. Vuex, Pinia 보다 더욱 작성하기 쉬우며 읽기 쉽습니다.
2. 왜 쉽냐고요? 저장소 선언 방법이 VUE 컴포넌트와 같습니다. 모든 composition api 를 상태 저장소 생성에 사용하세요.
3. 더 이상 `this` 를 사용하지 않습니다.
4. SSR 을 지원 합니다.

### 상태 저장소 생성
```typescript
import {createStore} from 'vare'
import {defineComponent, toRefs, computed, watch} from 'vue'

const useData = createStore({
  name: 'data',
  setup: () => {
    const name = ref('foo')
    const age = ref(10)
    const isChanged = ref(false)

    const increaseAge = () => {
      age.value += 1
    }

    watch([name, age], () => {
      isChanged.value = true
    })

    const nameAndAge = computed(() => {
      return `${name.value} ${age.value}`
    })

    return {
      increaseAge,
      nameAndAge,
      isChanged,
      name,
      age,
    }
  }
})
```

### 컴포넌트에서 저장소 사용
```typescript
const Component = defineComponent({
  name: 'Component',
  setup: () => {
    // 만든 저장소를 사용합니다
    const data = useData()
    const {name, age, increaseAge, nameAndAge, isChanged} = toRefs(data)

    return {
      name,
      age,
      nameAndAge,
      increaseAge,
      isChanged,
    }
  },
  template: `
    <div>
      <div>{{ name }}</div>
      <div>{{ age }}</div>
      <div>{{ nameAndAge }}</div>
      <div>{{ isChanged }}</div>
      <button @click="increaseAge">increaseAge</button>
    </div>
  `
})
````

## 설치하기

- npm
```bash
npm add vare@latest
```

- yarn
```bash
yarn add vare@latest
```

- pnpm
```bash
pnpm add vare@latest
```
- install plugin
```typescript
import {createApp, defineComponent, h} from 'vue'
import {createVareStore} from 'vare'
const Root = defineComponent({
  name: 'Root',
  setup: () => (() => h('div'))
})
const app = createApp(Root)

// create vare plugin
const vare = createVareStore()

// 사용 등록
app.use(vare)

```

## Props 가 있는 상태 저장소 생성

```typescript
import {createStore} from 'vare'
import {defineComponent, toRefs, computed, toRefs} from 'vue'

// 저장소
const useUser = createStore({
  name: 'data',
  props: {
    url: {type: String},
  },
  setup: (props) => {
    const {url: urlRef} = toRefs(props)
    const url = computed(() => (url.value ?? 'https://coong.io'))
    const name = ref('foo')
    const age = ref(10)

    const increaseAge = () => {
      age.value += 1
    }

    const nameAndAge = computed(() => {
      return `${name.value} ${age.value}`
    })

    return {
      url,
      increaseAge,
      nameAndAge,
      name,
      age,
    }
  }
})
```
