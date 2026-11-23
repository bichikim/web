import {expect, it, vi} from 'vitest'

import {generateSajuAnswer} from '../generate-answer'
import type {GenerateSajuRequest} from '../messages'

const REQUEST: GenerateSajuRequest = {
  messages: [{content: '사주 질문과 계산값', role: 'user'}],
  type: 'generate',
}

it('should preserve the consultation body from a single generation', async () => {
  const generated = '2020년생은 비겁이 2개입니다.\n예시 문구 없이 답합니다.'
  const generate = vi.fn(async () => generated)

  expect(await generateSajuAnswer(REQUEST, generate)).toEqual({
    text: generated,
    type: 'complete',
  })
  expect(generate).toHaveBeenCalledExactlyOnceWith(REQUEST.messages)
})

it('should return an empty model response without a content check', async () => {
  const generate = vi.fn(async () => '')

  expect(await generateSajuAnswer(REQUEST, generate)).toEqual({text: '', type: 'complete'})
  expect(generate).toHaveBeenCalledTimes(1)
})

it('should remove a reference-only opening while preserving the consultation paragraphs', async () => {
  const body = '함께 일할 때 역할을 분명히 나눠 보세요.\n\n돈을 쓸 때도 우선순위를 정해 보세요.'
  const generate = vi.fn(async () => `항목을 정리해 보면, ${body}`)

  expect(await generateSajuAnswer(REQUEST, generate)).toEqual({text: body, type: 'complete'})
  expect(generate).toHaveBeenCalledExactlyOnceWith(REQUEST.messages)
})

it('should retain a nonempty local response consisting only of an opening', async () => {
  const text = '아래 내용을 참고해 보면, '
  expect(await generateSajuAnswer(REQUEST, async () => text)).toEqual({text, type: 'complete'})
})

it.each(['재물은?', '연애는?'])(
  'should retain the career reading and clearly limit past annual follow-up %s',
  async (followUp) => {
    const question = `지난 해에 시작한 직장이 나한테 맞을까? ${followUp}`
    const request: GenerateSajuRequest = {...REQUEST, messages: [{content: question, role: 'user'}]}
    const generated = '함께 배우고 도움을 주고받는 환경이라면 잘 맞을 수 있어요.'
    const generate = vi.fn(async () => generated)
    const answer = await generateSajuAnswer(request, generate)

    expect(generate).toHaveBeenCalledExactlyOnceWith(request.messages)
    expect(answer.text).toContain(generated)
    expect(answer.text).toContain('특정 연도의 재물운이나 연애운은 계산하지 않아요.')
  },
)

it('should leave a work-only question and an answer already stating the limit alone', async () => {
  const work = '지난 해에 시작한 직장이 나한테 맞을까?'
  const answer = '협력할 수 있는 환경이라면 잘 맞을 수 있어요.'
  const explicitLimit = '특정 연도 재물운은 계산할 수 없어요.'
  await expect(
    generateSajuAnswer({...REQUEST, messages: [{content: work, role: 'user'}]}, async () => answer),
  ).resolves.toMatchObject({text: answer})
  await expect(
    generateSajuAnswer(
      {...REQUEST, messages: [{content: `${work} 재물은?`, role: 'user'}]},
      async () => `${answer} ${explicitLimit}`,
    ),
  ).resolves.toMatchObject({text: `${answer} ${explicitLimit}`})
})
