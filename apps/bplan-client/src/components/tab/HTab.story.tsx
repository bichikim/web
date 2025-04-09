import type {Meta, StoryObj} from 'storybook-solidjs'
import {HTabProvider, HTabProviderProps} from './HTabProvider'
import {HTabContent} from './HTabContent'
import {HTabButton} from './HTabButton'
import {HTabList} from './HTabList'

const Template = (props: HTabProviderProps) => {
  return (
    <HTabProvider {...props}>
      <div class="flex flex-col gap-4 bg-gray-100 p-4">
        <HTabList class="flex gap-2 b-b-black b-b-1">
          <HTabButton value="tab1">첫 번째 탭</HTabButton>
          <HTabButton value="tab2">두 번째 탭</HTabButton>
          <HTabButton value="tab3">세 번째 탭</HTabButton>
        </HTabList>
        <div>
          <HTabContent name="tab1">
            <div>첫 번째 탭 컨텐츠</div>
          </HTabContent>
          <HTabContent name="tab2">
            <div>두 번째 탭 컨텐츠</div>
          </HTabContent>
          <HTabContent name="tab3">
            <div>세 번째 탭 컨텐츠</div>
          </HTabContent>
          <HTabContent name="default">
            <div>기본 탭 컨텐츠</div>
          </HTabContent>
        </div>
      </div>
    </HTabProvider>
  )
}

const meta = {
  args: {
    //
  },
  component: Template,
  parameters: {
    layout: 'centered',
  },
  title: 'BPlan/Components/Tab/HTab',
} satisfies Meta<typeof Template>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    //
  },
}

export const ActiveTab2: Story = {
  args: {
    activeTab: 'tab2',
  },
}
