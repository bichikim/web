import {useIntersection} from '@winter-love/solid-use/intersection'
import {createSignal, Show} from 'solid-js'
import type {BackgroundController, BackgroundMedia} from 'src/features/background'
import {Content} from './Content'

const PLACEHOLDER_HEIGHT = 80

export interface ItemProps {
  readonly item: BackgroundMedia
  readonly background: BackgroundController
}

export const Item = (props: ItemProps) => {
  const [element, setElement] = createSignal<HTMLLIElement | null>(null)
  const [focused, setFocused] = createSignal(false)
  const [height, setHeight] = createSignal(PLACEHOLDER_HEIGHT)
  const visible = useIntersection(
    element,
    () => ({root: element()?.closest('ol') ?? null, rootMargin: '80px'}),
    (entry) => {
      if (!entry.isIntersecting) {
        setHeight(entry.target.getBoundingClientRect().height)
      }
    },
  )
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
