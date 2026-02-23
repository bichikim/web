import {Title} from '@solidjs/meta'
import {Show, Suspense} from 'solid-js'
import {SDinosaurTrigger} from 'src/components/dinosaur-trigger'
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
      <p class="text-lg mb-8">Click on the dinosaur for an honest opinion.</p>

      <SDinosaurTrigger onClick={goToNext} />

      <Suspense fallback={<p class="mt-12 text-gray-400">Loading opinions...</p>}>
        <SOpinionDisplay message={currentMessage()} variant={messages().length === 0 ? 'empty' : 'default'} />
      </Suspense>

      <SFooterLinks links={FOOTER_LINKS} separator="or" />
    </SHomeLayout>
  )
}
