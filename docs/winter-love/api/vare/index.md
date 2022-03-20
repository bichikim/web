# Vare

## Vare 는 무엇인가요?

Vuex, Pinia 보다 더욱 작성하기 쉬우며 읽기 쉽습니다.
왜 쉽냐고요? 저장소 선언 방법이 VUE 컴포넌트와 같습니다.

```typescript
import {createStore} from 'vare'
import {defineComponent, toRefs, computed} from 'vue'

// 저장소
const useData = createStore({
  name: 'data',
  setup: () => {
    const name = ref('foo')
    const age = ref(10)
    
    const increaseAge = () => {
      age.value += 1
    }
    
    const nameAndAge = computed(() => {
      return `${name.value} ${age.value}`
    })

    return {
      increaseAge,
      nameAndAge,
      name,
      age,
    }
  }
})

// 컴포넌트
const Component = defineComponent({
  name: 'Component',
  setup: () => {
    // 만든 저장소를 사용합니다
    const data = useData()
    const {name, age, increaseAge, nameAndAge} = toRefs(data)

    return {
      name,
      age,
      nameAndAge,
      increaseAge,
    }
  },
  template: `
    <div>
      <div>{{ name }}</div>
      <div>{{ age }}</div>
      <div>{{ nameAndAge }}</div>
      <button @click="increaseAge">increaseAge</button>
    </div>
  `
})

```

## 설치하기

```bash
npm add vare@latest
```

```bash
yarn add vare@latest
```

```bash
pnpm add vare@latest
```

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

## Props 함께사용 하기

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
