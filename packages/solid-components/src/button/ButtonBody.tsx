import {ButtonContext} from './context'
import {Dynamic, DynamicProps} from 'solid-js/web'
import {createMemo, ParentProps, useContext, ValidComponent} from 'solid-js'
import {useStyles} from '@winter-love/solid-use'

export type ButtonBodyProps<T extends ValidComponent> = Omit<
  DynamicProps<T>,
  'component' | 'children' | 'class'
> &
  ParentProps & {
    class?: string
    component?: T
  }

export const ButtonBody = <T extends ValidComponent>(props: ButtonBodyProps<T>) => {
  const {handleClick, handleTouchEnd, handleTouchStart, value} = useContext(ButtonContext)

  const tag = createMemo(() => {
    return value().tag
  })

  const loading = createMemo(() => {
    const {loading} = value()

    return loading
  })

  const loadingAnimation = createMemo(() => {
    const {loadingAnimation} = value()

    return loadingAnimation
  })

  const href = createMemo(() => {
    return value().href
  })

  const style = createMemo(() => {
    const {loadingProcess} = value()

    if (typeof loadingProcess === 'number') {
      return {
        '--var-progress-percent': `${loadingProcess}%`,
      }
    }
  })

  const styles = useStyles(() => [style(), props.style])

  const disabled = createMemo(() => {
    return value().disabled
  })

  return (
    <Dynamic
      {...props}
      component={tag()}
      onClick={handleClick}
      onDblClick={undefined}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      href={href()}
      data-loading={loading()}
      data-loading-animation={loadingAnimation()}
      style={styles()}
      disabled={disabled()}
    >
      {props.children}
    </Dynamic>
  )
}
