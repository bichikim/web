import { defineConfig, DefaultTheme } from 'vitepress'
import {defaultsDeep} from 'lodash'

export default defineConfig({
  locales: {
    '/': {
      lang: 'en-US',
      title: 'Hello Winter love!',
      // label: 'English',
      // selectText: 'English',
      description: 'utils for Vue3 and Vue2 composition api',
    },
    '/kr/': {
      lang: 'ko-KR',
      title: '안녕 겨울 사랑 (Winter love)!',
      // selectText: 'Korean',
      // label: 'Korean',
      description: 'utils for Vue3 and Vue2 composition api',
    }
  },
  themeConfig: {
    locales: {
      '/': {
        selectText: 'Languages',
        label: 'English',
        repo: 'https://github.com/winter-love/web/tree/dev/packages',
        repoLabel: 'github',
        nav: getNav([], '/'),
        sidebar: {
          '/guide/': getGuideSidebar([], '/'),
          '/api/': getApiSidebar([], '/'),
          '/': false,
        },
      },
      '/kr/': {
        selectText: '언어',
        label: '한글',
        repo: 'https://github.com/winter-love/web/tree/dev/packages',
        repoLabel: '깃헙',
        nav: getNav([
          {text: '홈'},
          {text: '가이드'},
          {text: 'API 참조'},
          {text: '우리를 지원해주세요'},
        ], '/kr/'),
        sidebar: {
          '/kr/guide/': getGuideSidebar([], '/kr/'),
          '/kr/api/': getApiSidebar([], '/kr/'),
          '/': false,
        },
      }
    },

  },
})

function getNav(override: Partial<DefaultTheme.NavItem>[] = [], prefix: string = '/') {
  const data: DefaultTheme.NavItem[] = [
    {
      text: 'Home',
      link: prefix,
      activeMatch: `^${prefix}$`,
    },
    {
      text: 'Guide',
      link: `${prefix}guide/info/`,
      activeMatch: `^${prefix}guide/info/`,
    },
    {
      text: 'API Reference',
      link: `${prefix}api/use/`,
      activeMatch: `^${prefix}api/use/`
    },
    {
      text: 'Support us',
      link: `${prefix}support/`
    },
  ]
  return defaultsDeep(override, data)
}

function getGuideSidebar(override: Partial<DefaultTheme.SideBarItem>[] = [], prefix: string = '/') {
  const data: DefaultTheme.SideBarItem[] = [
    {
      text: 'Winter Love Packages',
      link: `${prefix}guide/info/`,
    },
    {
      text: 'Use',
      link: `${prefix}guide/use/`,
    },
    {
      text: 'Vare',
      link: `${prefix}guide/vare/`,
    },
    {
      text: 'Utils',
      link: `${prefix}guide/vare/`,
    },
  ]
  return defaultsDeep(override, data)
}

function getApiSidebar(override: Partial<DefaultTheme.SideBarItem>[] = [], prefix: string = '/') {
  const data: DefaultTheme.SideBarItem[] = [
    {
      text: 'Use',
      link: `${prefix}api/use/`,
    },
    {
      text: 'Vare',
      link: `${prefix}api/vare/`,
    },
  ]
  return defaultsDeep(override, data)
}
