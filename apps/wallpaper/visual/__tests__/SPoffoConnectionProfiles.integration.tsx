import {cleanup, render, screen} from '@solidjs/testing-library'
import Dexie from 'dexie'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createBuiltinLibrary} from '../../src/features/builtin-assets/create-builtin-library'
import {SPoffoConnectionProfiles} from '../../src/components/SPoffoConnectionProfiles'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'
import type {ConnectionProfile} from '@winter-love/wallpaper/settings/connections'
import ash from '../../src/features/connection-profiles/ash.json'
import 'virtual:uno.css'

const repositories: ReturnType<typeof createBuiltinLibrary>[] = []
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  repositories.forEach((item) => item.close())
  repositories.length = 0
  await Dexie.delete('wallpaper-library')
})

it('should round-trip connections, reject invalid JSON, and restore defaults', async () => {
  const repository = createBuiltinLibrary('wallpaper-library')
  repositories.push(repository)
  const original = await repository.addWidget('builtin:ash')
  await repository.configureConnections(original.id, {
    agentBindings: {working: {off: 0, on: 1, parameterId: 'Param71'}},
    lipsync: {parameterId: 'ParamMouthOpenY', source: 'speech'},
    trackingBindings: {headX: {inverted: true, parameterId: 'ParamAngleX'}},
    trackingOptions: {headMaximumX: 18, headMinimumX: -12},
  })
  const [widget, setWidget] = createSignal<PoffoWidget>((await repository.read()).widgets[0]!)
  const parameters = [
    'ParamAngleX',
    'ParamMouthOpenY',
    ...ash.connections.semanticBindings.map((item) => item.parameterId),
  ].map((id) => ({defaultValue: 0, id, maximum: 30, minimum: -30}))
  let url = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function captureDownload(this: HTMLAnchorElement) {
      url = this.href
    },
  )
  const view = render(() => <SPoffoConnectionProfiles widget={widget()} parameters={parameters} />)
  await userEvent.click(screen.getByRole('button', {name: '연결 JSON 저장'}))
  const json = await (await fetch(url)).text()
  const exported: ConnectionProfile = JSON.parse(json)
  expect(exported.connections).toMatchObject({
    lipsync: {parameterId: 'ParamMouthOpenY', source: 'speech'},
    semanticBindings: ash.connections.semanticBindings,
    trackingBindings: {headX: {inverted: true, parameterId: 'ParamAngleX'}},
    trackingOptions: {headMaximumX: 18, headMinimumX: -12},
  })
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!
  await userEvent.upload(input, new File(['{broken'], 'broken.json', {type: 'application/json'}))
  await expect.poll(() => screen.queryByRole('alert')?.textContent).toContain('형식이나 값')
  const changed = {
    ...exported,
    connections: {
      ...exported.connections,
      semanticBindings: [{...exported.connections.semanticBindings![0]!, threshold: 0.9}],
    },
  }
  await userEvent.upload(
    input,
    new File([JSON.stringify(changed)], 'connections.json', {type: 'application/json'}),
  )
  await expect
    .poll(async () => (await repository.read()).widgets[0]?.speech?.semanticBindings)
    .toEqual(changed.connections.semanticBindings)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  repository.close()
  const reopened = createBuiltinLibrary('wallpaper-library')
  repositories.push(reopened)
  const stored = (await reopened.read()).widgets[0]!
  expect(stored.speech?.semanticBindings).toEqual(changed.connections.semanticBindings)
  expect(stored.speech?.lipsync).toEqual(exported.connections.lipsync)
  setWidget(stored)
  await userEvent.click(screen.getByRole('button', {name: '기본 연결 적용'}))
  await expect
    .poll(async () => (await reopened.read()).widgets[0]?.speech?.semanticBindings)
    .toEqual(ash.connections.semanticBindings)
})
