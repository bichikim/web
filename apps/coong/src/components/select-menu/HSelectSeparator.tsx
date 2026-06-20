import {type JSX, splitProps} from 'solid-js'

export interface HSelectSeparatorProps extends JSX.HTMLAttributes<HTMLDivElement> {}

/** Headless separator between menu items (`role="separator"`). */
export const HSelectSeparator = (props: HSelectSeparatorProps) => {
  const [local, separatorProps] = splitProps(props, ['class', 'role'])

  return (
    <div
      {...separatorProps}
      role={local.role ?? 'separator'}
      class={local.class}
      aria-orientation="horizontal"
    />
  )
}
