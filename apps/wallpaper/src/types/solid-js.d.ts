import 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface ExplicitBoolAttributes {
      readonly webkitdirectory?: boolean
    }
    interface ExplicitProperties {
      readonly muted: boolean
    }
  }
}
