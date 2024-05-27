/// <reference types="vite/client" />

// Mocks all files ending in `.vue` showing them as plain Vue instances
declare module '*.vue' {
  import {ComponentOptions} from 'vue'
  const component: ComponentOptions
  export default component
}

declare module '*.md' {
  import type {ComponentOptions} from 'vue'
  const Component: ComponentOptions
  export default Component
}
