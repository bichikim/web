import {toKoreanNumber} from '../'
import {describe, expect, it} from 'vitest'

describe('to-korean-number', () => {
  it('should return korean string', () => {
    const result = toKoreanNumber(760_050_720)

    expect(result).toBe('칠억육천오만칠백이십')
  })

  it('should return korean string with many zero', () => {
    const result = toKoreanNumber('11200000')

    expect(result).toBe('천백이십만')
  })

  it('should return korean string so many zero with firstOne', () => {
    const result = toKoreanNumber('11200000010', {firstOne: true})

    expect(result).toBe('일백십이억십')
  })

  it('should return korean string with joinString', () => {
    const result = toKoreanNumber(1_000_160_010_720, {joinString: ' '})

    expect(result).toBe('일조일억육천 일만칠백 이십')
  })

  it('should return korean string with joinString and joinGroup', () => {
    const result = toKoreanNumber(1_000_160_010_720, {joinGroup: ', ', joinString: ' '})

    expect(result).toBe('일조, 일억, 육천 일만, 칠백 이십')
  })

  it('should return korean string with joinString', () => {
    const result = toKoreanNumber(1_000_160_000_720, {joinGroup: ' '})

    expect(result).toBe('일조 일억 육천만 칠백이십')
  })

  it('should return korean string with small number', () => {
    const result = toKoreanNumber(720)

    expect(result).toBe('칠백이십')
  })

  it('should return korean string with big number', () => {
    const result = toKoreanNumber(123_456_760_050_720)

    expect(result).toBe('백이십삼조사천오백육십칠억육천오만칠백이십')
  })

  it('should return korean unit-number string', () => {
    const result = toKoreanNumber(760_050_720, {mode: 'unit-number'})

    expect(result).toBe('7억6천5만7백2십')
  })

  it('should return korean number string', () => {
    const result = toKoreanNumber(760_050_720, {mode: 'number'})

    expect(result).toBe('7억6005만720')
  })

  it('should return korean number string with the joinGroup', () => {
    const result = toKoreanNumber(760_050_720, {joinGroup: ' ', mode: 'number'})

    expect(result).toBe('7억 6005만 720')
  })

  it('should return korean number string with the firstOne', () => {
    const result = toKoreanNumber(760_050_720, {firstOne: true, mode: 'number'})

    expect(result).toBe('7억6005만720')
  })
})
