import 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface ExplicitBoolAttributes {
      /** 폴더 선택을 위한 HTML 표준 불리언 속성. */
      webkitdirectory?: boolean
    }
  }
}
