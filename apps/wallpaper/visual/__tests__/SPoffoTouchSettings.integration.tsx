import Dexie from 'dexie'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createStore, reconcile} from 'solid-js/store'
import {afterEach, expect, test} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {DEFAULT_POFFO_TOUCH, type PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import {DEFAULT_POFFO_SPEECH} from '@winter-love/wallpaper/settings/library-model'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import {SPoffoTouchSettings} from '../../src/components/SPoffoTouchSettings'
import 'virtual:uno.css'

const names: string[] = []
const repositories: ReturnType<typeof createLibraryRepository>[] = []
afterEach(async () => {
  cleanup()
  repositories.splice(0).forEach((repository) => repository.close())
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)))
})

test('should edit touch controls at 320px and retain them after reopening storage', async () => {
  const database = `touch-ui-${crypto.randomUUID()}`
  names.push(database)
  const repository = createLibraryRepository(database)
  repositories.push(repository)
  const widget = await repository.addWidget('character')
  const [state, setState] = createStore<{touch: PoffoTouch}>({
    touch: {
      ...DEFAULT_POFFO_TOUCH,
      chains: [['head', 'arm', 'ParamLeg']],
      inverseKinematics: false,
    },
  })
  const value = () => state.touch
  const save = async (touch: PoffoTouch) => {
    await repository.configureSpeech(widget.id, {...DEFAULT_POFFO_SPEECH, touch})
    setState('touch', reconcile(touch))
  }
  const parameter = {
    axis: 'z' as const,
    defaultValue: 0,
    dimensions: 3,
    id: 'head',
    maximum: 1,
    minimum: -1,
    name: '고개',
    parts: ['face'],
  }
  render(() => (
    <div class="box-border w-80 bg-white p-3">
      <SPoffoTouchSettings
        value={value()}
        onChange={save}
        source={{
          error: () => null,
          loading: () => false,
          parameters: () => [parameter],
          touchParameters: () => [
            parameter,
            {...parameter, id: 'arm', name: '팔'},
            {...parameter, id: 'ParamLeg', name: '다리'},
          ],
        }}
      />
    </div>
  ))
  await userEvent.click(screen.getByRole('switch', {name: '캐릭터 터치 사용'}))
  await expect.poll(() => value().enabled).toBe(true)
  const sensitivity = screen.getByRole('spinbutton', {name: '터치 드래그 감도'})
  expect(sensitivity).toHaveValue('100')
  expect(screen.queryByRole('spinbutton', {name: '터치 드래그 거리'})).toBeNull()
  fireEvent.input(sensitivity, {target: {value: '200'}})
  fireEvent.blur(sensitivity)
  await expect.poll(() => value().distance).toBe(100)
  const amount = screen.getByRole('spinbutton', {name: '터치 클릭 강도'})
  fireEvent.input(amount, {target: {value: '8'}})
  fireEvent.blur(amount)
  await expect.poll(() => value().amount).toBe(0.08)
  expect(screen.queryByRole('combobox', {name: '고개 드래그 축'})).toBeNull()
  expect(screen.queryByRole('combobox', {name: '팔 드래그 축'})).toBeNull()
  const add = screen.getByRole('button', {name: '터치 파라미터 추가'})
  await userEvent.click(add)
  const search = screen.getByRole('searchbox', {name: '파라미터 검색'})
  expect(search).toHaveFocus()
  fireEvent.input(search, {target: {value: 'HEAD'}})
  expect(screen.queryByRole('button', {name: '팔 arm'})).toBeNull()
  fireEvent.keyDown(search, {isComposing: true, key: 'Enter'})
  expect(value().parameters).toBeUndefined()
  await page
    .getByRole('dialog', {name: '터치 파라미터 추가'})
    .screenshot({path: '__screenshots__/character-touch-search.png'})
  await userEvent.click(screen.getByRole('button', {name: '고개 head'}))
  await expect.poll(() => value().parameters?.head).toEqual({axis: 'auto'})
  expect(search).toHaveFocus()
  expect(screen.getByRole('dialog', {name: '터치 파라미터 추가'})).toBeVisible()
  fireEvent.input(search, {target: {value: '팔'}})
  await userEvent.keyboard('{Enter}')
  await expect.poll(() => value().parameters?.arm).toEqual({axis: 'auto'})
  expect(screen.queryByRole('combobox', {name: '고개 드래그 축'})).toBeNull()
  expect(screen.getByRole('button', {name: '팔 편집'})).toBeVisible()
  fireEvent.input(search, {target: {value: '없는 이름'}})
  expect(screen.getByText('검색 결과가 없어요.')).toBeVisible()
  await userEvent.keyboard('{Enter}')
  expect(Object.keys(value().parameters ?? {})).toHaveLength(2)
  fireEvent.input(search, {target: {value: 'paramleg'}})
  await userEvent.keyboard('{ArrowDown}{Enter}')
  await expect.poll(() => value().parameters?.ParamLeg).toEqual({axis: 'auto'})
  expect(Object.keys(value().parameters ?? {})).toHaveLength(3)
  await userEvent.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', {name: '터치 파라미터 추가'})).toBeNull()
  expect(add).toHaveFocus()
  await userEvent.click(screen.getByRole('button', {name: '고개 편집'}))
  await userEvent.click(screen.getByRole('combobox', {name: '고개 드래그 축'}))
  await userEvent.click(screen.getByRole('option', {name: 'Shift + 세로'}))
  await expect.poll(() => value().parameters?.head?.axis).toBe('z')
  await userEvent.click(screen.getByRole('switch', {name: '고개 방향 반전'}))
  await expect.poll(() => value().parameters?.head?.invert).toBe(true)
  const region = screen.getByRole('region', {name: '캐릭터 터치'})
  expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth)
  await page
    .getByRole('region', {name: '캐릭터 터치'})
    .screenshot({path: '__screenshots__/character-touch-settings.png'})
  await userEvent.click(screen.getByRole('button', {name: '고개 터치 삭제'}))
  await expect.poll(() => Object.keys(value().parameters ?? {}).sort()).toEqual(['ParamLeg', 'arm'])
  expect(screen.queryByRole('combobox', {name: '고개 드래그 축'})).toBeNull()
  expect(document.activeElement).not.toBe(document.body)
  await userEvent.click(add)
  const reopenedSearch = screen.getByRole('searchbox', {name: '파라미터 검색'})
  expect(reopenedSearch).toHaveValue('')
  expect(screen.getByRole('button', {name: '고개 head'})).toBeVisible()
  expect(screen.queryByRole('button', {name: '팔 arm'})).toBeNull()
  expect(screen.queryByRole('button', {name: '다리 ParamLeg'})).toBeNull()
  await userEvent.keyboard('{Escape}')
  repository.close()
  const reopened = createLibraryRepository(database)
  repositories.push(reopened)
  expect(
    (await reopened.read()).widgets.find((item) => item.id === widget.id)?.speech?.touch,
  ).toEqual(value())
})
