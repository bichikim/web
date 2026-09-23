import {Accessor, type JSX, onMount} from 'solid-js'
import {useStorage} from '@winter-love/solid-use'
import {getStorageKey} from 'src/utils/storage-key'
// restore scroll

export const useRestoreScroll = (element: Accessor<HTMLElement | null>) => {
  const [savedScrollLeft, setSavedScrollLeft] = useStorage<number | null>(
    'local',
    getStorageKey('piano-scroll-left'),
  )

  onMount(() => {
    const _element = element()
    let _savedScrollLeft = savedScrollLeft()

    if (Number.isNaN(_savedScrollLeft)) {
      _savedScrollLeft = null
    }

    if (_element) {
      _element.scrollLeft =
        typeof _savedScrollLeft === 'number'
          ? (_element.scrollWidth - _element.clientWidth) * _savedScrollLeft
          : (_element.scrollWidth - _element.clientWidth) / 2
    }
  })

  const handleScroll: JSX.EventHandler<HTMLElement, Event> = (event) => {
    const element = event.currentTarget
    const {scrollLeft} = element
    const scrollLeftPercent = scrollLeft / (element.scrollWidth - element.clientWidth)

    setSavedScrollLeft(scrollLeftPercent)
  }

  return {onScroll: handleScroll}
}
