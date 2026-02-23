import {Icon} from '@iconify-icon/solid'
import {Title} from '@solidjs/meta'
import {Suspense} from 'solid-js'
import {SHamsterTrigger} from 'src/components/hamster-trigger'
import {SFooterLinks} from 'src/components/footer-links'
import {SOpinionDisplay} from 'src/components/opinion-display'
import {SHomeLayout} from 'src/components/page-layout'
import {BMC_URL} from 'src/config'
import {useOpinionCycle} from 'src/use/use-opinion-cycle'
import {useSupporters} from 'src/use/use-supporters'

const FOOTER_LINKS = [
  {href: BMC_URL, label: 'Submit your opinion'},
  {href: BMC_URL, label: 'help me cope with my grief and buy me a beer'},
]

export default function HomePage() {
  const supporters = useSupporters()
  const messages = () => supporters() ?? []
  const {currentMessage, goToNext} = useOpinionCycle(messages)

  return (
    <SHomeLayout>
      <Title>I fucking hate React.</Title>

      <div class="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
        <p class="flex items-center gap-3 text-4xl font-bold text-white">
          <Icon icon="mingcute:traffic-cone-fill" width="2.5em" height="2.5em" />
          Under construction.
        </p>
      </div>

      <div class="opacity-15 pointer-events-none select-none">
        <p class="text-lg mb-8">Click on the hamster for an honest opinion.</p>

        <SHamsterTrigger onClick={goToNext} class="w-30rem h-30rem" />

        <Suspense fallback={<p class="mt-12 text-gray-400">Loading opinions...</p>}>
          <SOpinionDisplay message={currentMessage()} variant={messages().length === 0 ? 'empty' : 'default'} />
        </Suspense>

        <SFooterLinks links={FOOTER_LINKS} separator="or" />
      </div>
    </SHomeLayout>
  )
}
