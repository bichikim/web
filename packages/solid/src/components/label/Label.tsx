import {
  Accessor,
  createContext,
  createMemo,
  createUniqueId,
  ParentProps,
  Setter,
  useContext,
  ValidComponent,
} from 'solid-js'
import {ComponentProps} from 'solid-js/types/render/component'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {createSync} from 'src/use'

export type LabelRootProps<T extends ValidComponent> = DynamicProps<T> & {
  targetId?: string
}

export interface LabelContextProps {
  targetId?: string
}

export interface LabelContextActions {
  setId: Setter<string>
}

export const LabelContext = createContext<
  Accessor<LabelContextProps> & LabelContextActions
>(
  Object.assign(() => ({}), {
    setId: () => {
      throw new Error('not implemented')
    },
  }),
)

export const LabelRoot = <T extends ValidComponent>(props: LabelRootProps<T>) => {
  const instanceId = createUniqueId()

  const computedId = createMemo(() => {
    return props.targetId ?? instanceId
  })

  // eslint-disable-next-line solid/reactivity
  const [id, setId] = createSync(computedId)

  const labelContextValue = createMemo(() => ({targetId: id()}))

  return (
    // eslint-disable-next-line solid/reactivity
    <LabelContext.Provider value={Object.assign(labelContextValue, {setId})}>
      <Dynamic {...props} />
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
