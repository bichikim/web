import {
  ComponentProps,
  createMemo,
  mergeProps,
  splitProps,
  ValidComponent,
} from 'solid-js'
import {ResizeCard} from 'src/components/resize-card'
import {useWindowSize} from 'src/use/window-size'

export interface SPlayerPanelBodyProps extends ComponentProps<'div'> {
  /**
   * Used for performance optimization by preventing internal operations when mounted but not in use
   */
  isActive?: boolean
  maxPercent?: number
}

export const SPlayerPanelBody = <T extends ValidComponent>(
  props: SPlayerPanelBodyProps,
) => {
  const activeResize = createMemo(() => props.isActive ?? false)
  const windowSize = useWindowSize({height: 500, width: 800}, activeResize)

  const defaultProps = mergeProps(props, {
    maxPercent: 0.8,
  })

  const [innerProps, restProps] = splitProps(defaultProps, ['maxPercent'])

  const maxHeight = createMemo(() => {
    return windowSize().height * innerProps.maxPercent
  })

  return (
    <ResizeCard.Provider preventWidthResize maxSize={{height: maxHeight()}}>
      <ResizeCard.Body {...restProps} component="div">
        {restProps.children}
      </ResizeCard.Body>
    </ResizeCard.Provider>
  )
}
