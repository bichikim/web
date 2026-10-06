/** @vitest-environment jsdom */

import {Tabs} from '@kobalte/core/tabs'
import {A} from '@solidjs/router'
import {render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PCreditsSettings} from '../PCreditsSettings'

import licenseData from '../../../../public/licenses.json' with {type: 'json'}
import englishLicenseData from '../../../../public/licenses.en.json' with {type: 'json'}

vi.mock('@kobalte/core/tabs', () => ({Tabs: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))

const CREDIT_ENTRY_NAMES = new Set(['SolidJS · SolidStart', 'Pretendard', 'GL Transitions'])
const makeCreditsFixture = (data: typeof licenseData) => ({
  ...data,
  groups: data.groups
    .filter((group) => group.id === 'core-software' || group.id === 'models')
    .map((group) => ({
      ...group,
      entries:
        group.id === 'core-software'
          ? group.entries.filter(
              (entry) =>
                CREDIT_ENTRY_NAMES.has(entry.name) || entry.name.startsWith('rgbKineticSlider ('),
            )
          : [],
    })),
})

const originalGetLocale = getLocale

beforeEach(() => {
  overwriteGetLocale(() => 'ko')
  vi.clearAllMocks()
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify(
            getLocale() === 'en'
              ? makeCreditsFixture(englishLicenseData)
              : makeCreditsFixture(licenseData),
          ),
        ),
    ),
  )
  Object.assign(Tabs, {
    Content: (props: {children: JSX.Element}) => <>{props.children}</>,
  })
  vi.mocked(A).mockImplementation((props) => (
    <a class={props.class} href={props.href}>
      {props.children}
    </a>
  ))
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
  vi.unstubAllGlobals()
})

it('should render license link roles in English', async () => {
  overwriteGetLocale(() => 'en')
  render(() => <PCreditsSettings />)

  expect(
    await screen.findByRole('link', {name: 'SolidJS license text Opens in a new window'}),
  ).toBeTruthy()
  expect(
    screen.getByRole('link', {name: 'Pretendard official repository Opens in a new window'}),
  ).toBeTruthy()
  expect(
    screen.getByRole('link', {name: 'third-party license document'}).parentElement,
  ).toHaveTextContent(
    'See the third-party license document for the complete versions and distribution terms.',
  )
  expect(screen.getByRole('link', {name: 'source repository Opens in a new window'})).toBeTruthy()
  expect(screen.queryByText(/소스 저장소|라이선스 원문|직접 작성한 셰이더/u)).toBeNull()
})

it('should preserve static credits and report a license fetch failure', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))

  render(() => <PCreditsSettings />)

  expect(screen.getByRole('heading', {name: '만든 사람'})).toBeTruthy()
  expect(await screen.findByRole('alert')).toHaveTextContent('라이선스 정보를 불러오지 못했어요.')
})
