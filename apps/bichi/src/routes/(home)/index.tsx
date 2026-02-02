import {clientOnly} from '@solidjs/start'

const ScrollStage = clientOnly(() =>
  import('../../components/scroll-stage/ScrollStage').then((m) => ({
    default: m.ScrollStage,
  })),
)

let contentRef: HTMLElement | undefined

export default function HomePage() {
  return (
    <>
      <div
        class="content fixed inset-0 z-10 overflow-hidden bg-transparent"
        ref={(element) => {
          contentRef = element
        }}
      >
        <div class="scroll__content mx-auto max-w-[1500px] text-slate-900">
          <section class="section min-h-screen flex flex-col justify-center px-8 py-24">
            <span class="section__title-number text-6xl font-bold opacity-60">00</span>
            <h2 class="section__title-text mt-2 flex items-baseline text-4xl font-bold" data-section-title="Bichi Kim">
              <svg
                class="inline-block h-[3.75rem] w-auto"
                viewBox="0 0 200 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMinYMid meet"
                aria-hidden
              >
                <defs>
                  <linearGradient id="bichi-name-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#a163f1" />
                    <stop offset="22%" stop-color="#6363f1" />
                    <stop offset="40%" stop-color="#3498ea" />
                    <stop offset="67%" stop-color="#40dfa3" />
                    <stop offset="100%" stop-color="#40dfa3" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <text
                  x="0"
                  y="30"
                  fill="url(#bichi-name-gradient)"
                  font-weight="bold"
                  font-size="28"
                  font-family="ui-sans-serif, system-ui, sans-serif"
                >
                  Bichi Kim
                </text>
              </svg>
            </h2>
            <div class="section__title-arrow mt-4 flex gap-2">
              <span class="block h-1 w-8 bg-current" />
              <span class="block h-1 w-8 bg-current" />
            </div>
            <p class="section__paragraph mt-6 max-w-md text-lg opacity-90">Senior Front-end Developer</p>
            <nav class="mt-4 flex gap-2" aria-label="Contact links">
              <a
                href="mailto:bichi@live.co.kr"
                class="text-slate-900 opacity-90 transition hover:opacity-100"
                aria-label="Email"
              >
                <span class="i-tabler:mail size-6 block" aria-hidden />
              </a>
              <a
                href="https://github.com/bichikim"
                target="_blank"
                rel="noopener noreferrer"
                class="text-slate-900 opacity-90 transition hover:opacity-100"
                aria-label="GitHub"
              >
                <span class="i-tabler:brand-github size-6 block" aria-hidden />
              </a>
              <a
                href="https://bichi.kim/"
                target="_blank"
                rel="noopener noreferrer"
                class="text-slate-900 opacity-90 transition hover:opacity-100"
                aria-label="Notion"
              >
                <span class="i-tabler:brand-notion size-6 block" aria-hidden />
              </a>
            </nav>
          </section>

          <section class="section min-h-screen flex flex-col justify-center px-8 py-24">
            <span class="section__title-number text-6xl font-bold opacity-60">01</span>
            <h2 class="section__title-text mt-2 text-4xl font-bold">About</h2>
            <div class="section__title-arrow mt-4 flex gap-2">
              <span class="block h-1 w-8 bg-current" />
              <span class="block h-1 w-8 bg-current" />
            </div>
            <p class="section__paragraph mt-6 max-w-md text-lg opacity-90">
              Based on front-end and back-end experience, I work as a senior front-end developer. I dislike the
              irrational and like automation and high efficiency. I'm not perfect but keep reflecting and improving.
              Lately I'm learning AI and preparing for the next step; my goal is to contribute meaningfully through a
              venture someday.
            </p>
            <a
              href="https://bichi.kim/"
              target="_blank"
              rel="noopener noreferrer"
              class={
                'section__button mt-8 inline-block w-fit rounded-full border-2 ' +
                'border-slate-900 px-6 py-3 font-medium transition ' +
                'hover:bg-slate-900 hover:text-white hover:border-slate-900'
              }
            >
              Learn more
            </a>
          </section>

          <section class="section min-h-screen flex flex-col justify-center px-8 py-24">
            <span class="section__title-number text-6xl font-bold opacity-60">02</span>
            <h2 class="section__title-text mt-2 text-4xl font-bold">Work</h2>
            <div class="section__title-arrow mt-4 flex gap-2">
              <span class="block h-1 w-8 bg-current" />
              <span class="block h-1 w-8 bg-current" />
            </div>
            <p class="section__paragraph mt-6 max-w-md text-lg opacity-90">
              Full-stack JavaScript and functional programming. I treat testing and documentation as part of development
              and work with TDD. My Notion holds how I work: problem-solving process, retrospectives, postmortems, Slack
              discussions, and databases (Projects, HR, Articles, Links, Files, Design).
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <a
                href="https://coong.io"
                target="_blank"
                rel="noopener noreferrer"
                class={
                  'section__button inline-block rounded-full border-2 ' +
                  'border-slate-900 px-6 py-3 font-medium transition ' +
                  'hover:bg-slate-900 hover:text-white hover:border-slate-900'
                }
              >
                coong.io
              </a>
              <a
                href="https://web-storybook-5c4ehvuys-bichis-projects.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                class={
                  'section__button inline-block rounded-full border-2 ' +
                  'border-slate-900 px-6 py-3 font-medium transition ' +
                  'hover:bg-slate-900 hover:text-white hover:border-slate-900'
                }
              >
                components
              </a>
              <a
                href="https://deploy-chronicles.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                class={
                  'section__button inline-block rounded-full border-2 ' +
                  'border-slate-900 px-6 py-3 font-medium transition ' +
                  'hover:bg-slate-900 hover:text-white hover:border-slate-900'
                }
              >
                AI review bot slides
              </a>
            </div>
          </section>

          <section class="section min-h-screen flex flex-col justify-center px-8 py-24">
            <span class="section__title-number text-6xl font-bold opacity-60">03</span>
            <h2 class="section__title-text mt-2 text-4xl font-bold">Contact</h2>
            <div class="section__title-arrow mt-4 flex gap-2">
              <span class="block h-1 w-8 bg-current" />
              <span class="block h-1 w-8 bg-current" />
            </div>
            <p class="section__paragraph mt-6 max-w-md text-lg opacity-90">
              My docs (Notion), GitHub, pet project (Coong.io), and component Storybook — all linked in one place.
            </p>
            <a
              href="https://github.com/bichikim"
              target="_blank"
              rel="noopener noreferrer"
              class={
                'section__button mt-8 inline-block w-fit rounded-full border-2 ' +
                'border-slate-900 px-6 py-3 font-medium transition ' +
                'hover:bg-slate-900 hover:text-white hover:border-slate-900'
              }
            >
              GitHub
            </a>
          </section>
        </div>

        <div
          class="layout__line fixed left-0 top-0 h-1 w-full origin-left bg-slate-900"
          style={{'transform-origin': 'left'}}
        />
      </div>

      <ScrollStage contentRef={() => contentRef} fallback={null} />
    </>
  )
}
