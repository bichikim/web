import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import type {PoffoSpeech} from '@winter-love/wallpaper/settings/library-model'
import {SEMANTIC_LIMIT, type SemanticBinding} from '@winter-love/wallpaper/settings/semantics'
import {SPoffoBehaviorSettings} from '../../src/components/SPoffoBehaviorSettings'
import 'virtual:uno.css'

afterEach(cleanup)
const INTERACTION_BUDGET = 200

it.each([1, 36, SEMANTIC_LIMIT])(
  'should keep random actions editable with %s semantic connections without retaining old editors',
  (count) => {
    const bindings: readonly SemanticBinding[] = Array.from({length: count}, (_, index) => ({
      enabled: true,
      id: `binding-${index}`,
      mode: 'toggle',
      parameterId: null,
      text: `연결 ${index + 1}`,
      threshold: 0.75,
    }))
    const [value, setValue] = createSignal<PoffoSpeech>({
      enabled: true,
      randomActions: {enabled: false, probability: 0.5},
      semanticBindings: bindings,
      x: 0.9,
      y: 0.05,
    })
    const start = Date.now()
    render(() => (
      <SPoffoBehaviorSettings
        source={{actions: () => [], loading: () => false, parameters: () => []}}
        value={value()}
        onChange={setValue}
      />
    ))
    const mounted = Date.now() - start
    const toggle = screen.getByRole('switch', {name: '랜덤 행동 사용'})
    const mutations: number[] = []
    for (const _ of [0, 1, 2, 3]) {
      const before = Date.now()
      fireEvent.click(toggle)
      mutations.push(Date.now() - before)
    }
    expect(value().randomActions?.enabled).toBe(false)
    expect(mounted).toBeLessThan(INTERACTION_BUDGET)
    expect(Math.max(...mutations)).toBeLessThan(INTERACTION_BUDGET)
    expect(value().semanticBindings).toBe(bindings)
    expect(screen.getAllByRole('group', {name: /^연결 \d+$/})).toHaveLength(count)
    cleanup()
    expect(screen.queryByRole('switch', {name: '랜덤 행동 사용'})).toBeNull()
    console.info(JSON.stringify({bindings: count, mounted, mutations}))
  },
)
