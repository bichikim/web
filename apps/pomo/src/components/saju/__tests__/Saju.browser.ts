import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {type SajuReadingServices, useSajuReading} from 'src/features/saju/use-saju-reading'
import {Saju} from '../Saju'

const draftKey = 'pomo:saju:form-draft:v1'
let previousDraft: string | null

beforeEach(() => {
  previousDraft = localStorage.getItem(draftKey)
  localStorage.removeItem(draftKey)
})
afterEach(() => {
  cleanup()
  if (previousDraft === null) {
    localStorage.removeItem(draftKey)
  } else {
    localStorage.setItem(draftKey, previousDraft)
  }
})

const openReading = () => {
  const createClient = vi.fn(() => ({dispose: vi.fn(), generate: vi.fn()}))
  const isDownloaded = vi.fn(async () => true)
  const startTextModel = vi.fn(async () => ({status: 'complete' as const}))
  const services: SajuReadingServices = {
    createClient,
    defaultModelId: () => 'gemma-4-e2b',
    downloads: {cancel: vi.fn(), downloads: () => [], startTextModel},
    downloadSize: () => '1GB',
    isDownloaded,
    supportsModel: () => true,
  }
  render(() => createComponent(Saju, {reading: useSajuReading({services})}))
  return {createClient, isDownloaded, startTextModel}
}

const selectBirthField = async (label: string, value: string) => {
  const trigger = page.getByRole('button', {name: new RegExp(`^${label}(?:\\s|$)`, 'u')})
  await trigger.click()
  await userEvent.keyboard(`${value}{Enter}`)
  await expect.element(trigger).toHaveTextContent(value)
}

const selectBirthDate = async () => {
  await selectBirthField('양력 연도', '1995')
  await selectBirthField('양력 월', '3')
  await selectBirthField('양력 일', '16')
}

it.each(['양력', '음력'])(
  'should request an unselected %s birth date before accessing the model',
  async (calendar) => {
    const services = openReading()
    await page.getByRole('radio', {exact: true, name: calendar}).click()
    await page.getByRole('textbox', {name: '질문'}).fill('제 성향은?')
    await page.getByRole('button', {exact: true, name: '사주 풀이 생성'}).click()
    await expect.element(page.getByRole('alert')).toHaveTextContent('생년월일을 선택해 주세요.')
    await expect.element(page.getByRole('button', {name: '사주 풀이 생성'})).toBeEnabled()
    expect(services.createClient).not.toHaveBeenCalled()
    expect(services.isDownloaded).not.toHaveBeenCalled()
    expect(services.startTextModel).not.toHaveBeenCalled()
  },
)

it('should accept a selected birth date after showing the missing-date guidance', async () => {
  const services = openReading()
  await page.getByRole('textbox', {name: '질문'}).fill('나의 미래는?')
  await page.getByRole('button', {exact: true, name: '사주 풀이 생성'}).click()
  await expect.element(page.getByRole('alert')).toHaveTextContent('생년월일을 선택해 주세요.')
  await selectBirthDate()
  await page.getByRole('button', {exact: true, name: '사주 풀이 생성'}).click()
  await expect
    .element(page.getByRole('region', {name: '사주 풀이 결과'}))
    .toHaveTextContent('재물, 일, 관계')
  expect(page.getByRole('alert').query()).toBeNull()
  expect(services.createClient).not.toHaveBeenCalled()
  expect(services.isDownloaded).not.toHaveBeenCalled()
})

it('should keep a valid selected birth date available for a calculated answer', async () => {
  const services = openReading()
  await selectBirthDate()
  await page.getByRole('textbox', {name: '질문'}).fill('나의 미래는?')
  await page.getByRole('button', {exact: true, name: '사주 풀이 생성'}).click()
  await expect
    .element(page.getByRole('region', {name: '사주 풀이 결과'}))
    .toHaveTextContent('재물, 일, 관계')
  expect(page.getByRole('alert').query()).toBeNull()
  expect(services.createClient).not.toHaveBeenCalled()
  expect(services.isDownloaded).not.toHaveBeenCalled()
})

it.each([
  '미래는 어떨까요?',
  '앞날은 어떨까요?',
  '내 앞날은 어떨까요?',
  '미래 좀 알려줘',
  '운세 좀 봐줘',
])('should display topic guidance without accessing a model for %s', async (question) => {
  const services = openReading()
  await selectBirthDate()
  await page.getByRole('textbox', {name: '질문'}).fill(question)
  await page.getByRole('button', {exact: true, name: '사주 풀이 생성'}).click()
  expect(services.isDownloaded).not.toHaveBeenCalled()
  expect(services.createClient).not.toHaveBeenCalled()
  expect(services.startTextModel).not.toHaveBeenCalled()
  await expect
    .element(page.getByRole('region', {name: '사주 풀이 결과'}))
    .toHaveTextContent('재물, 일, 관계')
  expect(page.getByRole('alert').query()).toBeNull()
})

it('should display a diary day-stem fact without accessing a model', async () => {
  const services = openReading()
  await selectBirthDate()
  await page.getByRole('textbox', {name: '질문'}).fill('제 일기에 적을 내 일간은 무엇인가요?')
  await page.getByRole('button', {exact: true, name: '사주 풀이 생성'}).click()
  await expect
    .element(page.getByRole('region', {name: '사주 풀이 결과'}))
    .toHaveTextContent('입력한 생년월일의 일간은 병(丙)입니다.')
  expect(services.createClient).not.toHaveBeenCalled()
  expect(services.isDownloaded).not.toHaveBeenCalled()
  expect(services.startTextModel).not.toHaveBeenCalled()
})
