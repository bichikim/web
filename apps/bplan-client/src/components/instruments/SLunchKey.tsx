import {HKey, type HKeyProps} from './HKey'
import {cx} from 'class-variance-authority'
import {splitProps} from 'solid-js'

export type SLunchKeyProps = HKeyProps & {
  bgColor?: string
  borderColor?: string
}

const contentStyle =
  'absolute top--4px bottom-0 box-border p-20px w-full rd-20% duration-130 ease-in-out ' +
  'shadow-lunch-content'

// https://codepen.io/vladracoare/pen/jOPmMap
export const SLunchKey = (_props: SLunchKeyProps) => {
  const [props, rest] = splitProps(_props, [
    'children',
    'class',
    'bgColor',
    'borderColor',
  ])

  return (
    <HKey
      {...rest}
      class={cx('key-lunch', props.class)}
      style={{'border-color': props.borderColor ?? ''}}
    >
      <div class={contentStyle} style={{'background-color': props.bgColor ?? '#eee'}}>
        {props.children}
      </div>
    </HKey>
  )
}
