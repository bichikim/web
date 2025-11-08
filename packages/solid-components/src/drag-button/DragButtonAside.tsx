import {createMemo, Match, splitProps, Switch, useContext, ValidComponent} from 'solid-js'
import {DragButtonContext} from './context'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {DRAG_BUTTON_VAR_DRAG_X} from './const'

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

export type DragButtonAsideProps<T extends ValidComponent> = DynamicProps<T> & DragButtonAsideOwnProps

export function DragButtonAside<T extends ValidComponent>(props: DragButtonAsideProps<T>) {
  const [dragContext] = useContext(DragButtonContext)

  const [innerProps, restProps] = splitProps(props, ['position']) as unknown as [
    DragButtonAsideOwnProps,
    DynamicProps<T>,
  ]

  const dragX = createMemo(() => dragContext().dragX)

  const position = createMemo(() => {
    if (innerProps.position === 'left') {
      return dragX() > 0 ? 'left' : ''
    }

    return dragX() < 0 ? 'right' : ''
  })

  return (
    <Switch>
      <Match when={position() === 'left'}>
        <Dynamic {...restProps} style={{[DRAG_BUTTON_VAR_DRAG_X]: `${onlyPlus(dragX())}px`}}>
          {restProps.children}
        </Dynamic>
      </Match>
      <Match when={position() === 'right'}>
        <Dynamic {...restProps} style={{[DRAG_BUTTON_VAR_DRAG_X]: `${onlyPlus(dragX() * -1)}px`}}>
          {restProps.children}
        </Dynamic>
      </Match>
    </Switch>
  )
}
