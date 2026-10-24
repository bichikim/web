/** Describes persisted native layout and reading preferences. */
export function renderSettings(view) {
  const {Box, Text, Select, Button} = view.elements
  const select = (key, label, name, options) =>
    Select({
      key,
      label: view.t(label),
      onSelect: (value) =>
        view.send({
          kind: 'preference',
          name,
          value: ['rows', 'previewLines'].includes(name)
            ? Number(value)
            : name === 'numbers'
              ? value === 'true'
              : value,
        }),
      options: options.map(([value, label]) => ({label: view.t(label), value})),
      value: String(view.preferences[name]),
    })
  return Box({
    children: [
      Text({bold: true, children: [view.t('표시 설정')]}),
      Button({
        key: 'follow-toggle',
        label: view.t(view.preferences.follow ? '자동 추적 켜짐' : '자동 추적 일시정지'),
        onPress: () => view.send({kind: 'follow'}),
      }),
      select('setting-language', '언어', 'language', [
        ['ko', '한국어'],
        ['en', 'English'],
      ]),
      select('setting-layout', '트리 배치', 'layout', [
        ['auto', '너비에 따라'],
        ['side', '문서 옆'],
        ['above', '문서 위'],
      ]),
      select('setting-tree-width', '트리 너비', 'treeWidth', [
        ['200px', '좁게'],
        ['288px', '보통'],
        ['400px', '넓게'],
        ...(['200px', '288px', '400px'].includes(view.preferences.treeWidth)
          ? []
          : [[view.preferences.treeWidth, view.preferences.treeWidth]]),
      ]),
      select('setting-rows', '표시 줄', 'rows', [
        ['12', '12'],
        ['24', '자동'],
        ['48', '48'],
      ]),
      select('setting-wrap', '긴 줄', 'wrap', [
        ['wrap', '줄바꿈'],
        ['truncate-end', '한 줄로'],
      ]),
      select('setting-numbers', '줄 번호', 'numbers', [
        ['true', '표시'],
        ['false', '숨김'],
      ]),
      select('setting-preview-lines', '사용처 미리보기', 'previewLines', [
        ['1', view.t('{count}줄', {count: 1})],
        ['2', view.t('{count}줄', {count: 2})],
        ['3', view.t('{count}줄', {count: 3})],
        ['4', view.t('{count}줄', {count: 4})],
        ['5', view.t('{count}줄', {count: 5})],
      ]),
      Button({
        key: 'settings-close',
        label: view.t('닫기'),
        onPress: () => view.send({kind: 'page', value: 'document'}),
      }),
    ],
    flexDirection: 'column',
  })
}
