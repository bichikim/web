import {type Accessor, createContext, createMemo, type JSX, useContext} from 'solid-js'

export const RouterNameContext = createContext<Accessor<Record<string, string>>>(() => ({}))

export interface RouterNameProviderProps {
  children: JSX.Element
  routerName: Record<string, string>
}

export const RouterNameProvider = (props: RouterNameProviderProps) => {
  const routerName = createMemo(() => {
    return props.routerName
  })

  return <RouterNameContext.Provider value={routerName}>{props.children}</RouterNameContext.Provider>
}

export const useRouterName = () => {
  return useContext(RouterNameContext)
}
