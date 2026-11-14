import type {} from 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface ExplicitProperties {
      readonly muted: boolean
      volume: number
    }
  }
}
