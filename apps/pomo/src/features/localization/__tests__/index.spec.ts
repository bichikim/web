/** @vitest-environment jsdom */

import {describe, expect, it} from 'vitest'

import {
  getLocalizedActivityOptions,
  getLocalizedGazeOptions,
  getLocalizedSceneLabel,
  getLocalizedTimeOptions,
  getLocalizedWeatherCityOptions,
  getLocalizedWeatherLabel,
  getLocalizedWeatherLocationLabel,
  getLocalizedWeatherSceneModeOptions,
} from '../index'

describe('scene localization', () => {
  it('should localize provider names and old Korean city names', () => {
    const location = {
      country: 'US',
      id: 'openweather:40.7128,-74.0060' as const,
      name: '뉴욕',
      names: {en: 'New York', ko: '뉴욕'},
      region: 'New York',
    }
    expect(getLocalizedWeatherLocationLabel(location, {locale: 'ko'})).toBe('뉴욕')
    expect(getLocalizedWeatherLocationLabel(location, {locale: 'en'})).toBe('New York')
    expect(
      getLocalizedWeatherLocationLabel(
        {country: 'KR', id: 'openweather:35.4933,128.7489', name: 'Miryang', region: ''},
        {locale: 'ko'},
      ),
    ).toBe('밀양')
  })
  it('should preserve scene option values and icons while localizing labels', () => {
    expect(getLocalizedTimeOptions({locale: 'en'})).toEqual([
      {icon: 'i-tabler-sun', label: 'Day', value: 'day'},
      {icon: 'i-tabler-moon', label: 'Night', value: 'night'},
      {icon: 'i-tabler-sun-moon', label: 'Auto', value: 'auto'},
    ])
    expect(getLocalizedActivityOptions({locale: 'en'}).map((option) => option.label)).toEqual([
      'Reading',
      'Writing',
      'Typing on a laptop',
    ])
    expect(getLocalizedGazeOptions({locale: 'en'}).map((option) => option.label)).toEqual([
      'Focused',
      'Looking at you',
    ])
  })

  it('should compose the accessible scene label in the selected locale', () => {
    expect(getLocalizedSceneLabel('night', 'reading', 'focused', {locale: 'ko'})).toBe(
      '밤 · 독서 · 집중',
    )
  })

  it('should localize every weather condition without changing its domain value', () => {
    expect(
      ['clear', 'cloudy', 'mixed', 'overcast', 'rain', 'snow', 'unknown'].map((condition) =>
        getLocalizedWeatherLabel(condition as Parameters<typeof getLocalizedWeatherLabel>[0], {
          locale: 'en',
        }),
      ),
    ).toEqual(['Clear', 'Mostly cloudy', 'Rain or snow', 'Overcast', 'Rain', 'Snow', 'Checking'])
  })

  it('should localize every supported weather city without changing its slug', () => {
    expect(getLocalizedWeatherCityOptions({locale: 'en'})).toEqual([
      {label: 'Seoul', value: 'seoul'},
      {label: 'Busan', value: 'busan'},
      {label: 'Daegu', value: 'daegu'},
      {label: 'Incheon', value: 'incheon'},
      {label: 'Gwangju', value: 'gwangju'},
      {label: 'Daejeon', value: 'daejeon'},
      {label: 'Ulsan', value: 'ulsan'},
      {label: 'Jeju', value: 'jeju'},
      {label: 'Sejong', value: 'sejong'},
      {label: 'Suwon', value: 'suwon'},
      {label: 'Seongnam', value: 'seongnam'},
      {label: 'Goyang', value: 'goyang'},
      {label: 'Yongin', value: 'yongin'},
      {label: 'Chuncheon', value: 'chuncheon'},
      {label: 'Wonju', value: 'wonju'},
      {label: 'Gangneung', value: 'gangneung'},
      {label: 'Sokcho', value: 'sokcho'},
      {label: 'Cheongju', value: 'cheongju'},
      {label: 'Chungju', value: 'chungju'},
      {label: 'Cheonan', value: 'cheonan'},
      {label: 'Asan', value: 'asan'},
      {label: 'Jeonju', value: 'jeonju'},
      {label: 'Iksan', value: 'iksan'},
      {label: 'Gunsan', value: 'gunsan'},
      {label: 'Mokpo', value: 'mokpo'},
      {label: 'Yeosu', value: 'yeosu'},
      {label: 'Suncheon', value: 'suncheon'},
      {label: 'Pohang', value: 'pohang'},
      {label: 'Gyeongju', value: 'gyeongju'},
      {label: 'Gumi', value: 'gumi'},
      {label: 'Andong', value: 'andong'},
      {label: 'Changwon', value: 'changwon'},
      {label: 'Gimhae', value: 'gimhae'},
      {label: 'Jinju', value: 'jinju'},
      {label: 'Geoje', value: 'geoje'},
      {label: 'Miryang', value: 'miryang'},
    ])
  })

  it('should preserve provider labels for searched world locations', () => {
    expect(
      getLocalizedWeatherLocationLabel({
        country: 'Japan',
        id: 'openweather:35.6900,139.6900',
        name: 'Tokyo',
        region: 'Tokyo',
      }),
    ).toBe('Tokyo')
  })

  it('should localize every weather scene mode without changing its value', () => {
    expect(getLocalizedWeatherSceneModeOptions({locale: 'en'})).toEqual([
      {label: 'Automatic', value: 'auto'},
      {label: 'Clear', value: 'clear'},
      {label: 'Rain', value: 'rain'},
      {label: 'Snow', value: 'snow'},
      {label: 'Mostly cloudy', value: 'cloudy'},
      {label: 'Overcast', value: 'overcast'},
    ])
  })
})
it('should preserve every original city label and option order in both locales', () => {
  const expected = [
    ['seoul', 'Seoul', '서울'],
    ['busan', 'Busan', '부산'],
    ['daegu', 'Daegu', '대구'],
    ['incheon', 'Incheon', '인천'],
    ['gwangju', 'Gwangju', '광주'],
    ['daejeon', 'Daejeon', '대전'],
    ['ulsan', 'Ulsan', '울산'],
    ['jeju', 'Jeju', '제주'],
    ['sejong', 'Sejong', '세종'],
    ['suwon', 'Suwon', '수원'],
    ['seongnam', 'Seongnam', '성남'],
    ['goyang', 'Goyang', '고양'],
    ['yongin', 'Yongin', '용인'],
    ['chuncheon', 'Chuncheon', '춘천'],
    ['wonju', 'Wonju', '원주'],
    ['gangneung', 'Gangneung', '강릉'],
    ['sokcho', 'Sokcho', '속초'],
    ['cheongju', 'Cheongju', '청주'],
    ['chungju', 'Chungju', '충주'],
    ['cheonan', 'Cheonan', '천안'],
    ['asan', 'Asan', '아산'],
    ['jeonju', 'Jeonju', '전주'],
    ['iksan', 'Iksan', '익산'],
    ['gunsan', 'Gunsan', '군산'],
    ['mokpo', 'Mokpo', '목포'],
    ['yeosu', 'Yeosu', '여수'],
    ['suncheon', 'Suncheon', '순천'],
    ['pohang', 'Pohang', '포항'],
    ['gyeongju', 'Gyeongju', '경주'],
    ['gumi', 'Gumi', '구미'],
    ['andong', 'Andong', '안동'],
    ['changwon', 'Changwon', '창원'],
    ['gimhae', 'Gimhae', '김해'],
    ['jinju', 'Jinju', '진주'],
    ['geoje', 'Geoje', '거제'],
    ['miryang', 'Miryang', '밀양'],
  ] as const
  expect(getLocalizedWeatherCityOptions({locale: 'en'})).toEqual(
    expected.map(([value, label]) => ({label, value})),
  )
  expect(getLocalizedWeatherCityOptions({locale: 'ko'})).toEqual(
    expected.map(([value, , label]) => ({label, value})),
  )
})
