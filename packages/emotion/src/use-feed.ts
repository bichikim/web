import {ComputedRef} from '@vue/reactivity'
import {castFeed} from './cast-feed'
import {useTheme} from './theme'
import {computed, Ref} from 'vue'

export const useFeed = (feed: Ref<any>): ComputedRef<Record<string, any>> => {
  const theme = useTheme()
  return computed(() => {
    return castFeed(feed.value, theme)
  })
}
