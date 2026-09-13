import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {visibility} from 'src/utils/visibility'
import {koreanToday} from './korean-today'

const DAY_MILLISECONDS = 86_400_000

/** Returns an empty date before mount, then refreshes the Korean date at midnight and on return. */
export const useKoreanToday = (): Accessor<string> => {
  const [today, setToday] = createSignal('')
  onMount(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | undefined
    const refreshDate = () => {
      clearTimeout(midnightTimer)
      const now = new Date()
      const date = koreanToday(now)
      setToday(date)
      const nextMidnight = Date.parse(`${date}T00:00:00+09:00`) + DAY_MILLISECONDS
      midnightTimer = setTimeout(refreshDate, nextMidnight - now.getTime())
    }
    refreshDate()
    const stopVisibility = visibility((isHidden) => {
      if (!isHidden) {
        refreshDate()
      }
    })
    onCleanup(() => {
      clearTimeout(midnightTimer)
      stopVisibility()
    })
  })
  return today
}
