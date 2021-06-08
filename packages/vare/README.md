# Vare

Vue Share State for Vue components

## What is this?

Vare works like Vuex.

However, Vare is less painful to create a Store than Vuex.

## Use Vare with Vue (Vue 3.0 or Vue 2 with @vue/composition-api) 

```typescript

import {state} from './src/index'
import {defineComponent, h} from 'vue'

export const myState = state({
  name: 'foo',
})

export const FooComponent = defineComponent(() => {
  return () => {
    return h('span', myState.name)
  }
})

```

## State

### An object initState
```typescript
import {state} from './src/index'
import {defineComponent, h} from 'vue'

const myState = state({
  name: 'foo',
})

// using state in a components
export const FooComponent = defineComponent(() => {
  return () => {
    return h('span', myState.name)
  }
})
```

### A function initState
```typescript
import {state} from './src/index'
import {defineComponent, h} from 'vue'

const myState = state(() => ({
  name: 'foo',
}))

// using state in a components
export const FooComponent = defineComponent(() => {
  return () => {
    return h('span', myState.name)
  }
})
```

### A getter setter initState
```typescript
import {state} from './src/index'
import {defineComponent, h} from 'vue'

const nameSetSpy = jest.fn()
const nameGetSpy = jest.fn()

const myState = state(() => {
  let _name = 'foo'
  return {
    get name(): string {
      nameGetSpy(_name)
      return _name
    },
    set name(value: string) {
      nameSetSpy(value)
      _name = value
    },
    deep: {
      get name(): string {
        return _name
      },
      set name(value: string) {
        _name = value
      }
    }
  }
})


// using state in a components
export const FooComponent = defineComponent(() => {
  return () => {
    return h('div', [
      h('span', myState.name),
      h('span', myState.deep.name),
    ])
  }
})
```

## Mutation

```typescript
import {state, mutate} from './src/index'
import {defineComponent, h} from 'vue'

const myState = state({
  name: 'foo',
})

// mutation like Vuex Mutation
const setName = mutate((name: string) => {
  myState.name = name
})

// using state in a components
export const FooComponent = defineComponent(() => {
  return () => {
    return h('div', [
      h('span', myState.name),
      h('button', {onclick: () => setName('bar')}, 'click')
    ])
  }
})

```

## Action

store/profile.ts
```typescript
import {state, mutate, act} from './src/index'
import {h} from 'vue'

const myState = state({
  name: 'foo',
})

// mutation like Vuex Mutation
export const setName = mutate((name: string) => {
  myState.name = name
})

// action like Vuex Action
export const requestName = act((name: string) => {
  return Promise.resolve().then(() => {
    setName(name)
  })
})

export const FooComponent = defineComponent(() => {
  const name = computed(() => (myState.name))

  return () => {
    return h('div', [
      h('span', name.value),
      h('button', {onclick: () => requestName('bar')}, 'click')
    ])
  }
})
```

## Compute (Getter)

store/profile.ts
```typescript
import {state, compute, mutate} from './src/index'
import {Ref, h, defineComponent, computed, ref} from 'vue'

const myState = state({
  name: 'foo',
})

// mutation like Vuex Mutation
export const setName = mutate((name: string) => {
  myState.name = name
})

export const getDecoName = compute(() => (`~~${myState.name}~~`))

export const getCustomDecoName = compute((deco: string) => `${deco}${myState.name}${deco}`)

export const getReactiveCustomDecoName = compute((deco: Ref<string>) => {
  return `${deco.value}${myState.name}${deco.value}`
})

export const FooComponent = defineComponent(() => {
  const decoName = getDecoName()
  const customDecoName = getCustomDecoName('++')
  const customDeco = ref('--')
  const customReactiveDecoName = getReactiveCustomDecoName(customDeco)

  function handleInput(event) {
    customDeco.value = event.target.value
  }

  return () => {
    return h('div',
      h(Fragment, [
        h('span', decoName.value), // ~~foo~~
        h('span', customDecoName.value), // ++foo++
        h('input', {onInput: handleInput, value: customDeco.value}), // --foo--
        h('button', {onclick: () => setName('bar')}, 'click')
      ])
    )
  }
})
```

