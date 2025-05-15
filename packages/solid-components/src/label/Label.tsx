import {freeze} from '@winter-love/utils'
import {Accessor, createContext, createMemo, createUniqueId, ParentProps, useContext} from 'solid-js'
import {ComponentProps} from 'solid-js/types/render/component'

export type LabelProviderProps = {targetId?: string} & ParentProps

export interface LabelContextProps {
  targetId?: string
}

export const LabelContext = createContext<Accessor<LabelContextProps>>(() => ({}))

export const LabelProvider = (props: LabelProviderProps) => {
  const instanceId = createUniqueId()
  const labelContextValue = createMemo(() => ({targetId: props.targetId ?? instanceId}))

  return <LabelContext.Provider value={labelContextValue}>{props.children}</LabelContext.Provider>
}

export interface LabelContentProps extends ComponentProps<'label'>, ParentProps {
  //
}

export const LabelContent = (props: LabelContentProps) => {
  const labelContext = useContext(LabelContext)

  return <label {...props} for={labelContext().targetId} />
}

export const Label = freeze({
  Content: LabelContent,
  Provider: LabelProvider,
})
