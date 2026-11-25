import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import Dexie from 'dexie'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {DEFAULT_POFFO_SPEECH} from '@winter-love/wallpaper/settings/library-model'
import type {PoffoConversation} from '@winter-love/wallpaper/settings/conversation'
import {SPoffoConversationSettings} from '../../src/components/SPoffoConversationSettings'
import {codexConversation} from '../../src/features/conversation/codex'
import 'virtual:uno.css'

vi.mock('../../src/features/conversation/codex', () => ({
  codexConversation: {available: vi.fn(), models: vi.fn()},
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

test.each([320, 560])(
  'should choose an account model at %spx and retain it after reopening settings',
  async (width) => {
    vi.mocked(codexConversation.available).mockReturnValue(true)
    vi.mocked(codexConversation.models).mockResolvedValue([
      {default: true, id: 'chosen-model', name: 'My Codex model'},
      {default: false, id: 'another-model', name: 'Another model'},
    ])
    const name = `conversation-settings-${crypto.randomUUID()}`
    const repository = createLibraryRepository(name)
    try {
      const widget = await repository.addWidget('builtin:ash')
      const [speech, setSpeech] = createSignal(DEFAULT_POFFO_SPEECH)
      const change = async (conversation: NonNullable<typeof widget.speech>['conversation']) => {
        const next = {...speech(), conversation}
        await repository.configureSpeech(widget.id, next)
        setSpeech(next)
      }
      const view = render(() => (
        <div class="box-border p-3" style={{'--test-width': `${width}px`}}>
          <div class="box-border w-[var(--test-width)] max-w-full">
            <SPoffoConversationSettings value={speech().conversation} onChange={change} />
          </div>
        </div>
      ))
      await expect.poll(() => vi.mocked(codexConversation.models).mock.calls.length).toBe(1)
      await page.getByRole('combobox', {name: '대화 모델'}).click()
      await page.getByRole('option', {name: 'Codex · My Codex model'}).click()
      await expect
        .element(page.getByRole('combobox', {name: '대화 모델'}))
        .toHaveTextContent('Codex · My Codex model')
      const saved = (await repository.read()).widgets[0].speech!
      expect(saved.conversation).toEqual({codexModel: 'chosen-model', provider: 'codex'})
      view.unmount()
      render(() => (
        <div class="w-72 p-3">
          <SPoffoConversationSettings value={saved.conversation} onChange={change} />
        </div>
      ))
      await expect
        .element(page.getByRole('combobox', {name: '대화 모델'}))
        .toHaveTextContent('Codex · My Codex model')
      await page.getByRole('combobox', {name: '대화 모델'}).click()
      expect(screen.queryByRole('option', {name: 'Codex · 기본 모델'})).toBeNull()
      await page
        .getByRole('listbox')
        .screenshot({path: `__screenshots__/conversation-models-${width}.png`})
      const bounds = screen.getByRole('listbox').getBoundingClientRect()
      expect(bounds.left).toBeGreaterThanOrEqual(0)
      expect(bounds.right).toBeLessThanOrEqual(innerWidth)
    } finally {
      cleanup()
      repository.close()
      await Dexie.delete(name)
    }
  },
)

test('should remove a retired model on refresh and persist the local selection', async () => {
  vi.mocked(codexConversation.available).mockReturnValue(true)
  vi.mocked(codexConversation.models).mockResolvedValue([
    {default: true, id: 'previous-model', name: 'Previous model'},
  ])
  const name = `retired-model-${crypto.randomUUID()}`
  const repository = createLibraryRepository(name)
  try {
    const widget = await repository.addWidget('builtin:ash')
    const [conversation, setConversation] = createSignal<PoffoConversation>({
      codexModel: 'previous-model',
      provider: 'codex',
    })
    await repository.configureSpeech(widget.id, {
      ...DEFAULT_POFFO_SPEECH,
      conversation: conversation(),
    })
    const change = async (value: PoffoConversation) => {
      await repository.configureSpeech(widget.id, {...DEFAULT_POFFO_SPEECH, conversation: value})
      setConversation(value)
    }
    render(() => (
      <div class="w-72 p-3">
        <SPoffoConversationSettings value={conversation()} onChange={change} />
      </div>
    ))
    await expect
      .element(page.getByRole('combobox', {name: '대화 모델'}))
      .toHaveTextContent('Previous model')
    vi.mocked(codexConversation.models).mockResolvedValue([
      {default: true, id: 'current-model', name: 'Current model'},
    ])
    await page.getByRole('combobox', {name: '대화 모델'}).click()
    await expect
      .element(page.getByRole('combobox', {name: '대화 모델'}))
      .toHaveTextContent('Gemma 4 E2B · 로컬')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Gemma 4 E2B · 로컬',
      'Codex · Current model',
    ])
    expect((await repository.read()).widgets[0].speech?.conversation).toEqual({provider: 'local'})
    await page
      .getByRole('listbox')
      .screenshot({path: '__screenshots__/conversation-models-retired.png'})
  } finally {
    cleanup()
    repository.close()
    await Dexie.delete(name)
  }
})
