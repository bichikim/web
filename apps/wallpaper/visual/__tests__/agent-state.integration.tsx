// oxlint-disable no-await-in-loop -- Each state transition must release the preceding pose on the same player.
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as playerModule from '@winter-love/puppet/player'
import assetUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import {SPuppetBackground} from '../../src/components/SPuppetBackground'
import {builtinConnectionProfile} from '../../src/features/connection-profiles/builtin-profile'
import type {AgentState} from '@winter-love/wallpaper/settings/agent-state'
import {sendSemanticFrame} from '../../src/features/semantics/channel'
import 'virtual:uno.css'

vi.mock('@winter-love/puppet/player', async (importOriginal) => {
  const player = await importOriginal<typeof playerModule>()
  return {
    ...player,
    createPlayer: vi.fn(player.createPlayer),
    preparePuppetDocument: vi.fn(player.preparePuppetDocument),
  }
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

test('should render the default Ash state behaviors and release every pose when its selected state ends', async () => {
  const failure = vi.fn()
  const ready = Promise.withResolvers<void>()
  const handleError = (cause: unknown) => {
    failure(cause)
    ready.reject(cause)
  }
  const source = await (await fetch(assetUrl)).blob()
  const profile = builtinConnectionProfile('builtin:ash')!
  render(() => (
    <div class="h-96 w-65 bg-white" role="region" aria-label="기본 상태 동작">
      <SPuppetBackground
        assetId={() => 'builtin:ash'}
        load={async () => source}
        onError={handleError}
        onMotions={() => ready.resolve()}
        lipsyncId={() => 'default-state-widget'}
        agentBindings={() => profile.connections.agentBindings}
      />
    </div>
  ))
  await ready.promise
  const player = await vi.mocked(playerModule.createPlayer).mock.results[0].value
  const transitions: ReadonlyArray<{state: AgentState; values: Readonly<Record<string, number>>}> =
    [
      {state: 'working', values: {Param75: 1, Param81: 1, Param89: 1, Param92: 1, Param93: 1}},
      {state: 'tool', values: {Param65: 0, Param89: 0, Param93: 0}},
      {state: 'question', values: {Param65: 0, Param81: 1, Param90: 1}},
      {state: 'approval', values: {Param90: 0, Param107: 1}},
      {state: 'response', values: {Param71: 1, Param86: 1, Param107: 0}},
      {state: 'interrupted', values: {Param71: 0, Param86: 0, Param88: 1}},
      {state: 'error', values: {Param69: 1, Param88: 0}},
      {state: 'connected', values: {Param69: 0, Param75: 0, Param81: 0}},
    ]
  for (const {state, values} of transitions) {
    globalThis.dispatchEvent(
      new CustomEvent('poffo-agent-state:default-state-widget', {detail: {[state]: true}}),
    )
    for (const [id, value] of Object.entries(values)) {
      await expect.poll(() => player.getParameterValue(id), {timeout: 5000}).toBeCloseTo(value, 1)
    }
    if (state === 'working' || state === 'response') {
      await page
        .getByRole('region', {name: '기본 상태 동작'})
        .screenshot({path: `__screenshots__/ash-state-${state}.png`})
    }
  }
  expect(screen.getByRole('region', {name: '기본 상태 동작'})).toBeVisible()
  expect(failure).not.toHaveBeenCalled()
  expect(playerModule.createPlayer).toHaveBeenCalledOnce()
}, 60_000)

test('should favor selected response content and ignore background replies', async () => {
  const ready = Promise.withResolvers<void>()
  const source = await (await fetch(assetUrl)).blob()
  const profile = builtinConnectionProfile('builtin:ash')!
  const widgetId = 'content-response-widget'
  render(() => (
    <div class="h-96 w-65 bg-white" role="region" aria-label="내용 우선 응답 동작">
      <SPuppetBackground
        assetId={() => 'builtin:ash'}
        load={async () => source}
        onError={(cause) => ready.reject(cause)}
        onMotions={() => ready.resolve()}
        lipsyncId={() => widgetId}
        agentBindings={() => profile.connections.agentBindings}
        semanticBindings={() => profile.connections.semanticBindings}
      />
    </div>
  ))
  await ready.promise
  const player = await vi.mocked(playerModule.createPlayer).mock.results[0].value
  const expression = vi.spyOn(player, 'setExpressionLayer')
  globalThis.dispatchEvent(
    new CustomEvent(`poffo-agent-state:${widgetId}`, {detail: {working: true}}),
  )
  await expect
    .poll(() => [player.getParameterValue('Param89'), player.getParameterValue('Param93')], {
      timeout: 5000,
    })
    .toEqual([1, 1])
  await sendSemanticFrame({previewId: 'ash:press-right', scores: {}, widgetId})
  expect(expression).toHaveBeenCalledWith(expect.any(String), '게임패드 들기')
  expect(expression).toHaveBeenCalledWith(expect.any(String), '오른손 버튼 누르기')
  await sendSemanticFrame({scores: {}, widgetId})
  globalThis.dispatchEvent(
    new CustomEvent(`poffo-agent-state:${widgetId}`, {detail: {connected: true, response: true}}),
  )
  await expect
    .poll(
      () => ['Param71', 'Param86', 'Param89', 'Param93'].map((id) => player.getParameterValue(id)),
      {timeout: 5000},
    )
    .toEqual([0, 0, 0, 0])
  await sendSemanticFrame({scores: {'ash:sad-eyes': 1}, widgetId})
  await expect.poll(() => player.getParameterValue('Param73'), {timeout: 5000}).toBeCloseTo(1)
  expression.mockClear()
  globalThis.dispatchEvent(
    new CustomEvent('poffo-agent-state:background-widget', {detail: {response: true}}),
  )
  await sendSemanticFrame({scores: {'ash:excited': 1}, widgetId: 'background-widget'})
  expect(expression).not.toHaveBeenCalled()
  expect(player.getParameterValue('Param71')).toBeCloseTo(0)
  await page
    .getByRole('region', {name: '내용 우선 응답 동작'})
    .screenshot({path: '__screenshots__/ash-response-sad-content.png'})
  await sendSemanticFrame({fallbackId: 'ash:notes-detail', scores: {}, widgetId})
  await expect
    .poll(() => [player.getParameterValue('Param89'), player.getParameterValue('Param93')], {
      timeout: 5000,
    })
    .toEqual([1, 1])
  expect(player.getParameterValue('Param86')).toBeCloseTo(0)
  await sendSemanticFrame({narration: {phase: 'ended'}, scores: {}, widgetId})
  await expect
    .poll(
      () => ['Param71', 'Param86', 'Param89', 'Param93'].map((id) => player.getParameterValue(id)),
      {timeout: 5000},
    )
    .toEqual([0, 0, 0, 0])
  globalThis.dispatchEvent(
    new CustomEvent(`poffo-agent-state:${widgetId}`, {detail: {working: true}}),
  )
  await expect
    .poll(() => [player.getParameterValue('Param89'), player.getParameterValue('Param93')], {
      timeout: 5000,
    })
    .toEqual([1, 1])
}, 60_000)
