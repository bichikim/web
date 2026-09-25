import {For, type JSX} from 'solid-js'
import {cx} from 'class-variance-authority'

import {PAppReturnLink} from '../p-app-return-link/PAppReturnLink'
import {PServicePolicyLinks} from '../p-service-policy-links/PServicePolicyLinks'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1',
  'xs:px-8 xs:py-16',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)
const ARTICLE_CLASSES = cx(
  'rounded-8 border border-white/10 bg-#211a2b/88 p-5',
  'shadow-[0_1.75rem_6.25rem_rgba(5,2,10,0.38)] backdrop-blur-xl xs:p-8 lg:p-10',
)
const FOOTER_CLASSES = cx(
  'grid gap-2 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)
const CONTENT_LINK_CLASSES = cx(
  'text-#d8cbd9 underline decoration-white/25 underline-offset-4 transition-colors',
  'hover:text-white focus-visible:text-white',
)

export type ServicePolicyKind = 'privacy' | 'refund' | 'terms'
export type ServicePolicyPlatform = 'apps-in-toss' | 'web'

export interface ServicePolicyContentsItem {
  readonly id: string
  readonly label: string
}

export interface ServicePolicyNotice {
  readonly title: JSX.Element
  readonly description: JSX.Element
}

export interface PServicePolicyDocumentProps {
  readonly appReturnLink?: JSX.Element
  readonly appReturnLinkPosition?: 'after-policy' | 'before-policy'
  readonly backHref?: string
  readonly backLabel?: string
  readonly businessInformation?: JSX.Element
  readonly children: JSX.Element
  readonly contents: ReadonlyArray<ServicePolicyContentsItem>
  readonly contentsLabel: string
  readonly contentsTitle: JSX.Element
  readonly currentPolicy: ServicePolicyKind
  readonly description: JSX.Element
  readonly eyebrow: JSX.Element
  readonly footer: JSX.Element
  readonly metadata?: JSX.Element
  readonly notice?: ServicePolicyNotice
  readonly platform: ServicePolicyPlatform
  readonly title: JSX.Element
}

const renderNotice = (notice: ServicePolicyNotice | undefined) => {
  if (!notice) {
    return null
  }

  return (
    <aside class="rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 p-5" role="note">
      <h2 class="m-0 text-base font-750 text-#ffd4de">{notice.title}</h2>
      <p class="mb-0 mt-2 text-sm leading-7 text-#d8cbd9">{notice.description}</p>
    </aside>
  )
}

export const PServicePolicyDocument = (props: PServicePolicyDocumentProps) => {
  const appReturnLink = () =>
    props.appReturnLink ?? <PAppReturnLink href={props.backHref} label={props.backLabel} />

  return (
    <main class={MAIN_CLASSES}>
      <div class={BACKGROUND_CLASSES} />
      <div class="relative mx-auto grid w-full max-w-6xl gap-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          {props.appReturnLinkPosition === 'before-policy' && appReturnLink()}
          <PServicePolicyLinks
            currentPolicy={props.currentPolicy}
            platform={props.platform}
            tone="overlay"
          />
          {props.appReturnLinkPosition !== 'before-policy' && appReturnLink()}
        </div>

        <header>
          <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">
            {props.eyebrow}
          </p>
          <h1 class="mb-0 mt-4 max-w-3xl text-3xl font-800 tracking--0.04em xs:text-5xl xs:leading-tight">
            {props.title}
          </h1>
          <p class="mb-0 mt-5 max-w-3xl text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8">
            {props.description}
          </p>
          {props.metadata}
          {props.businessInformation}
        </header>

        {renderNotice(props.notice)}

        <div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <nav aria-label={props.contentsLabel} class="lg:sticky lg:top-8 lg:self-start">
            <p class="m-0 text-xs font-750 tracking-[0.18em] text-#8f8297 uppercase">
              {props.contentsTitle}
            </p>
            <ol class="mb-0 mt-4 grid list-none gap-3 p-0 text-sm">
              <For each={props.contents}>
                {(item) => (
                  <li>
                    <a class={CONTENT_LINK_CLASSES} href={`#${item.id}`}>
                      {item.label}
                    </a>
                  </li>
                )}
              </For>
            </ol>
          </nav>

          <article class={ARTICLE_CLASSES}>
            <div class="grid gap-8">{props.children}</div>
          </article>
        </div>

        <footer class={FOOTER_CLASSES}>{props.footer}</footer>
      </div>
    </main>
  )
}
