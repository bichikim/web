import {cx} from 'class-variance-authority'

export interface LegalPlaceholderArticleProps {
  title: string
  summary: string
}

const temporaryLegalMainClass =
  ':uno: h-full overflow-y-auto bg-#fbfaf8 px-6 py-10 text-#101114 md:px-10'

const temporaryLegalArticleClass = ':uno: mx-auto max-w-3xl'

const temporaryLegalNoticeClass = cx(
  ':uno: m-0 rounded-3 border-2 border-dashed border-#d13b3b bg-#fff4f4',
  'px-4 py-3 text-4 font-800 uppercase tracking-0.5 text-#d13b3b',
)

const temporaryLegalTitleClass = ':uno: mt-6 m-0 text-8 font-900 leading-tight'

const temporaryLegalSummaryClass = ':uno: mt-4 text-4.25 leading-7 text-#555961'

export const LegalPlaceholderArticle = (props: LegalPlaceholderArticleProps) => {
  return (
    <main class={temporaryLegalMainClass}>
      <article class={temporaryLegalArticleClass}>
        <p class={temporaryLegalNoticeClass} role="status">
          Temporary placeholder page. Final legal copy is not published yet.
        </p>
        <h1 class={temporaryLegalTitleClass}>{props.title}</h1>
        <p class={temporaryLegalSummaryClass}>{props.summary}</p>
      </article>
    </main>
  )
}
