import type {JSX} from 'solid-js'

export interface SectionProps {
  children?: JSX.Element
}

/** Full-height section with centered flex layout. */
export function Section(props: SectionProps) {
  return (
    <section class="section min-h-screen flex flex-col justify-center px-8 py-24">
      {props.children}
    </section>
  )
}
