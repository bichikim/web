/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import AlbumTranslationFields from '../AlbumTranslationFields'
import {createEmptyAlbumTranslations} from '../../../features/admin-music'

const renderFields = () => {
  const [values, setValues] = createSignal(createEmptyAlbumTranslations())
  render(() => <AlbumTranslationFields onValuesChange={setValues} values={values()} />)
}

beforeEach(() => {
  Object.defineProperty(navigator, 'gpu', {configurable: true, value: {}})
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(navigator, 'gpu')
  vi.clearAllMocks()
})

describe('AlbumTranslationFields', () => {
  it('should provide editable metadata for all four supported languages', () => {
    renderFields()

    const titleInputs = screen.getAllByLabelText(/^앨범명/u)
    const descriptionInputs = screen.getAllByLabelText(/^설명/u)

    expect(titleInputs).toHaveLength(4)
    expect(descriptionInputs).toHaveLength(4)
    expect(titleInputs[0]?.hasAttribute('required')).toBe(true)
    expect(titleInputs.slice(1).every((input) => !input.hasAttribute('required'))).toBe(true)
    expect(descriptionInputs[0]?.hasAttribute('required')).toBe(true)
    expect(descriptionInputs.slice(1).every((input) => !input.hasAttribute('required'))).toBe(true)
    expect(screen.getByText('한국어 기본 정보')).toBeTruthy()
    expect(screen.getByText('English')).toBeTruthy()
    expect(screen.getByText('日本語')).toBeTruthy()
    expect(screen.getByText('简体中文')).toBeTruthy()
  })

  it('should enable Gemma translation after a Korean title is entered', () => {
    renderFields()
    const button = screen.getByRole('button', {name: '한국어에서 자동 번역'})

    expect(button.hasAttribute('disabled')).toBe(true)

    fireEvent.input(screen.getAllByLabelText(/^앨범명/u)[0] as HTMLInputElement, {
      target: {value: '밤'},
    })

    expect(button.hasAttribute('disabled')).toBe(false)
  })
})
