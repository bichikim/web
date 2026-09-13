import {cx} from 'class-variance-authority'
import type {JSX} from 'solid-js'

export interface POrbitBorderProps {
  readonly children: JSX.Element
  readonly class?: string
}

export const POrbitBorder = (props: POrbitBorderProps) => (
  <span class={cx('relative inline-flex overflow-visible', props.class)} data-orbit-border="">
    <span
      aria-hidden="true"
      class={
        'pomo-orbit-border pointer-events-none absolute -inset-0.5 box-border ' +
        'animate-orbit-border rounded-full motion-reduce:animate-none'
      }
      data-orbit-border-effect=""
    />
    {props.children}
  </span>
)
