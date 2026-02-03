import type {JSX} from 'solid-js'

export interface SectionTitleProps {
  children: JSX.Element
  /** Optional data attribute for scroll stage (e.g. "Bichi Kim"). */
  dataSectionTitle?: string
}

/** Section heading (h2). Use children for text or custom content (e.g. SVG). */
export function SectionTitle(props: SectionTitleProps) {
  return (
    <h2
      class="section__title-text mt-2 flex items-baseline text-4xl font-bold"
      data-section-title={props.dataSectionTitle}
    >
      {props.children}
    </h2>
  )
}
