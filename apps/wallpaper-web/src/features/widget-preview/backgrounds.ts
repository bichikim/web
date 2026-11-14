export const WIDGET_BACKGROUNDS = [
  {
    id: 'profile',
    model: '/models/profile/model.poffo',
    name: '프로필',
    portraitModel: '/models/profile/portrait/model.poffo',
    tallModel: '/models/profile/portrait/tall/model.poffo',
  },
  {
    id: 'street-front',
    model: '/models/street/model.poffo',
    name: '거리',
    portraitModel: '/models/street/portrait/model.poffo',
    tallModel: '/models/street/portrait/tall/model.poffo',
  },
] as const

export type WidgetBackground = (typeof WIDGET_BACKGROUNDS)[number]['id']
