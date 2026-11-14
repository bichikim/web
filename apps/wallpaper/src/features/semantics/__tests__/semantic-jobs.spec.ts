import {expect, test} from 'vitest'
import {semanticJobs} from '../semantic-jobs'
import type {PoffoWidget} from '@winter-love/wallpaper/settings/library-model'

test('should leave pending text analysis unchanged when only menu state or labels change', () => {
  const widget: PoffoWidget = {
    assetId: 'asset',
    id: 'widget',
    speech: {
      enabled: true,
      semanticBindings: [
        {
          category: 'menu',
          enabled: true,
          id: 'tiny',
          mode: 'toggle',
          parameterId: null,
          text: '',
          threshold: 0.8,
        },
      ],
      x: 0,
      y: 0,
    },
    x: null,
    y: null,
  }
  const inputs = new Map([['widget', {text: '새 문장', widgetId: 'widget'}]])
  const before = semanticJobs([widget], inputs)[0]!.signature
  const binding = widget.speech!.semanticBindings![0]!
  const changed = {
    ...widget,
    speech: {
      ...widget.speech!,
      semanticBindings: [{...binding, menuActive: true, menuLabel: '작아지기'}],
    },
  }
  expect(semanticJobs([changed], inputs)[0]!.signature).toBe(before)
  expect(
    semanticJobs(
      [
        {
          ...changed,
          speech: {...changed.speech, semanticBindings: [{...binding, category: 'emotion'}]},
        },
      ],
      inputs,
    )[0]!.signature,
  ).not.toBe(before)
})
