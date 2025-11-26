import {ButtonContext} from './context'
import {Dynamic} from 'solid-js/web'
import {ComponentProps, createMemo, useContext} from 'solid-js'
import {useStyles} from '@winter-love/solid-use'

export interface ButtonBodyProps
  extends Omit<ComponentProps<'button'>, 'onClick' | 'onTouchEnd' | 'onDblClick' | 'onTouchStart' | 'type'> {
  //
}

export const ButtonBody = (props: ButtonBodyProps) => {
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
