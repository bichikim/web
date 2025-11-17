import {createMemo, type JSX, createSignal} from 'solid-js'
import {cva} from 'class-variance-authority'

const keyCapBase = `
:uno:
relative inline-block
w-[60px] h-[60px] py-2 px-[15px]
bg-[linear-gradient(135deg,#fff,#d3d3d3)]
rounded-[10px] uppercase overflow-hidden
uppercase
overflow-hidden
shadow-[inset_-8px_0_8px_rgba(0,0,0,0.15),inset_0_-8px_8px_rgba(0,0,0,0.25),5px_10px_15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,0,0,0.5)]
before:content-['']
before:absolute
before:top-[5px]
before:left-1
before:bottom-[10px]
before:right-2
before:bg-[linear-gradient(135deg,#d3d3d3,#fff)]
before:rounded-[8px]
before:shadow-[-5px_-5px_5px_rgba(255,255,255,0.25),10px_5px_10px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.25)]
flex items-center justify-center
text-gray-800 font-medium text-base
select-none
`

const keyCapStyles = cva(keyCapBase, {
  variants: {
    pressed: {
      true: `
        shadow-[inset_-10px_-10px_10px_rgba(0,0,0,0.3),inset_10px_10px_10px_rgba(0,0,0,0.4),2px_5px_8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.5)]
        before:top-[8px]
        before:left-[7px]
        before:bottom-[7px]
        before:right-[11px]
        before:bg-[linear-gradient(135deg,#b0b0b0,#e0e0e0)]
        before:shadow-[-3px_-3px_3px_rgba(255,255,255,0.2),8px_4px_8px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.2)]
      `,
    },
  },
})

export interface KeyCapProps {
  childClassName?: string
  children?: JSX.Element
  pressed?: boolean
}

export const KeyCap = (props: KeyCapProps) => {
  const [innerPressed, setInnerPressed] = createSignal(props.pressed)
  const pressed = createMemo(() => innerPressed() || props.pressed)

  const handleMouseDown = () => {
    setInnerPressed(true)
  }

  const handleMouseUp = () => {
    setInnerPressed(false)
  }

  return (
    <button class={keyCapStyles({pressed: pressed()})} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
      <span class={['relative z-1', props.childClassName].join(' ')}>{props.children}</span>
    </button>
  )
}
