import {CssComponent} from '@stitches/core/types/styled-component'
import {getClassName} from 'src/get-class-name'
import {getDirectiveStoreKey} from 'src/get-directive-store-key'
import {DirectiveBinding} from 'vue'

export interface DirectiveStoreProps {
  previousClassNames?: string[]
}

export const updateClassName = (
  system: CssComponent,
  el: any,
  binding: DirectiveBinding,
) => {
  const key = getDirectiveStoreKey(binding)

  const {previousClassNames}: DirectiveStoreProps = el[key] ?? {}

  if (previousClassNames) {
    el.classList.remove(...previousClassNames)
  }

  const className = getClassName(system, binding)

  if (!className) {
    return
  }

  const classNames = className.split(' ')

  el[key] = {
    previousClassNames: classNames,
  }

  el.classList.add(...classNames)
}
