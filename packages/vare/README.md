# Vare

Vue Share State Library

## Use Vare with Vue (Vue 3.0 or Vue 2 with @vue/composition-api) 

```typescript
import {atom} from 'vare'
import {defineComponent, h} from 'vue'

export const myState = atom({
  name: 'foo',
})

export const FooComponent = defineComponent(() => {
  return () => {
    return h('span', myState.name)
  }
})

```

## Atom (Recommended)

### Atom with an object initState
```typescript
import {atom} from 'vare'
import {defineComponent, h} from 'vue'

export const myState = atom({
  myName: 'foo',
})

export const FooComponent = defineComponent(() => {
  return () => {
    return h('span', myState.myName)
  }
})
```

### Atom with a function initState
```typescript
import {atom} from 'vare'
import {defineComponent, h} from 'vue'

const myState = atom(() => ({
  myName: 'foo',
}))

// using state in a components
export const FooComponent = defineComponent(() => {
  return () => {
    return h('span', myState.myName)
  }
})
```

### Atom with a recipe
```typescript
import {atom} from 'vare'
import {defineComponent, h} from 'vue'

const myState = atom({
  myName: 'foo',
}, (state, payload: string) => {
  state.myName = payload
})

// using state in a components
export const FooComponent = defineComponent(() => {
  
  return () => {
    return (
      h('div', [
        h('span', myState.myName),
        h('button', {onClick: () => myState.$('new name')}, 'setNewName')
      ])
    )
  }
})
```

### Atom with a getter
```typescript
import {atom, getter} from 'vare'
import {defineComponent, h} from 'vue'

const myState = atom({
  myName: 'foo',
}, getter((state) => `--${state.myName}--`))

// using state in a components
export const FooComponent = defineComponent(() => {
  
  return () => {
    return (
      h('div', [
        h('span', myState.myName),  // foo
        h('span', myState.$.value), // --foo--
      ])
    )
  }
})
```

### Atom with a tree
```typescript
import {atom, getter} from 'vare'
import {defineComponent, h} from 'vue'

const myState = atom({
  myName: 'foo',
}, {
  decoName: getter((state) => `--${state.myName}--`),
  setName: (state, payload: string) => {
    state.myName = payload
  }
})

// using state in a components
export const FooComponent = defineComponent(() => {
  
  return () => {
    return (
      h('div', [
        h('span', myState.myName),  // foo
        h('span', myState.$.decoName.value), // --foo--
        h('button', {onClick: () => myState.$.setName('new name')}, 'setNewName') // change name with clicking
      ])
    )
  }
})
```

### Binding Atom
```typescript
import {atom, getter} from 'vare'
import {defineComponent, h} from 'vue'

const myState = atom({
  myName: 'foo',
}, {
  decoName: getter((state) => `--${state.myName}--`),
  setName: (state, payload: string) => {
    state.myName = payload
  },
})

const myState2 = atom(myState, (state, payload: string) => {
  state.name = `?${payload}?`
})

// using state in a components
export const FooComponent = defineComponent(() => {
  
  return () => {
    return (
      h('div', [
        h('span', myState.myName),  // foo --click--> ?foo?
        h('span', myState.$.decoName.value), // --foo-- --click--> --?foo?--
        h('button', {onClick: () => myState2.$('new name')}, 'setNewName') // change name with clicking
      ])
    )
  }
})
```

### Nesting Atom
```typescript
import {atom, getter} from 'vare'
import {defineComponent, h} from 'vue'

const myState = atom({
  myName: 'foo',
  deep: atom({
    name: 'deepName',
  }, (state, payload: string) => {
    // get RootName
    const rootName = myState.$.decoName.value
    state.name = `${rootName}/${payload}`
  })
}, {
  decoName: getter((state) => `--${state.myName}--`),
  setName: (state, payload: string) => {
    state.myName = payload
  }
})

// using state in a components
export const FooComponent = defineComponent(() => {
  
  return () => {
    return (
      h('div', [
        h('span', myState.myName),  // foo
        h('span', myState.deep.name),  // deepName
        h('button', {onClick: () => myState.deep.$('new Name')}, 'setNewName') // change name with clicking
      ])
    )
  }
})
```


## Supporting Vue DevTool ?

Yes!

```typescript
import {atom, plugin as varePlugin} from 'vare'
// vue app
const posts = atom({})
const user = atom({})
const bucket = atom({})
const app = createApp()

// for using devtool
app.use(varePlugin, {
  states: {
    posts,
    user,
    bucket,
  },
})
```

!!!! supporting timeline for recipe functions is WIP 

![devtool](https://github.com/winter-love/web/blob/dev/packages/vare/media/devtool.png)

# ------ old feature -----

## State (Old)

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

## Mutation (Old)

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

## Action (Old)

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

## Compute (Old)

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

## Subscribe (Old)

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

## Naming (Old)

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

## Relating (for devtool) (Old)
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
