import {For, JSX, splitProps} from 'solid-js'
import {Midi} from '@tonejs/midi'
import {cx} from 'class-variance-authority'
import {MusicInfo, SFileItem} from './SFileItem'

export interface SFileListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  list: MusicInfo[]
}

export const SFileList = (props: SFileListProps) => {
  const [innerProps, restProps] = splitProps(props, ['list'])
  return (
    <div
      {...restProps}
      class={cx('overflow-auto bg-white rd-4px flex flex-col', props.class)}
    >
      <For each={innerProps.list}>
        {(item, index) => <SFileItem {...item} index={index()} />}
      </For>
    </div>
  )
}