## Subscribe

```typescript
import {state, mutate, act, subscribe} from './src/index'
import {h} from 'vue'

const myState = state({
  name: 'foo',
})

// mutation like Vuex Mutation
export const setName = mutate((name: string) => {
  myState.name = name
})

// action like Vuex Action
export const requestName = act((name: string) => {
  return Promise.resolve().then(() => {
    setName(name)
  })
})

export const getDecoName = compute(() => (`~~${myState.name}~~`))()

const hook = () => {
  // any
}

const stopMyState = subscribe(myState, hook)

const stopMyStateName = subscribe(myState.name, hook)

const stopSetName = subscribe(setName, hook)

const stopRequestName = subscribe(requestName, hook)

const stopGetDecoName = subscribe(getDecoName, hook)

// unsubscribe
stopMyState()
stopSetName()
stopMyStateName()
stopRequestName()
stopGetDecoName()

```

## Naming (for devtool)

```typescript
import {state, compute, mutate, getName} from './src/index'

const foo = state({
  name: 'foo'
}, 'foo')

const getFooName = compute(() => (foo.name), 'getFooName')
const setFooName = mutate((name: string) => {
  foo.name = name
}, 'setFooName')

getName(foo) // foo
getName(getFooName) // getFooName
getName(setFooName) // setFooName

```

Are you sick of naming? 

Try to make a tree!
```typescript
import {state, compute, mutate, getName, act} from './src/index'

const foo = state({
  age: 999
})

export const computations = compute({
  getAge: () => (foo.age)
})

export const mutations = mutate({
  setAge: (age: number) => {
    foo.age = age
  }
})

export const actions = act({
  updateAge: (age: number) => {
    return Promise.resolve().then(() => {
      mutations.setAge(age)
    })
  }
})

const tree = {
  state: foo,
  ...computations,
  ...mutations,
  ...actions,
}

const age = tree.getAge() // 99
tree.setAge(0)
getName(tree.getAge) // 'getAge'
getName(tree.setAge) // 'setAge'
getName(tree.updateAge) // 'updateAge'

```

## Relating (for devtool)
```typescript
import {state, compute, mutate, getName, act} from './src/index'

const foo = state({
  age: 999
})

const bar = state({
  name: 'bar'
})

// state = foo
export const getAge = compute(foo, (state) => state.age)

export const computations = compute(foo, {
  // state = foo
  getAge: (state) => (state.age)
})

// state = foo
export const setAge = mutate(foo, (state) => (state.age = age))

// state = foo
export const mutations = mutate(foo, {
  setAge: (state, age: number) => {
    state.age = age
  }
})

// _ = foo
export const updateAge = act(foo, (_, age: number) => {
  return Promise.resolve().then(() => {
    setAge(age)
  })
})

export const actions = act(foo, {
  // _ = foo
  updateAge: (_, age: number) => {
    return Promise.resolve().then(() => {
      mutations.setAge(age)
    })
  }
})

export const multiGetAge = compute([foo, bar], ([foo, bar]) => (`${bar.name} ${foo.age}`))

export const multiComputations = compute([foo, bar], {
  getAge: ([foo, bar]) => (`${bar.name} ${foo.age}`)
})

export const multiSetAge = mutate([foo, bar], ([foo], age: number) => (foo.age = age))

export const multiMutations = mutate([foo, bar], {
  setAge: ([foo], age: number) => {
    foo.age = age
  }
})

export const multiUpdateAge = act([foo, bar], (_, age: number) => {
  return Promise.resolve().then(() => {
    multiSetAge(age)
  })
})

export const multiActions = act([foo, bar], {
  updateAge: (_, age: number) => {
    return Promise.resolve().then(() => {
      multiSetAge(age)
    })
  }
})

```

