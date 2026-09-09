import {createSignal, onCleanup, onMount, Show} from 'solid-js'
import type {BackgroundController, BackgroundMedia} from 'src/features/background'
import {Content} from './Content'

const PLACEHOLDER_HEIGHT = 80

export interface ItemProps {
  readonly item: BackgroundMedia
  readonly background: BackgroundController
}

export const Item = (props: ItemProps) => {
  const [element, setElement] = createSignal<HTMLLIElement>()
  const [visible, setVisible] = createSignal(false)
  const [focused, setFocused] = createSignal(false)
  const [height, setHeight] = createSignal(PLACEHOLDER_HEIGHT)
  onMount(() => {
    const target = element()
    if (target === undefined) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            setHeight(target.getBoundingClientRect().height)
          }
          setVisible(entry.isIntersecting)
        }
      },
      {root: target.closest('ol'), rootMargin: '80px'},
    )
    observer.observe(target)
    onCleanup(() => observer.disconnect())
  })
  return (
    <li
      ref={setElement}
      class="min-h-[var(--item-height)] min-w-0"
      style={{'--item-height': `${height()}px`}}
      onFocusIn={() => setFocused(true)}
      onFocusOut={(event) => {
        setFocused(
          event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget),
        )
      }}
    >
      <Show when={visible() || focused()}>
        <Content item={props.item} background={props.background} />
      </Show>
    </li>
  )
}
