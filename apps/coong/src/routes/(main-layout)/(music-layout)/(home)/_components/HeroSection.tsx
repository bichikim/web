import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import landingPiano from '../landing-piano.webp'

const LANDING_PIANO_WIDTH = 1774
const LANDING_PIANO_HEIGHT = 887

const heroContentWrapperClass = cx(
  ':uno: relative flex min-h-[540px] max-w-1500px flex-col justify-center',
  'px-6 py-14 md:min-h-[555px] md:px-10 lg:px-24',
)

const heroExplorePianoClass = cx(
  ':uno: mt-10 inline-flex h-14 items-center gap-4 rounded-4 bg-#111216',
  'px-6 text-4.25 font-700 text-white no-underline',
  'shadow-[0_16px_34px_rgba(17,18,22,0.22)] transition-transform hover:-translate-y-0.5',
)

export const HeroSection = () => {
  return (
    <section class=":uno: relative min-h-[540px] overflow-hidden bg-#f5f1eb md:min-h-[555px]">
      <img
        src={landingPiano}
        alt=""
        width={LANDING_PIANO_WIDTH}
        height={LANDING_PIANO_HEIGHT}
        fetchpriority="high"
        sizes="100vw"
        class=":uno: absolute inset-0 h-full w-full object-cover object-center"
        aria-hidden="true"
      />
      <div class=":uno: absolute inset-0 bg-gradient-to-r from-#fbfaf8 via-#fbfaf8/72 to-#fbfaf8/0" />
      <div class={heroContentWrapperClass}>
        <div class=":uno: max-w-570px">
          <h1 class=":uno: m-0 text-14 font-900 leading-[0.98] tracking-0 text-#101114 sm:text-17 md:text-20">
            Play beautiful,
            <br />
            Share music.
          </h1>
          <p class=":uno: mt-8 max-w-560px text-5 leading-8 text-#555961 md:text-5.5 md:leading-9">
            Coong is the place where piano meets creativity. Play, create, and share your music with
            the world.
          </p>
          <A href="/piano" class={heroExplorePianoClass}>
            Explore Piano
            <span class=":uno: h-5 w-5 i-tabler:chevron-right" aria-hidden="true" />
          </A>
        </div>
      </div>
    </section>
  )
}
