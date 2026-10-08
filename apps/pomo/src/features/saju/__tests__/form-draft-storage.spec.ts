/** @vitest-environment jsdom */
import {beforeEach, expect, it} from 'vitest'
import {
  deleteSajuFormDraftFromLocalStorage,
  readSajuFormDraftFromLocalStorage,
  type SajuFormDraft,
  writeSajuFormDraftToLocalStorage,
} from '../form-draft-storage'

const DRAFT: SajuFormDraft = {
  calendar: 'lunar',
  gender: 'F',
  leapMonth: true,
  lunarDay: '12',
  lunarMonth: '4',
  lunarYear: '1992',
  question: '제 일은 어떨까요?',
  solarDay: '13',
  solarMonth: '5',
  solarYear: '1992',
  time: '08:30',
  version: 1,
}

beforeEach(() => localStorage.clear())

it('should restore the selected birth details and question after a new read', () => {
  writeSajuFormDraftToLocalStorage(DRAFT)

  expect(readSajuFormDraftFromLocalStorage()).toEqual(DRAFT)
})

it('should ignore a malformed or invalid stored draft', () => {
  localStorage.setItem('pomo:saju:form-draft:v1', '{invalid')
  expect(readSajuFormDraftFromLocalStorage()).toBeNull()

  localStorage.setItem('pomo:saju:form-draft:v1', JSON.stringify({...DRAFT, gender: 'X'}))
  expect(readSajuFormDraftFromLocalStorage()).toBeNull()
})

it('should remove a saved birth draft when cleared', () => {
  writeSajuFormDraftToLocalStorage(DRAFT)
  deleteSajuFormDraftFromLocalStorage()

  expect(readSajuFormDraftFromLocalStorage()).toBeNull()
})
