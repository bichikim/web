import {ComponentProps, createMemo, Show, splitProps} from 'solid-js'
import {cx} from 'class-variance-authority'

export interface MTypeIconProps extends ComponentProps<'span'> {
  name?: string
}

export const STypeIcon = (props: MTypeIconProps) => {
  const [innerProps, restProps] = splitProps(props, ['name', 'class'])

  const colorMatch: Record<string, string> = {
    midi: 'bg-blue text-white',
    mp3: 'bg-blue text-white',
  }
  const color = createMemo(() => colorMatch[props.name ?? ''] ?? 'bg-gray text-white')

  return (
    <Show when={props.name}>
      <span
        {...restProps}
        class={cx('text-4 rd-1 px-.5 pb-.5 h-5 leading-5', color(), innerProps.class)}
      >
        {props.name}
      </span>
    </Show>
  )
}
