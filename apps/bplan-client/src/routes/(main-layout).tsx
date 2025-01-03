import {RouteSectionProps} from '@solidjs/router'

export default function MainLayout(props: RouteSectionProps) {
  const layoutCss =
    'absolute overflow-hidden top-0 left-0 bottom-0 right-0 before:content-[""] before:absolute before:top-0 ' +
    'before:bottom-0 before:left-0 before:right-0 before:pattern-a '

  return (
    <div id="layout" class={layoutCss}>
      {props.children}
    </div>
  )
}
