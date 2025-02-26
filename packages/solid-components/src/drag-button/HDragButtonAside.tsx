import {createMemo, Match, splitProps, Switch, useContext, ValidComponent} from 'solid-js'
import {DragButtonContext} from './context'
import {Dynamic, DynamicProps} from 'solid-js/web'

const onlyPlus = (value: number) => {
  if (value < 0) {
    return 0
  }

  return value
}

export type HDragButtonAsidePosition = 'left' | 'right'

interface HDragButtonAsideOwnProps {
  position: 'left' | 'right'
}

export type HDragButtonAsideProps<T extends ValidComponent> = DynamicProps<T> &
  HDragButtonAsideOwnProps

export function HDragButtonAside<T extends ValidComponent>(
  props: HDragButtonAsideProps<T>,
) {
  const [dragContext] = useContext(DragButtonContext)

  const [innerProps, restProps] = splitProps(props, ['position']) as unknown as [
    HDragButtonAsideOwnProps,
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
        <Dynamic {...restProps} style={{'--var-drag-x': `${onlyPlus(dragX())}px`}}>
          {restProps.children}
        </Dynamic>
      </Match>
      <Match when={position() === 'right'}>
        <Dynamic {...restProps} style={{'--var-drag-x': `${onlyPlus(dragX() * -1)}px`}}>
          {restProps.children}
        </Dynamic>
      </Match>
    </Switch>
  )
}
