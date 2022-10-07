import {memo} from 'preact/compat'
import {ComponentChildren} from 'preact'

export interface NumberProps {
  count: number
}

export const Number = memo((props: NumberProps) => {
  return <span>{props.count}</span>
})

export interface Number2Props {
  children: ComponentChildren
  count: number
}

export const Number2 = memo((props: Number2Props) => {
  return (
    <>
      <span>{props.children}</span>
      <span>{props.count}</span>
    </>
  )
})
