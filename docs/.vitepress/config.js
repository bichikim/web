module.exports = {
  lang: 'ko-KR',
  title: 'Hello Winter love!',
  description: 'utils for Vue3 and Vue2 composition api',
  themeConfig: {
    nav: [
      {
        text: 'Support us',
      },
    ],
    sidebar: {
      '/guide/': getGuideSidebar(),
      '/Api/': getGuideSidebar(),
      '/': getGuideSidebar(),
    },
  },
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
          text: 'Use 는 무엇인가요?',
          link: '/api/use',
        },
        {
          text: 'wrap-ref',
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