## Uses a state locally
```typescript
import {state, mutate} from './src/index'
import {defineComponent, h} from 'vue'

const useMyState = (name: string = 'foo') => {
  const _state = state({
    name,
    deep: {
      name,
    }
  })
  
  const setDeepName = (value: string) => {
    _state.deep.name = value
  }
  
  return {
    state: _state,
    setDeepName,
    ...mutate({
      setName: (value: string) => {
        _state.name = value
      }
    })
    // ... any thing you want
  }
}

export const FooComponent = defineComponent(() => {
  const myState = useMyState('bar')
  return () => {
    return (
      h('div', [
        h('span', myState.name),
        h('span', myState.deep.name),
        h('button', {onclick: () => myState.setName('foo')}, 'the name is foo')
      ])
    )
  }
})

```

## Why 

Share state wherever you want

Recoil x Vuex x Immer

### Recoil


```typescript
function App() {
  return (
    h(RecoilRoot, null,
      h(FooComponent),
      h(BarComponent)
    )
  )
}

// ....

const _state = atom({
  key: '...',
  default: {name: 'foo'}
})

const foo = selector({
  key: '...',
  get: ({get}) => {
    return get(_state).name
  },
  set: ({set, get}, name) => {
    set(_state, {
      ...get(_state),
      name,
    })
  }
})

function FooComponent() {
  const state = useRecoilValue(_state)
  
  return (
    h('div', null, state.foo)
  )
}

function BarComponent() {
  const setState = useSetRecoilState(foo)

  return (
    h('div', {onClick: () => setState('bar')})
  )
}

```
In the vare way
```typescript
// no need a context

const myState = state({
  name: 'foo',
})


const getName = compute(() => myState.name)

const setName = mutate((name: string) => {
  myState.foo = name
})

const App = defineComponent(() => {
  return () => h('div', [
    h(FooComponent),
    h(BarComponent)
  ])
})

const FooComponent = defineComponent(() => {
  const name = getName()
  
  return () => (
    h('div', name.value)
  )
})

const BarComponent = defineComponent(() => {
  return () => {
    h('div', {onclick: () => setName('bar')})
  }
})

```

### Immer 

```typescript
const myState = {
  foo: 'foo'
}

produce(myState, (draft) => {
  draft.foo = 'bar'
})

```

In the Vare way
```typescript
const myState = state({
  foo: 'foo',
})

myState.foo = 'bar'
```

### Vuex

```typescript
import {createStore} from 'vuex'

const store = createStore({
  state () {
    return {
      count: 0
    }
  },
  mutations: {
    increment: (state) => {
      state.count++
    }
  },
  actions: {
    request: () => {
      store.commit('increment')
    },
  },
  getters: {
    getCount: (state) => {
      return state.count
    },
  }
})

// need to setup
app.use(store)

const FooComponent = defineComponent(() => {
  const store = useStore()

  return () => (
    h('div', [
      h('div', store.state.count),
      h('a', {onClick: () => store.commit('increment')}),
    ])
  )
})
```

In the Vare way
```typescript
import {mutate, state, act, compute} from './src/index'
// no need to setup

const myState = state({
  count: 0,
})

const mutations = mutate(myState, {
  increment: (state) => {
    state.count++
  }
})

const actions = act({
  request: () => {
    mutations.increment()
  }
})

const computations = compute(myState, {
  getCount: (state) => (state.count) 
})

const store = {
  state: myState,
  ...mutations,
  ...actions,
  ...computations,
}

const FooComponent = defineComponent(() => {
  const count = computed(() => (store.state.count))

  return () => (
    h('div', [
      h('div', count.value),
      h('a', {onClick: store.increment}),
    ])
  )
})
```

## Create the pack in easy way (WIP)


## Supporting Vue DevTool ?

Yes!

![devtool](./media/devtool.PNG)
![devtool](./media/devtool1.PNG)
![devtool](./media/devtool2.PNG)
