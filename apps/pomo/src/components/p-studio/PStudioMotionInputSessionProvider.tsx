import {
  type Accessor,
  createContext,
  createMemo,
  createSignal,
  type JSX,
  type Setter,
  useContext,
} from 'solid-js'

import type {PSceneMotionInput} from '../../features/focus-room-animation'

interface PStudioMotionInputSession {
  readonly motionInput: Accessor<PSceneMotionInput | undefined>
  readonly setMotionInput: Setter<PSceneMotionInput | undefined>
}

interface PStudioMotionInputSessionProviderProps {
  readonly children?: JSX.Element
}

const PStudioMotionInputSessionContext = createContext<PStudioMotionInputSession>()

export const PStudioMotionInputSessionProvider = (
  props: PStudioMotionInputSessionProviderProps,
) => {
  const [motionInput, setMotionInput] = createSignal<PSceneMotionInput | undefined>()

  return (
    <PStudioMotionInputSessionContext.Provider value={{motionInput, setMotionInput}}>
      {props.children}
    </PStudioMotionInputSessionContext.Provider>
  )
}

export const usePStudioMotionInputSession = () => useContext(PStudioMotionInputSessionContext)

export const usePStudioMotionInput = () => {
  const motionInputSession = usePStudioMotionInputSession()
  const [localMotionInput, setLocalMotionInput] = createSignal<PSceneMotionInput>('drag')
  const motionInput = createMemo(() => motionInputSession?.motionInput() ?? localMotionInput())
  const setMotionInput = (value: PSceneMotionInput) => {
    setLocalMotionInput(value)
    motionInputSession?.setMotionInput(value)
  }

  return {motionInput, motionInputSession, setMotionInput}
}
