import {createMemo, Match, splitProps, Switch, useContext, ValidComponent} from 'solid-js'
import {DragButtonContext} from './context'
import {Dynamic, DynamicProps} from 'solid-js/web'

const onlyPlus = (value: number) => {
  if (value < 0) {
    return 0
  }

  return value
}

export type DragAsidePosition = 'left' | 'right'

interface DragButtonAsideOwnProps {
  position: 'left' | 'right'
}

export type DragButtonAsideProps<T extends ValidComponent> = DynamicProps<T> &
  DragButtonAsideOwnProps

export function DragButtonAside<T extends ValidComponent>(
  props: DragButtonAsideProps<T>,
) {
  const [dragContext] = useContext(DragButtonContext)

  const [innerProps, restProps] = splitProps(props, ['position']) as unknown as [
    DragButtonAsideOwnProps,
    DynamicProps<T>,
  ]

  const dragX = createMemo(() => dragContext().dragX)

  return (
    <Switch>
      <Match when={innerProps.position === 'left'}>
        <Dynamic {...restProps} style={{'--var-drag-x': `${onlyPlus(dragX())}px`}}>
          {restProps.children}
        </Dynamic>
      </Match>
      <Match when={innerProps.position === 'right'}>
        <Dynamic {...restProps} style={{'--var-drag-x': `${onlyPlus(dragX() * -1)}px`}}>
          {restProps.children}
        </Dynamic>
      </Match>
    </Switch>
  )
}
