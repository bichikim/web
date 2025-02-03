import {HPianoBody, HPianoBodyProps} from './HPianoBody'
import {HPianoRoot, HPianoRootProps} from './HPianoRoot'
import {HPianoSharpSet, HPianoSharpSetProps} from './HPianoSharpSet'
import {HPianoFlatSet, HPianoFlatSetProps} from './HPianoFlatSet'
import {HKey, HKeyProps} from './HKey'
import {JSX, Show, splitProps, useContext} from 'solid-js'
import {cva, cx} from 'class-variance-authority'
import {KeyContext} from './key-context'
import {SKeyEffect} from './SKeyEffect'

export type SPianoRootProps = HPianoRootProps

export const SPianoRoot = (props: SPianoRootProps) => {
  return <HPianoRoot {...props} />
}

export type SPianoBodyProps = HPianoBodyProps

export const SPianoBody = (props: SPianoBodyProps) => {
  return <HPianoBody {...props} />
}

export type SPianoSharpKeyProps = HKeyProps & {
  effectClass?: string
  showKeyName?: boolean
}

const sharpKeyStyle = cva('key-piano-sharp touch-none', {
  variants: {
    rightEmpty: {
      false: '',
      true: 'mr-6.875rem',
    },
  },
})

export const SPianoSharpKey = (props: SPianoSharpKeyProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'effectClass',
    'class',
    'children',
    'showKeyName',
  ])
  const {rightEmpty, name} = useContext(KeyContext)

  return (
    <HKey
      {...restProps}
      class={cx(sharpKeyStyle({rightEmpty}), innerProps.class)}
      name="sharp"
    >
      <SKeyEffect
        class={cx(
          'absolute top--4 left-0 w-full h-full pointer-events-none',
          innerProps.effectClass,
        )}
      />
      <Show when={innerProps.showKeyName}>
        <span class="mb-2">{name}</span>
      </Show>
      {innerProps.children}
    </HKey>
  )
}

export type SPianoFlatKeyProps = HKeyProps & {
  effectClass?: string
  showKeyName?: boolean
}

export const SPianoFlatKey = (props: SPianoFlatKeyProps) => {
  const [innerProps, restProps] = splitProps(props, [
    'effectClass',
    'class',
    'children',
    'showKeyName',
  ])
  const {name} = useContext(KeyContext)

  return (
    <HKey
      {...restProps}
      class={cx('key-piano-flat touch-none', innerProps.class)}
      name="flat"
    >
      <SKeyEffect
        class={cx(
          'absolute top--4 left-0 w-full h-full pointer-events-none',
          innerProps.effectClass,
        )}
      />
      <Show when={innerProps.showKeyName}>
        <span class="mb-2">{name}</span>
      </Show>
      {innerProps.children}
    </HKey>
  )
}

export const SPianoSharpSet = (props: HPianoSharpSetProps) => {
  return <HPianoSharpSet {...props} />
}

export type SPianoSharpEmptyProps = JSX.HTMLAttributes<HTMLDivElement>

export const SPianoSharpEmpty = (props: SPianoSharpEmptyProps) => {
  return <div {...props} class={cx('select-none inline-flex', props.class)} />
}

export const SPianoFlatSet = (props: HPianoFlatSetProps) => {
  return <HPianoFlatSet {...props} />
}
