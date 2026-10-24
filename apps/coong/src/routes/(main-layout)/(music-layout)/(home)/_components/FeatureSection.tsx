import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {For} from 'solid-js'

const featureItems = [
  {
    description: 'Play the piano online with a rich and realistic experience.',
    href: '/piano',
    icon: 'i-tabler:piano',
    label: 'Piano',
    tone: 'warm',
  },
  {
    description: 'Discover, listen, and share beautiful piano music.',
    href: '/musics',
    icon: 'i-tabler:music',
    label: 'Musics',
    tone: 'cool',
  },
]

const featureCardLinkClass = cx(
  ':uno: group relative min-h-34 overflow-hidden rounded-3 bg-white p-5',
  'text-#101114 no-underline shadow-[0_16px_40px_rgba(36,31,24,0.07)] ring-1 ring-black/4',
)

const featureCardIconShellClass = cx(
  ':uno: flex h-20 w-20 shrink-0 items-center justify-center rounded-4 bg-white',
  'text-10 shadow-[0_10px_24px_rgba(17,18,22,0.08)] ring-1 ring-black/5',
)

const FeatureCard = (props: {item: (typeof featureItems)[number]}) => {
  const isWarm = () => props.item.tone === 'warm'

  return (
    <A
      href={props.item.href}
      class={featureCardLinkClass}
      classList={{
        'bg-#f1eefb': !isWarm(),
        'bg-#f5f0e7': isWarm(),
      }}
    >
      <div
        class=":uno: absolute inset-y-0 right-0 w-48 opacity-70"
        classList={{
          'bg-[linear-gradient(90deg,rgba(138,103,242,0)_0%,rgba(138,103,242,0.16)_100%)]':
            !isWarm(),
          'bg-[radial-gradient(ellipse_at_bottom,#d9c8a9_0%,rgba(217,200,169,0)_62%)]': isWarm(),
        }}
      />
      <div class=":uno: relative flex h-full items-center gap-7">
        <span
          class={featureCardIconShellClass}
          classList={{
            'text-#171717': isWarm(),
            'text-#272238': !isWarm(),
          }}
        >
          <span class={`:uno: h-10 w-10 ${props.item.icon}`} aria-hidden="true" />
        </span>
        <span class=":uno: min-w-0 flex-1">
          <span class=":uno: block text-6 font-800 leading-7">{props.item.label}</span>
          <span class=":uno: mt-3 block max-w-270px text-4 leading-5.5 text-#555961">
            {props.item.description}
          </span>
        </span>
        <span class=":uno: h-6 w-6 shrink-0 i-tabler:chevron-right transition-transform group-hover:translate-x-1" />
      </div>
    </A>
  )
}

export const FeatureSection = () => {
  return (
    <section class=":uno: bg-#fbfaf8 px-6 pb-9 pt-8 md:px-10 lg:px-24">
      <div class=":uno: mx-auto max-w-1350px">
        <div class=":uno: text-center">
          <h2 class=":uno: m-0 text-7.5 font-900 leading-9 tracking-0 text-#101114 md:text-8">
            What you can do on Coong
          </h2>
          <p class=":uno: mt-3 text-4.25 leading-6 text-#646972">
            A simple and elegant space for piano lovers and creators.
          </p>
        </div>
        <div class=":uno: mt-6 grid gap-6 md:grid-cols-2">
          <For each={featureItems}>{(item) => <FeatureCard item={item} />}</For>
        </div>
      </div>
    </section>
  )
}
