import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import type {
  SajuGenerateRequest,
  SajuGenerationResponse,
} from 'src/features/saju/generation-messages'
import {type SajuReadingServices, useSajuReading} from 'src/features/saju/use-saju-reading'
import {Saju} from '../Saju'

const draftKey = 'pomo:saju:form-draft:v1'
const modelAnswer = '일간은 병(丙)입니다. 면접에서는 준비한 사례를 구체적으로 설명해 보세요.'
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
  const createClient = vi.fn((onResponse: (response: SajuGenerationResponse) => void) => ({
    dispose: vi.fn(),
    generate: vi.fn((request: SajuGenerateRequest) => {
      onResponse({requestId: request.requestId, text: modelAnswer, type: 'complete'})
    }),
  }))
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

it('should send the original compound question after selecting the missing birth date', async () => {
  const question = '  내일 면접 잘 볼까?\n제 일간을 알려줘  '
  const services = openReading()
  const submit = page.getByRole('button', {exact: true, name: '사주 풀이 생성'})
  await page.getByRole('textbox', {name: '질문'}).fill(question)
  await submit.click()
  await expect.element(page.getByRole('alert')).toHaveTextContent('생년월일을 선택해 주세요.')
  await selectBirthDate()
  await submit.click()

  await expect
    .element(page.getByRole('region', {name: '사주 풀이 결과'}))
    .toHaveTextContent(modelAnswer)
  const {generate} = services.createClient.mock.results[0].value
  expect(generate).toHaveBeenCalledOnce()
  expect(JSON.parse(generate.mock.calls[0][0].messages[1].content)).toMatchObject({
    chart: {day: {hanja: '丙午'}, hour: null},
    question,
  })
  expect(services.isDownloaded).toHaveBeenCalledOnce()
  expect(services.startTextModel).not.toHaveBeenCalled()
  expect(page.getByRole('alert').query()).toBeNull()
})
