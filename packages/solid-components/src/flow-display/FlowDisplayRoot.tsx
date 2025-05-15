import {Accessor, ComponentProps, createContext, createMemo, createSignal, ParentProps} from 'solid-js'

export interface FlowDisplayContextProps extends ParentProps {
  move: boolean
}

export interface FlowDisplayContextActions {
  handleSelect: (select: boolean) => void
}

export const FlowDisplayContext = createContext<[Accessor<FlowDisplayContextProps>, FlowDisplayContextActions]>([
  () => ({
    move: false,
  }),
  {
    handleSelect: () => {
      throw new Error('handleSelect is not implemented')
    },
  },
])

export const FlowDisplayRoot = (props: ComponentProps<'div'>) => {
  const [move, setMove] = createSignal(false)

  const handleSelect = (select: boolean) => {
    setMove(select)
  }

  const contextValue = createMemo(() => ({move: move()}))

  return (
    <FlowDisplayContext.Provider value={[contextValue, {handleSelect}]}>{props.children}</FlowDisplayContext.Provider>
  )
}
