// Mocks all files ending in `.vue` showing them as plain Vue instances

declare module '*.vue' {
  import {defineComponent} from 'vue'
  const component: ReturnType<typeof defineComponent>
  export default component
}

type FC<P = {}, E extends import('vue').EmitsOptions = {}> = import('vue').FunctionalComponent<P, E>
