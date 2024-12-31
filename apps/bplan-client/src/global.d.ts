/// <reference types="@solidjs/start/env" />
/// <reference types="vite/client" />

declare module '~icons/*' {
  const icon: any
  export default icon
}

declare module '*.json' {
  const value: Object
  export default value
}
