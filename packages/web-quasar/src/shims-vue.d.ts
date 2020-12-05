// Mocks all files ending in `.vue` showing them as plain Vue instances
declare module '*.vue' {
  import {defineComponent} from 'vue'
  const component: ReturnType<typeof defineComponent>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  export default component
}
