import {createContext, createMemo, createSignal, type JSX, type Accessor, useContext} from 'solid-js'

export const HRouterNameContext = createContext<Accessor<Record<string, string>>>(() => ({}))

export type HRouterNameProviderProps = {
  children: JSX.Element
  routerName: Record<string, string>
}

export const HRouterNameProvider = (props: HRouterNameProviderProps) => {
  const routerName = createMemo(() => {
    return props.routerName
  })

  return <HRouterNameContext.Provider value={routerName}>{props.children}</HRouterNameContext.Provider>
}

export const useHRouterName = () => {
  return useContext(HRouterNameContext)
}
