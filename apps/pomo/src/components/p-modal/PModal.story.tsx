import {createEffect, createSignal, Show} from 'solid-js'
import {Tabs} from '@kobalte/core/tabs'
import {expect, fn, userEvent, waitFor, within} from 'storybook/test'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import * as m from '@paraglide/message'
import {PModal, type PModalProps} from './PModal'
import {PButton} from '../p-button/PButton'
import {PSettingsTabList} from '../settings/TabList'
import sceneSource from '../../features/focus-room-animation/assets/concept-art/day-typing.webp'

interface ModalStoryProps extends PModalProps {
  readonly withTabs?: boolean
}

interface ModalPlayContext {
  readonly canvasElement: HTMLElement
}

const meta = {
  args: {
    children: <p class="m-0 text-sm leading-6">모달의 주요 콘텐츠가 들어가는 영역입니다.</p>,
    isOpen: true,
    onCloseAutoFocus: fn(),
    onOpenChange: fn(),
    placement: 'top',
    size: 'expanded',
    title: 'Pomofi 설정',
    titleVisibility: 'visually-hidden',
    withTabs: true,
  },
  argTypes: {
    description: {control: 'text', table: {category: 'Props'}},
    isOpen: {control: 'boolean', table: {category: 'Props'}},
    onCloseAutoFocus: {table: {category: 'Events'}, type: {name: 'function'}},
    onOpenChange: {table: {category: 'Events'}, type: {name: 'function'}},
    placement: {control: 'select', options: ['center', 'top']},
    size: {control: 'select', options: ['regular', 'wide', 'expanded', 'full']},
    title: {control: 'text', table: {category: 'Props'}},
    titleVisibility: {control: 'select', options: ['visible', 'visually-hidden']},
    withTabs: {control: 'boolean'},
  },
  component: PModal,
  parameters: {
    backgrounds: {default: 'black'},
    layout: 'fullscreen',
  },
  render: (props) => {
    const [isOpen, setIsOpen] = createSignal(false)
    createEffect(() => setIsOpen(props.isOpen))
    const [triggerElement, setTriggerElement] = createSignal<HTMLButtonElement | null>(null)
    const handleOpen = (button: HTMLButtonElement) => {
      setTriggerElement(button)
      setIsOpen(true)
    }
    const handleOpenChange = (nextOpen: boolean) => {
      setIsOpen(nextOpen)
      props.onOpenChange(nextOpen)
    }
    const handleCloseAutoFocus = () => {
      triggerElement()?.focus()
      props.onCloseAutoFocus?.()
    }

    return (
      <main class="grid min-h-screen place-items-center p-6">
        <img
          alt=""
          src={sceneSource}
          class="pointer-events-none fixed inset-0 h-full w-full object-cover"
        />
        <div class="relative">
          <PButton onPress={handleOpen}>모달 열기</PButton>
        </div>
        <Tabs defaultValue="general" class="contents">
          <PModal
            {...props}
            navigation={props.withTabs ? <PSettingsTabList /> : undefined}
            isOpen={isOpen()}
            onCloseAutoFocus={handleCloseAutoFocus}
            onOpenChange={handleOpenChange}
            title={props.title}
          >
            <Show when={props.withTabs} fallback={props.children}>
              <Tabs.Content value="general">{props.children}</Tabs.Content>
              <Tabs.Content value="background">배경 설정 콘텐츠 예시입니다.</Tabs.Content>
              <Tabs.Content value="events">이벤트 설정 콘텐츠 예시입니다.</Tabs.Content>
              <Tabs.Content value="feeds">피드 설정 콘텐츠 예시입니다.</Tabs.Content>
              <Tabs.Content value="dialogue-library">대화 설정 콘텐츠 예시입니다.</Tabs.Content>
              <Tabs.Content value="user">사용자 설정 콘텐츠 예시입니다.</Tabs.Content>
              <Tabs.Content value="guide">설명서 콘텐츠 예시입니다.</Tabs.Content>
              <Tabs.Content value="credits">크레딧 콘텐츠 예시입니다.</Tabs.Content>
            </Show>
          </PModal>
        </Tabs>
      </main>
    )
  },
  title: 'Pomo/Components/PModal',
} satisfies Meta<ModalStoryProps>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'With Tabs',
  play: async ({canvasElement}: ModalPlayContext) => {
    const page = within(canvasElement.ownerDocument.body)
    const dialog = page.getByRole('dialog', {name: 'Pomofi 설정'})

    await waitFor(() => expect(dialog).toBeVisible())
    const header = getComputedStyle(dialog.querySelector('header')!)
    await expect(header.borderTopWidth).toBe('0px')
    await expect(header.borderLeftWidth).toBe('0px')
    await expect(header.borderBottomWidth).toBe('1px')
    await expect(dialog).toHaveAttribute('data-size', 'expanded')
    await expect(dialog).toHaveAttribute('data-placement', 'top')
    await userEvent.click(page.getByRole('tab', {name: m.settings_tab_background()}))
    await expect(page.getByRole('tabpanel')).toHaveTextContent('배경 설정 콘텐츠 예시입니다.')
    await userEvent.click(page.getByRole('button', {name: m.common_close()}))
    await waitFor(() =>
      expect(page.queryByRole('dialog', {name: 'Pomofi 설정'})).not.toBeInTheDocument(),
    )
    await userEvent.click(page.getByRole('button', {name: '모달 열기'}))
    await waitFor(() => expect(page.getByRole('dialog')).toBeVisible())
    await userEvent.click(page.getByRole('tab', {name: m.settings_tab_general()}))
  },
}

export const Closed: Story = {
  args: {isOpen: false},
}

export const Basic: Story = {
  args: {
    description: '필요한 내용을 확인할 수 있어요.',
    placement: 'center',
    size: 'regular',
    title: '기본 모달',
    titleVisibility: 'visible',
    withTabs: false,
  },
  name: 'Without Tabs',
  play: async ({canvasElement}: ModalPlayContext) => {
    const page = within(canvasElement.ownerDocument.body)
    const dialog = page.getByRole('dialog', {name: '기본 모달'})
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(page.queryByRole('tablist')).not.toBeInTheDocument()
    await expect(page.getByRole('heading', {name: '기본 모달'})).toBeVisible()
    await expect(dialog).toHaveAttribute('data-placement', 'center')
    await expect(dialog).toHaveAttribute('data-size', 'regular')
    const header = getComputedStyle(dialog.querySelector('header')!)
    await expect(header.borderTopWidth).toBe('0px')
    await expect(header.borderBottomWidth).toBe('1px')
    await userEvent.click(page.getByRole('button', {name: m.common_close()}))
    await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(page.getByRole('button', {name: '모달 열기'}))
    await waitFor(() => expect(page.getByRole('dialog')).toBeVisible())
  },
}
