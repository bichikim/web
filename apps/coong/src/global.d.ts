/// <reference types="@solidjs/start/env" />
/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom/vitest" />


declare module '~icons/*' {
  const icon: any
  export default icon
}

declare module '*.json' {
  const value: Object
  export default value
}
