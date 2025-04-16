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

const pianoSharpKeyStyle = `:uno:
b-solid rd-t-0 overflow-hidden b-b-black
focus-visible:outline-white focus-visible:outline-auto focus-visible:outline-2px
p-0 relative b-x-2px b-t-1px b-b-10px rd-b-2px shadow-sharp-key
bg-gradient-linear bg-gradient-[-20deg,#333,#000,#333] bg-black
b-t-#666 b-r-#222 b-b-#111 b-l-#555
data-[state="down"]:b-2px data-[state="down"]:shadow-sharp-down touch-none
`

const pianoFlatKeyStyle = `:uno:
block b-solid b-#ccc rd-t-0 inline-flex overflow-hidden b-b-2px
focus-visible:outline-black focus-visible:outline-auto focus-visible:outline-2px
p-0 relative rd-b-3px b-l-1px b-r-1px b-t-0 shadow-flat-up data-[state="down"]:shadow-flat-down b-b-#ddd
data-[state="down"]-shadow-[0_2px_2px_rgba(0,0,0,0.4)] data-[state="down"]:scale-x-100
data-[state="down"]:scale-y-99 data-[state="down"]:origin-top data-[state="down"]:b-b-1px
data-[state="down"]:after:content-[""] data-[state="down"]:after:bg-black data-[state="down"]:after:h-full
data-[state="down"]:after:left--5px data-[state="down"]:after:opacity-10 data-[state="down"]:after:absolute
data-[state="down"]:after:top-0 data-[state="down"]:after:skew-x-0.5 data-[state="down"]:after:w-5px
data-[state="down"]:after:shadow-flat-left data-[state="down"]:before:content-[""]
data-[state="down"]:before:bg-black data-[state="down"]:before:h-full
data-[state="down"]:before:right--5px data-[state="down"]:before:opacity-10
data-[state="down"]:before:absolute
data-[state="down"]:before:top-0 data-[state="down"]:before:skew-x--0.5 data-[state="down"]:before:w-5px
data-[state="down"]:before:shadow-flat-right touch-none
`

const sharpKeyStyle = cva(pianoSharpKeyStyle, {
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
      class={sharpKeyStyle({class: innerProps.class, rightEmpty})}
      name="sharp"
    >
      <SKeyEffect
        class={cx(
          ':uno: absolute top--4 left-0 w-full h-full pointer-events-none',
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
    <HKey {...restProps} class={cx(pianoFlatKeyStyle, innerProps.class)} name="flat">
      <SKeyEffect
        class={cx(
          ':uno: absolute top--4 left-0 w-full h-full pointer-events-none',
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
  return <div {...props} class={cx(':uno: select-none inline-flex', props.class)} />
}

export const SPianoFlatSet = (props: HPianoFlatSetProps) => {
  return <HPianoFlatSet {...props} />
}
