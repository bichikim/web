import {CssComponent} from '@stitches/core/types/styled-component'
import {getClassName} from 'src/get-class-name'
import {getDirectiveStoreKey} from 'src/get-directive-store-key'
import {DirectiveBinding} from 'vue'

export interface DirectiveStoreProps {
  previousClassNames?: string[]
}

export const updateClassName = (
  system: CssComponent,
  element: any,
  binding: DirectiveBinding,
) => {
  const key = getDirectiveStoreKey(binding)

  const {previousClassNames}: DirectiveStoreProps = element[key] ?? {}

  if (previousClassNames) {
    element.classList.remove(...previousClassNames)
  }

  const className = getClassName(system, binding)

  if (!className) {
    return
  }

  const classNames = className.split(' ')

  element[key] = {
    previousClassNames: classNames,
  }

  element.classList.add(...classNames)
}
