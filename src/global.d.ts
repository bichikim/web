import {SerializedStyles, StyleSheet} from '@emotion/utils'
declare module '@emotion/utils' {

  export interface EmotionCache {
    insert(
      selector: string,
      serialized: SerializedStyles,
      sheet: StyleSheet,
      shouldCache: boolean
    ): string | void
  }
}
