import {useStyles} from '@winter-love/solid-use'
import {
  type ComponentProps,
  createMemo,
  Match,
  mergeProps,
  Switch,
  useContext,
  type ValidComponent,
} from 'solid-js'
import {DragButtonContext} from './context'
import {createDynamic} from 'solid-js/web'
import {DRAG_BUTTON_VAR_DRAG_X} from './const'
import type {ComponentTargetProps} from '../utils'

const onlyPlus = (value: number) => {
  if (value < 0) {
    return 0
  }

  return value
}

export type DragButtonAsidePosition = 'left' | 'right'

interface DragButtonAsideOwnProps {
  position: 'left' | 'right'
}

export type DragButtonAsideProps<T extends ValidComponent> = ComponentTargetProps<T> &
  DragButtonAsideOwnProps

export function DragButtonAside<T extends ValidComponent>(props: DragButtonAsideProps<T>) {
  const [dragContext] = useContext(DragButtonContext)

  const dragX = createMemo(() => dragContext().dragX)

  const position = createMemo(() => {
    if (props.position === 'left') {
      return dragX() > 0 ? 'left' : ''
    }

    return dragX() < 0 ? 'right' : ''
  })

  const style = useStyles(() => [
    props.componentProps?.style,
    {[DRAG_BUTTON_VAR_DRAG_X]: `${onlyPlus(props.position === 'left' ? dragX() : -dragX())}px`},
  ])
  // oxlint-disable-next-line solid/reactivity -- Solid tracks mergeProps function sources; replacement is covered by tests.
  const targetProps = mergeProps(() => props.componentProps, {
    // Empty JSX children must not fall through mergeProps to target children.
    get children() {
      return 'children' in props ? (props.children ?? null) : props.componentProps?.children
    },
    get style() {
      return style()
    },
  }) as ComponentProps<T>

  return (
    <Switch>
      <Match when={position() === 'left'}>
        {createDynamic(() => props.component, targetProps)}
      </Match>
      <Match when={position() === 'right'}>
        {createDynamic(() => props.component, targetProps)}
      </Match>
    </Switch>
  )
}
