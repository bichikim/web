import {Accessor, onMount} from 'solid-js'
import {useEvent, useStorage} from '@winter-love/solid-use'
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

  const handleScroll = (event: Event) => {
    const element = event.target as HTMLElement
    const {scrollLeft} = element
    const scrollLeftPercent = scrollLeft / (element.scrollWidth - element.clientWidth)

    setSavedScrollLeft(scrollLeftPercent)
  }

  useEvent(element, 'scroll', handleScroll, {passive: true})
}
