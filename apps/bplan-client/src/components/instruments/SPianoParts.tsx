import {HPianoBody, HPianoBodyProps} from './HPianoBody'
import {HPianoRoot, HPianoRootProps} from './HPianoRoot'
import {HPianoSharpSet, HPianoSharpSetProps} from './HPianoSharpSet'
import {HPianoFlatSet, HPianoFlatSetProps} from './HPianoFlatSet'
import {HKey, HKeyProps} from './HKey'
import {JSX} from 'solid-js'
import {cx} from 'class-variance-authority'

export type SPianoRootProps = HPianoRootProps

export const SPianoRoot = (props: SPianoRootProps) => {
  return <HPianoRoot {...props} />
}

export type SPianoBodyProps = HPianoBodyProps

export const SPianoBody = (props: SPianoBodyProps) => {
  return <HPianoBody {...props} />
}

export type SPianoSharpKeyProps = HKeyProps

export const SPianoSharpKey = (props: SPianoSharpKeyProps) => {
  return <HKey {...props} class={cx('key-piano-sharp touch-none', props.class)} />
}

export type SPianoFlatKeyProps = HKeyProps

export const SPianoFlatKey = (props: SPianoFlatKeyProps) => {
  return <HKey {...props} class={cx('key-piano-flat touch-none', props.class)} />
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
