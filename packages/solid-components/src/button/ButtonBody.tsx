import {ButtonContext} from './context'
import {Dynamic} from 'solid-js/web'
import {ComponentProps, createMemo, useContext} from 'solid-js'

export interface ButtonBodyProps
  extends Omit<ComponentProps<'button'>, 'onClick' | 'onTouchEnd' | 'onDblClick' | 'onTouchStart' | 'type'> {
  //
}

export const ButtonBody = (props: ButtonBodyProps) => {
  const [buttonContextValue, {handleClick, handleTouchEnd, handleTouchStart}] = useContext(ButtonContext)

  const tag = createMemo(() => {
    return buttonContextValue().tag
  })

  const loading = createMemo(() => {
    const {loading} = buttonContextValue()

    return loading
  })

  const loadingAnimation = createMemo(() => {
    const {loadingAnimation} = buttonContextValue()

    return loadingAnimation
  })

  const href = createMemo(() => {
    return buttonContextValue().href
  })

  const style = createMemo(() => {
    const {loadingProcess} = buttonContextValue()

    if (typeof loadingProcess === 'number') {
      return {
        '--var-progress-percent': `${loadingProcess}%`,
      }
    }
  })

  const disabled = createMemo(() => {
    return buttonContextValue().disabled
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
      style={style()}
      disabled={disabled()}
    >
      {props.children}
    </Dynamic>
  )
}
