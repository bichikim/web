import {expect, it} from 'vitest'
import {parseTrainingJsonl} from '../training-jsonl'
import sample from '../../public/training.jsonl?raw'

const choice = {criteria: ['accept', 'reject'], instructions: 'Accept?', type: 'choice'}
const record = {question: choice, state: 'Request', target: [0, 1]}

it('should import multiple examples in file order with BOM, blank lines and CRLF', () => {
  const text = `\uFEFF${JSON.stringify(record)}\r\n\r\n${JSON.stringify({...record, state: {ticket: 2}})}\r\n`
  expect(parseTrainingJsonl(text)).toEqual([record, {...record, state: {ticket: 2}}])
})

it('should support choice descriptions, score distributions and boolean questions', () => {
  const records = [
    {...record, question: {...choice, criteria: {accept: 'allowed', reject: null}}},
    {
      question: {criteria: ['low', 'high'], instructions: 'Rate?', type: 'score'},
      state: null,
      target: [0.25, 0.75],
    },
    {
      question: {criteria: {false: 'no', true: 'yes'}, instructions: 'True?', type: 'noul'},
      state: ['x', true],
      target: [1, 0],
    },
  ]
  expect(parseTrainingJsonl(records.map((item) => JSON.stringify(item)).join('\n'))).toEqual(
    records,
  )
})

it('should report physical line numbers and reject the whole file on malformed JSON', () => {
  expect(() => parseTrainingJsonl(`${JSON.stringify(record)}\n\n{broken`)).toThrow(/3번째 줄/)
})

it('should reject missing state, invalid question types and ambiguous criteria', () => {
  expect(() => parseTrainingJsonl(JSON.stringify({question: choice, target: [0, 1]}))).toThrow(
    /state/,
  )
  expect(() =>
    parseTrainingJsonl(JSON.stringify({...record, question: {...choice, type: 'text'}})),
  ).toThrow(/질문 유형/)
  expect(() =>
    parseTrainingJsonl(
      JSON.stringify({...record, question: {...choice, criteria: ['same', 'same']}}),
    ),
  ).toThrow(/선택지/)
})

it('should reject mismatched, negative, nonfinite and unnormalized targets', () => {
  for (const target of [[1], [-1, 2], [0, 0], [0.2, 0.2]]) {
    expect(() => parseTrainingJsonl(JSON.stringify({...record, target}))).toThrow(/target/)
  }
  expect(() =>
    parseTrainingJsonl(
      '{"state":"x","question":{"type":"noul","instructions":"True?"},"target":[1e400,0]}',
    ),
  ).toThrow(/target/)
  expect(() =>
    parseTrainingJsonl(
      '{"state":1e400,"question":{"type":"noul","instructions":"True?"},"target":[1,0]}',
    ),
  ).toThrow(/유한/)
})

it('should reject an empty dataset instead of reporting a successful import', () => {
  expect(() => parseTrainingJsonl('\n  \n')).toThrow(/학습 예제가 없습니다/)
})

it('should parse the downloadable training file using the documented schema', () => {
  expect(parseTrainingJsonl(sample)).toHaveLength(2)
})
it('should reject choice descriptions that render indistinguishable options', () => {
  const question = {...choice, criteria: {a: 'b', 'a: b': null}}
  expect(() => parseTrainingJsonl(JSON.stringify({...record, question}))).toThrow(/선택지 표현/)
})
