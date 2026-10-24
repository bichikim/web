/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeSpeechText} from '../index'

const NUMBER_FORMS = [
  {en: 'one', ko: '한', value: '1'},
  {en: 'two', ko: '두', value: '2'},
  {en: 'three', ko: '세', value: '3'},
  {en: 'four', ko: '네', value: '4'},
  {en: 'seven', ko: '일곱', value: '7'},
  {en: 'nine', ko: '아홉', value: '9'},
  {en: 'ten', ko: '열', value: '10'},
  {en: 'twenty', ko: '스무', value: '20'},
] as const
const KOREAN_QUANTITY_TEMPLATES = [
  '전시회가 작품 #점을 소개했어요.',
  '센터가 태블릿 #대를 대여했어요.',
  '창고에서 상자 #개를 옮겼어요.',
  '편집자가 원고 #장을 검토했어요.',
  '서점이 도감 #권을 진열했어요.',
  '정비소가 오토바이 #대를 수리했어요.',
  '학교가 참고서 #권을 구입했어요.',
  '행사장이 현수막 #장을 설치했어요.',
] as const
const ENGLISH_QUANTITY_TEMPLATES = [
  'The lab calibrated # sensors.',
  'The theater reserved # balconies.',
  'The archive digitized # manuscripts.',
  'The hospital acquired # scanners.',
  'The workshop repaired # bicycles.',
  'The gallery framed # portraits.',
  'The depot dispatched # trailers.',
  'The school distributed # calculators.',
] as const
const KOREAN_IDENTIFIER_TEMPLATES = [
  '제#차 세계 대전을 설명해요.',
  '제#조의 적용 범위예요.',
  '#대강 사업을 언급했어요.',
  '#대 요소라는 제목이에요.',
  '시즌 #이 공개됐어요.',
  '프로토콜 #을 사용해요.',
  '규격 #을 지원해요.',
  '문서 번호 #를 확인해요.',
] as const
const ENGLISH_IDENTIFIER_TEMPLATES = [
  'Act # opens with a storm.',
  'Book # is the final volume.',
  'Protocol # is enabled.',
  'Season # premieres tomorrow.',
  'Grade # starts in autumn.',
  'District # elected a mayor.',
  'Platform # is closed.',
  'Plan # was cancelled.',
  'Studio # became famous.',
  'Highway # crosses the state.',
  'Flight # departed early.',
  'Firefox # was released.',
] as const
const UNLABELED_TEMPLATES = [
  {language: 'ko', text: '기록은 #라고만 적혀 있어요.'},
  {language: 'ko', text: '화면 값 #이 무엇인지는 몰라요.'},
  {language: 'ko', text: '결과로 #이 나타났어요.'},
  {language: 'ko', text: '문맥 없이 #만 전달됐어요.'},
  {language: 'en', text: 'The raw value # appeared.'},
  {language: 'en', text: 'Only # was visible.'},
  {language: 'en', text: 'The output contained # without a label.'},
  {language: 'en', text: 'Someone wrote # with no context.'},
] as const
const IDENTIFIER_VALUES = ['2', '7', '42', '128'] as const
const UNLABELED_VALUES = ['17', '31', '42', '88'] as const

const replaceMarker = (template: string, value: string) => template.replace('#', value)

describe('normalizeSpeechText adversarial vocabulary', () => {
  it.each(
    KOREAN_QUANTITY_TEMPLATES.flatMap((template) =>
      NUMBER_FORMS.map(
        ({ko, value}) =>
          [replaceMarker(template, value), replaceMarker(template, `${ko} `)] as const,
      ),
    ),
  )('should pronounce unseen Korean quantities in %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })

  it.each(
    ENGLISH_QUANTITY_TEMPLATES.flatMap((template) =>
      NUMBER_FORMS.map(
        ({en, value}) => [replaceMarker(template, value), replaceMarker(template, en)] as const,
      ),
    ),
  )('should pronounce unseen English quantities in %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'en', text})).toBe(expected)
  })

  it.each(
    [...KOREAN_IDENTIFIER_TEMPLATES, ...ENGLISH_IDENTIFIER_TEMPLATES].flatMap((template) =>
      IDENTIFIER_VALUES.map((value) => replaceMarker(template, value)),
    ),
  )('should preserve unseen identifiers and named numbers in %s', (text) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(normalizeSpeechText({language, text})).toBe(text)
  })

  it.each(
    UNLABELED_TEMPLATES.flatMap(({language, text}) =>
      UNLABELED_VALUES.map((value) => [language, replaceMarker(text, value)] as const),
    ),
  )('should abstain when quantity meaning is missing in %s: %s', (language, text) => {
    expect(normalizeSpeechText({language, text})).toBe(text)
  })
})
