/** @vitest-environment jsdom */
import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'
import {lazy} from 'solid-js'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import Workspace from '../image-generation/Workspace'

vi.mock('@solidjs/start', () => ({clientOnly: vi.fn()}))
vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('../image-generation/Workspace', () => ({default: vi.fn()}))

beforeEach(() => {
  vi.mocked(clientOnly).mockImplementation((load) => lazy(load))
  vi.mocked(Title).mockImplementation((props) => <>{props.children}</>)
  vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
  vi.mocked(Workspace).mockImplementation(() => <h1>Image workspace</h1>)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should load the client workspace and provide navigation back to the lab', async () => {
  const {default: ImageGenerationPage} = await import('../ImageGenerationPage')
  render(() => <ImageGenerationPage />)

  expect(screen.getByText('Pomofi — 이미지 생성')).toBeDefined()
  expect(screen.getByRole('link', {name: '← 실험실 목록'}).getAttribute('href')).toBe('/dev')
  expect(await screen.findByRole('heading', {name: 'Image workspace'})).toBeDefined()
})
