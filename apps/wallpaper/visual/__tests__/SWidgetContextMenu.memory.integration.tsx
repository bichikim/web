// oxlint-disable no-await-in-loop -- Resource checkpoints require completed, sequential menu lifetimes.
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {cdp} from 'vitest/browser'
import type {CDPSession} from '@vitest/browser-playwright'
import {SEMANTIC_LIMIT} from '@winter-love/wallpaper/settings/semantics'
import {SWidgetContextMenu} from '../../src/components/SWidgetContextMenu'
import 'virtual:uno.css'

const WARMUP_CYCLES = 50
const HEAP_BUDGET = 1_048_576
const NODE_BUDGET = 32
const LISTENER_BUDGET = 8
interface MemorySample {
  readonly cycles: number
  readonly heapBytes: number
  readonly documents: number
  readonly nodes: number
  readonly listeners: number
  readonly observers: number
}
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
const trackObservers = () => {
  const Original = globalThis.ResizeObserver
  const active = new Set<ResizeObserver>()
  let created = 0
  let disconnected = 0
  vi.stubGlobal(
    'ResizeObserver',
    class extends Original {
      override observe(target: Element, options?: ResizeObserverOptions) {
        super.observe(target, options)
        if (!active.has(this)) {
          created += 1
          active.add(this)
        }
      }
      override disconnect() {
        super.disconnect()
        disconnected += Number(active.delete(this))
      }
    },
  )
  return {active: () => active.size, created: () => created, disconnected: () => disconnected}
}
const mountMenu = (count: number) => {
  const [shown, setShown] = createSignal(false)
  const [actions, setActions] = createSignal(
    Array.from({length: count}, (_, index) => ({
      checked: false,
      id: `action-${index}`,
      label: `행동 ${index}`,
    })),
  )
  const close = () => setShown(false)
  const toggle = () => undefined
  const view = render(() => (
    <Show when={shown()}>
      <SWidgetContextMenu
        x={40}
        y={40}
        actions={actions()}
        onToggle={toggle}
        onDismiss={close}
        onSelect={close}
      />
    </Show>
  ))
  let iteration = 0
  return {
    cycle: async (retained?: HTMLElement[]) => {
      setShown(true)
      const menu = screen.getByRole('menu', {name: 'Poffo 위젯 메뉴'})
      fireEvent.keyDown(menu, {key: 'End'})
      await nextFrame()
      iteration += 1
      setActions(
        actions()
          .map((action) => ({
            ...action,
            checked: !action.checked,
            label: `행동 ${action.id} · ${iteration}`,
          }))
          .toReversed(),
      )
      await nextFrame()
      retained?.push(menu)
      fireEvent.keyDown(menu, {key: 'Escape'})
      await nextFrame()
    },
    dispose: view.unmount,
  }
}
const sampleMemory = async (
  session: CDPSession,
  cycles: number,
  observers: number,
): Promise<MemorySample> => {
  await session.send('HeapProfiler.collectGarbage')
  const [heap, dom] = await Promise.all([
    session.send('Runtime.getHeapUsage'),
    session.send('Memory.getDOMCounters'),
  ])
  return {
    cycles,
    documents: dom.documents,
    heapBytes: heap.usedSize,
    listeners: dom.jsEventListeners,
    nodes: dom.nodes,
    observers,
  }
}
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test.each([
  {count: 1, phase: 'initial'},
  {count: SEMANTIC_LIMIT, phase: 'maximum'},
  {count: 1, phase: 'repeat'},
])(
  'should bound retained memory after 500 menu lifetimes ($phase, $count actions)',
  async ({count, phase}) => {
    const session: CDPSession = cdp()
    await session.send('HeapProfiler.enable')
    const observers = trackObservers()
    const fixture = mountMenu(count)
    const started = Date.now()
    try {
      for (let cycle = 0; cycle < WARMUP_CYCLES; cycle += 1) {
        await fixture.cycle()
      }
      await sampleMemory(session, 0, observers.active())
      const samples = [await sampleMemory(session, 0, observers.active())]
      let completed = 0
      for (const checkpoint of [100, 250, 500]) {
        for (; completed < checkpoint; completed += 1) {
          await fixture.cycle()
        }
        samples.push(await sampleMemory(session, completed, observers.active()))
      }
      const baseline = samples[0]!
      console.warn(
        `MENU_MEMORY_RESULT ${JSON.stringify({
          actions: count,
          created: observers.created(),
          disconnected: observers.disconnected(),
          elapsedMs: Date.now() - started,
          phase,
          samples,
          userAgent: navigator.userAgent,
        })}`,
      )
      for (const sample of samples.slice(1)) {
        expect(sample.heapBytes - baseline.heapBytes).toBeLessThanOrEqual(HEAP_BUDGET)
        expect(sample.nodes - baseline.nodes).toBeLessThanOrEqual(NODE_BUDGET)
        expect(sample.listeners - baseline.listeners).toBeLessThanOrEqual(LISTENER_BUDGET)
        expect(sample.documents).toBe(baseline.documents)
        expect(sample.observers).toBe(0)
      }
      expect(observers.created()).toBe(WARMUP_CYCLES + completed)
      expect(observers.disconnected()).toBe(observers.created())
      expect(screen.queryByRole('menu')).toBeNull()
    } finally {
      fixture.dispose()
      await session.send('HeapProfiler.disable')
    }
  },
  120_000,
)

test('should detect retained DOM and recover after releasing it', async () => {
  const session: CDPSession = cdp()
  await session.send('HeapProfiler.enable')
  const observers = trackObservers()
  const fixture = mountMenu(SEMANTIC_LIMIT)
  const retained: HTMLElement[] = []
  try {
    await fixture.cycle()
    await sampleMemory(session, 0, observers.active())
    const baseline = await sampleMemory(session, 0, observers.active())
    for (let cycle = 0; cycle < 20; cycle += 1) {
      await fixture.cycle(retained)
    }
    const leaking = await sampleMemory(session, 20, observers.active())
    retained.length = 0
    await nextFrame()
    const released = await sampleMemory(session, 20, observers.active())
    console.warn(`MENU_MEMORY_CONTROL ${JSON.stringify({baseline, leaking, released})}`)
    expect(leaking.nodes - baseline.nodes).toBeGreaterThan(SEMANTIC_LIMIT * 20)
    expect(released.nodes - baseline.nodes).toBeLessThanOrEqual(NODE_BUDGET)
    expect(released.listeners - baseline.listeners).toBeLessThanOrEqual(LISTENER_BUDGET)
    expect(released.observers).toBe(0)
  } finally {
    retained.length = 0
    fixture.dispose()
    await session.send('HeapProfiler.disable')
  }
}, 15_000)
