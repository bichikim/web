import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {DurationField} from './pomodoro-duration-editor/Field'
import {LayerToggle} from './layer-review/LayerToggle'
import {PFormMessage} from './PFormMessage'
import {PSelect} from './PSelect'
import {PTextField} from './PTextField'

const SharedControls = () => (
  <main
    class="grid w-96 gap-5 rounded-panel bg-background p-6 text-foreground"
    data-testid="pomo-shared-controls"
  >
    <PTextField label="이메일" onChange={() => undefined} type="email" value="hello@pomofi.app" />
    <PSelect
      description="검사할 눈 프레임을 선택합니다."
      label="눈 깜박임 단계"
      onChange={() => undefined}
      options={[
        {label: '자동 깜박임', value: 'auto'},
        {label: '열린 눈', value: 'open'},
      ]}
      value="auto"
    />
    <DurationField
      accessibleLabel="집중 시간(분)"
      label="집중"
      max={120}
      min={1}
      onInput={() => undefined}
      suffix="분"
      value="25"
    />
    <LayerToggle
      checked
      description="선택한 레이어를 장면에 표시합니다."
      label="레이어 표시"
      onChange={() => undefined}
    />
    <PFormMessage tone="error">이메일 주소를 다시 확인해 주세요.</PFormMessage>
  </main>
)

const meta = {
  component: SharedControls,
  parameters: {layout: 'centered'},
  title: 'Pomo/Components/SharedControls',
} satisfies Meta<typeof SharedControls>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
