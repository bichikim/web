import 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface ExplicitProperties {
      readonly muted: boolean
    }
  }
}
