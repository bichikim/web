import {
  Accessor,
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  ParentProps,
  Setter,
  splitProps,
  useContext,
  ValidComponent,
} from 'solid-js'
import {ComponentProps} from 'solid-js/types/render/component'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {createSync} from '@winter-love/solid-use'

export type LabelRootProps = {targetId?: string} & ParentProps

export interface LabelContextProps {
  targetId?: string
}

export interface LabelContextActions {
  setId: Setter<string>
}

export const LabelContext = createContext<Accessor<LabelContextProps>>(() => ({}))

export const LabelRoot = (props: LabelRootProps) => {
  const [innerProps, restProps] = splitProps(props, ['targetId'])
  const instanceId = createUniqueId()

  const computedId = createMemo(() => {
    return innerProps.targetId ?? instanceId
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
