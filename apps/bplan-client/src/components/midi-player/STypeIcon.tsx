import {createMemo, Show} from 'solid-js'
import {cx} from 'class-variance-authority'

export interface MTypeIconProps {
  name?: string
}

export const STypeIcon = (props: MTypeIconProps) => {
  const colorMatch: Record<string, string> = {
    midi: 'bg-blue text-white',
    mp3: 'bg-blue text-white',
  }

  const color = createMemo(() => colorMatch[props.name ?? ''] ?? 'bg-gray text-white')

  return (
    <Show when={props.name}>
      <span class={cx('text-4 rd-1 px-.5 pb-.5 h-4', color())}>{props.name}</span>
    </Show>
  )
}
