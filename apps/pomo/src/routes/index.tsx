import {Meta, Title} from '@solidjs/meta'
import {cx} from 'class-variance-authority'

import {PStudio} from '../components/PStudio'

const MAIN_CLASSES = cx(
  'relative h-dvh w-full overflow-hidden bg-#120f0d text-#fffaf1',
  'bg-[radial-gradient(circle_at_50%_0%,#3c3329_0%,#211b16_38%,#120f0d_76%)]',
)

export default function HomePage() {
  return (
    <main class={MAIN_CLASSES}>
      <Title>Pomo</Title>
      <Meta
        content="핀과 함께 장면, 포모도로, 음악, 대화와 피드를 한곳에서 사용하는 집중 앱입니다."
        name="description"
      />
      <div class="relative h-full w-full">
        <PStudio />
      </div>
    </main>
  )
}
