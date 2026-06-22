import {FeatureSection} from './_components/FeatureSection'
import {HeroSection} from './_components/HeroSection'
import {HomeFooter} from './_components/HomeFooter'
import {HomeHeader} from './_components/HomeHeader'
import landingPiano from './landing-piano.webp'

export const route = {
  info: {
    meta: {
      description: 'Coong is the place where piano meets creativity.',
      image: landingPiano,
      title: 'Coong',
    },
    public: true,
  },
} satisfies RouteDefinition

export default function HomePage() {
  return (
    <>
      <main class=":uno: h-full overflow-y-auto bg-#fbfaf8 text-#101114">
        <div class=":uno: min-h-full flex flex-col">
          <HomeHeader />
          <HeroSection />
          <FeatureSection />
          <HomeFooter />
        </div>
      </main>
    </>
  )
}
