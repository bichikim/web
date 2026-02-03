import type {JSX} from 'solid-js'

export interface SectionParagraphProps {
  children?: JSX.Element
}

/** Section body text. */
export function SectionParagraph(props: SectionParagraphProps) {
  return <p class="section__paragraph mt-6 max-w-md text-lg opacity-90">{props.children}</p>
}
