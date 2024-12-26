import {createMemo, Show} from 'solid-js'
import {cx} from 'class-variance-authority'

export interface MTypeIconProps {
  name?: string
}

export const STypeIcon = (props: MTypeIconProps) => {
  const colorMatch = {
    midi: 'bg-blue text-white',
    mp3: 'bg-blue text-white',
  }

  const color = createMemo(() => colorMatch[props.name ?? ''] ?? 'bg-gray text-white')

  return (
    <Show when={props.name}>
      <span class={cx('text-14px rd-4px p-2px h-16px', color())}>{props.name}</span>
    </Show>
  )
}
