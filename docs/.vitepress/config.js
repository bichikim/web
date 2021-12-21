module.exports = {
  lang: 'ko-KR',
  title: 'Hello Winter love!',
  description: 'utils for Vue3 and Vue2 composition api',
  themeConfig: {
    nav: [
      {
        text: 'Guide',
        link: '/',
        activeMatch: '^/$|^/guide/',
      },
      {
        text: 'API Reference',
        link: '/api/use/',
        activeMatch: '^/api/use'
      },
      {
        text: 'Phrase',
        link: '/phrase/',
        activeMatch: '^/phrase',
      },
      {
        text: 'Support us',
      },
    ],
    sidebar: {
      '/guide/': getGuideSidebar(),
      '/phrase/': getPhraseSidebar(),
      '/api/': getApiSidebar(),
      '/': getGuideSidebar(),
    },
  },
}

function getPhraseSidebar() {
  return [
    {
      text: '소개',
      link: '/phrase/',
    }
  ]
}

function getGuideSidebar() {
  return [
    {
      text: '소개',
      children: [
        {
          text: 'Winter Love 가 뭔가요?',
          link: '/',
        },
      ],
    },
  ]
}

function getApiSidebar() {
  return [
    {
      text: 'Use',
      children: [
        {
          text: '소개',
          link: '/api/use/'
        },
        {
          text: 'WrapRef',
          link: '/api/use/wrap-ref',
        },
      ],
    },
    {  
      text: 'Vare',
      children: [
        {
          text: 'Vare 는 무엇인가요?',
          link: '/api/vare',
        },
        {
          text: 'atom',
          link: '/api/atom',
        },
      ],
    },
  ]
}
