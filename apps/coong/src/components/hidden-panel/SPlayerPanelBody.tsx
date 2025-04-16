import {
  ComponentProps,
  createMemo,
  mergeProps,
  splitProps,
  ValidComponent,
} from 'solid-js'
import {ResizeCard} from 'src/components/resize-card'
import {useWindowSize} from 'src/use/window-size'
import {preventGlobalTouchAttrs} from 'src/components/real-button/use-global-touch'

const handleUpStyle = `:uno:
cursor-ns-resize h-2 absolute top-0 md:right-50% right-[calc(50%-2.5rem)]
translate-x-1/2 translate-y--1/2 md:w-full w-[calc(100vw-2.5rem)]
`

export interface SPlayerPanelBodyProps extends ComponentProps<'div'> {
  /**
   * Used for performance optimization by preventing internal operations when mounted but not in use
   */
  isActive?: boolean
  maxPercent?: number
}

export const SPlayerPanelBody = (props: SPlayerPanelBodyProps) => {
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
        <ResizeCard.Handle
          {...preventGlobalTouchAttrs()}
          tabIndex="-1"
          resizeType="up"
          class={handleUpStyle}
        ></ResizeCard.Handle>
      </ResizeCard.Body>
    </ResizeCard.Provider>
  )
}
