import {Component, createContext, createMemo, createUniqueId, ParentProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
import {
  ELEMENT_IDENTIFIER_DATA_ATTR,
  useGlobalTouch,
  useGlobalTouchEmitter,
} from 'src/components/real-button/use-global-touch'
import {cva} from 'class-variance-authority'

export interface PianoContextProps {
  scale: number
  start: (key: string | number) => any
  stop: (key: string | number) => any
}

export const PianoContext = createContext<PianoContextProps>()

export interface HPianoRootProps extends ParentProps {
  as?: Component
}

export const HPianoRoot = (props: HPianoRootProps) => {
  useGlobalTouchEmitter({preventTouchContext: true, topLevelElementOnly: true})
  const onStart = () => {
    //
  }

  const onStop = () => {
    //
  }

  return (
    <PianoContext.Provider value={{scale: 100, start: onStart, stop: onStop}}>
      <Dynamic component={props.as ?? 'div'}>{props.children}</Dynamic>
    </PianoContext.Provider>
  )
}

export interface HPianoBodyProps extends ParentProps {
  as?: Component
}

export const HPianoBody = (props: HPianoBodyProps) => {
  return <Dynamic component={props.as ?? 'div'}>{props.children}</Dynamic>
}

export const HPianoFlat = () => {
  return <div />
}

export interface HPianoSharpProps {
  //
}

export const HPianoSharp = (props: HPianoSharpProps) => {
  return <div />
}

export interface HPianoKeyProps extends ParentProps {
  //
  class: string | undefined
}

export const HPianoKey = (props: HPianoKeyProps) => {
  const id = createUniqueId()
  const isDown = useGlobalTouch(id)

  const attrs: Record<string, any> = {...props, [ELEMENT_IDENTIFIER_DATA_ATTR]: id}

  return (
    <button
      {...attrs}
      class={`select-none ${props.class}`}
      data-state={isDown() ? 'down' : 'up'}
    >
      {props.children}
    </button>
  )
}

export const HPianoLoading = () => {
  return <div />
}
