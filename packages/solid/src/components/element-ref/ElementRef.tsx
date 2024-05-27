import {DynamicParentProps} from 'src/components/types'
import {JSXElement, onCleanup, Setter, splitProps} from 'solid-js'
import {Dynamic} from 'solid-js/web'
export interface ElementRefProps extends DynamicParentProps {
  ref: Setter<HTMLElement | null>
}

export const ElementRef = (_props: ElementRefProps) => {
  const [props, restProps] = splitProps(_props, ['as', 'ref'])

  onCleanup(() => {
    props.ref(null)
  })

  return <Dynamic component={props.as} {...restProps} ref={props.ref} />
}
