import type {JSX, ParentProps} from 'solid-js'
import {cx} from 'class-variance-authority'

const LAYOUT_BASE = 'min-h-screen flex flex-col items-center justify-center p-6 bg-#1a1a1a text-white text-center'

export interface SHomeLayoutProps extends ParentProps {
  class?: string
}

/**
 * Styled home page layout - dark background, centered content
 */
export const SHomeLayout = (props: SHomeLayoutProps): JSX.Element => (
  <main class={cx(LAYOUT_BASE, props.class)}>{props.children}</main>
)
