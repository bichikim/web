import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import type {SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {SPoffoSemanticSettings} from '../../src/components/SPoffoSemanticSettings'
import {SemanticContext} from '../../src/features/semantics/context'
import {useSemanticHost} from '../../src/features/semantics/use-semantic-host'
import {useSemanticActions} from '../../src/features/semantics/use-semantic-actions'
import {useSemanticInput} from '../../src/features/semantics/use-semantic-input'
import {createSemanticModel} from '../../src/features/semantics/model'
import 'virtual:uno.css'

vi.mock('../../src/features/semantics/model', () => ({createSemanticModel: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
test('should register and persist a character action connection, then react to test and incoming text', async () => {
  vi.mocked(createSemanticModel).mockReturnValue({
    dispose: vi.fn(),
    embed: vi.fn(async (texts: readonly string[]) =>
      texts.map((text) => (text.includes('슬픔') ? [0, 1] : [1, 0])),
    ),
  })
  const repository = createLibraryRepository(`semantic-integration-${crypto.randomUUID()}`)
  const widget = await repository.addWidget('character')
  const [bindings, setBindings] = createSignal<readonly SemanticBinding[]>([])
  const [incoming, setIncoming] = createSignal('')
  const [expression, setExpression] = createSignal<string | undefined>(undefined)
  const player = {
    getExpression: expression,
    resetMotionHistory: vi.fn(),
    setExpression: (id?: string) => {
      setExpression(id)
      return true
    },
    startMotion: vi.fn(),
  }
  const actions = [{action: {id: 'ノート', kind: 'expression' as const}, label: '노트 들기'}]
  const change = async (value: readonly SemanticBinding[]) => {
    setBindings(value)
    await repository.configureSpeech(widget.id, {
      enabled: true,
      semanticBindings: value,
      x: 0.9,
      y: 0.05,
    })
  }
  const view = render(() => {
    const host = useSemanticHost({
      widgets: () => [
        {...widget, speech: {enabled: true, semanticBindings: bindings(), x: 0.9, y: 0.05}},
      ],
    })
    useSemanticActions({
      actions: () => actions,
      bindings,
      player: () => player,
      widgetId: () => widget.id,
    })
    useSemanticInput({text: incoming, widgetId: () => widget.id})
    return (
      <SemanticContext.Provider value={host}>
        <main class="mx-auto max-w-96 p-3">
          <SPoffoSemanticSettings
            widgetId={widget.id}
            actions={actions}
            value={bindings()}
            onChange={change}
          />
          <output aria-label="적용된 행동">{expression() ?? '없음'}</output>
        </main>
      </SemanticContext.Provider>
    )
  })
  try {
    fireEvent.click(screen.getByRole('button', {name: '연결 추가'}))
    const description = screen.getByRole('textbox', {name: '연결 1 감정·행동·내용'})
    fireEvent.input(description, {target: {value: '기쁨과 성공을 축하하는 내용'}})
    fireEvent.click(screen.getByRole('combobox', {name: '연결 1 행동'}))
    fireEvent.click(screen.getByRole('option', {name: '노트 들기'}))
    await expect
      .poll(async () => (await repository.read()).widgets[0]?.speech?.semanticBindings)
      .toEqual(bindings())
    fireEvent.input(screen.getByRole('textbox', {name: '분석할 문장'}), {
      target: {value: '기쁨을 느껴요'},
    })
    await expect
      .poll(() => screen.getByRole('button', {name: '문장 테스트'}).hasAttribute('disabled'))
      .toBe(false)
    fireEvent.click(screen.getByRole('button', {name: '문장 테스트'}))
    await expect
      .poll(() => screen.getByRole('status', {name: '적용된 행동'}).textContent)
      .toBe('ノート')
    expect(screen.getByLabelText('연결 1 매칭 점수')).toHaveTextContent('1.00')
    setIncoming('슬픔을 느껴요')
    await expect
      .poll(() => screen.getByRole('status', {name: '적용된 행동'}).textContent)
      .toBe('없음')
    const manual = screen.getByRole('button', {name: '연결 1 수동 실행'})
    const embed = vi.mocked(createSemanticModel).mock.results[0].value.embed
    const analyses = embed.mock.calls.length
    fireEvent.click(manual)
    await expect
      .poll(() => screen.getByRole('status', {name: '적용된 행동'}).textContent)
      .toBe('ノート')
    expect(manual).toHaveAttribute('aria-pressed', 'true')
    expect(embed).toHaveBeenCalledTimes(analyses)
    fireEvent.click(screen.getByRole('button', {name: '연결 1 수동 실행 중지'}))
    await expect
      .poll(() => screen.getByRole('status', {name: '적용된 행동'}).textContent)
      .toBe('없음')
    fireEvent.click(screen.getByRole('switch', {name: '연결 1 사용'}))
    await expect
      .poll(() => screen.getByRole('status', {name: '적용된 행동'}).textContent)
      .toBe('없음')
  } finally {
    view.unmount()
    await repository.removeWidget(widget.id)
    repository.close()
  }
})
