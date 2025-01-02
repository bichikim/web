import {
  Accessor,
  createContext,
  createMemo,
  createUniqueId,
  ParentProps,
  useContext,
} from 'solid-js'
import {ComponentProps} from 'solid-js/types/render/component'

export type LabelRootProps = {targetId?: string} & ParentProps

export interface LabelContextProps {
  targetId?: string
}

export const LabelContext = createContext<Accessor<LabelContextProps>>(() => ({}))

export const LabelRoot = (props: LabelRootProps) => {
  const instanceId = createUniqueId()
  const computedId = createMemo(() => {
    return props.targetId ?? instanceId
  })
  const labelContextValue = createMemo(() => ({targetId: computedId()}))

  return (
    <LabelContext.Provider value={labelContextValue}>
      {props.children}
    </LabelContext.Provider>
  )
}

export interface LabelContentProps extends ComponentProps<'label'>, ParentProps {
  //
}

export const LabelContent = (props: LabelContentProps) => {
  const labelContext = useContext(LabelContext)

  return <label {...props} for={labelContext().targetId} />
}
