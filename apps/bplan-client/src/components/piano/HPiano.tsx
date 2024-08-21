import {Component, createContext, ParentProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'

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

export const HPianoSharp = () => {
  return <div />
}

export const HPianoKey = () => {
  return <div />
}

export const HPianoLoading = () => {
  return <div />
}


