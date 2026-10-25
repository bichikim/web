import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import {requestCloudText} from 'src/features/cloud-text/client'
import {CLOUD_TEXT_RESPONSE} from 'src/features/cloud-text/__tests__/fixtures/response'
import {createSajuClient, useSajuReading} from 'src/features/saju'
import {isTextModelDownloaded} from 'src/features/text-generation'
import {supportsTextModel} from 'src/features/text-generation/supports-text-model'
import {Saju} from '../Saju'

vi.mock('src/features/cloud-text/client', () => ({requestCloudText: vi.fn()}))

const draftKey = 'pomo:saju:form-draft:v1'
let previousDraft: string | null

beforeEach(() => {
  vi.resetAllMocks()
  previousDraft = localStorage.getItem(draftKey)
  localStorage.setItem(
    draftKey,
    JSON.stringify({
      calendar: 'solar',
      gender: 'N',
      leapMonth: false,
      lunarDay: '',
      lunarMonth: '',
      lunarYear: '',
      question: '제 일은 어떨까요?',
      solarDay: '16',
      solarMonth: '3',
      solarYear: '1995',
      time: '',
      version: 1,
    }),
  )
})

afterEach(() => {
  cleanup()
  if (previousDraft === null) {
    localStorage.removeItem(draftKey)
  } else {
    localStorage.setItem(draftKey, previousDraft)
  }
})

it('should display a cloud reading from the submitted birth and question without model downloads', async () => {
  vi.mocked(requestCloudText).mockResolvedValue(CLOUD_TEXT_RESPONSE)
  const startTextModel = vi.fn()
  render(() =>
    createComponent(Saju, {
      reading: useSajuReading({
        services: {
          createClient: createSajuClient,
          defaultModelId: () => 'cloud',
          downloads: {cancel: vi.fn(), downloads: () => [], startTextModel},
          downloadSize: () => '',
          isDownloaded: (modelId) => isTextModelDownloaded({modelId}),
          supportsModel: (modelId) => supportsTextModel({modelId, webGpu: false}),
        },
      }),
    }),
  )
  await expect.element(page.getByRole('textbox', {name: '질문'})).toHaveValue('제 일은 어떨까요?')
  await page.getByRole('button', {exact: true, name: '사주 풀이 생성'}).click()
  await expect
    .element(page.getByRole('region', {name: '사주 풀이 결과'}))
    .toHaveTextContent(CLOUD_TEXT_RESPONSE.text)
  expect(requestCloudText).toHaveBeenCalledOnce()
  expect(vi.mocked(requestCloudText).mock.calls[0]![0].messages.at(-1)?.content).toContain(
    '제 일은 어떨까요?',
  )
  expect(startTextModel).not.toHaveBeenCalled()
  expect(page.getByRole('alert').query()).toBeNull()
})
