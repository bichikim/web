/** Describes a bounded table with filtering, ordering and page controls. */
export function renderTable(view) {
  const {Text, Input, Select, Button, Box} = view.elements
  if (!view.tablePreview.ok) {
    return [Text({children: [view.tablePreview.message]})]
  }
  if (view.tablePreview.rows.length === 0) {
    return [Text({children: [view.t('표가 비어 있습니다.')]})]
  }
  const offset = view.tablePage * view.rowCount
  const button = (key, label, command) =>
    Button({key, label: view.t(label), onPress: () => view.send(command)})
  const headers = Array.from({length: view.tablePreview.columns}, (_, index) => {
    const fallback =
      view.tablePreview.columnNames?.[index] ?? view.t('열 {count}', {count: index + 1})
    return view.tableHeader ? view.tablePreview.rows[0]?.[index] || fallback : fallback
  })
  return [
    button('table-header', view.tableHeader ? '첫 행: 제목' : '첫 행: 데이터', {
      kind: 'tableHeader',
    }),
    Input({
      key: 'table-filter',
      label: view.t('표 필터'),
      onInput: (value) => view.send({kind: 'tableQuery', value}),
      onSubmit: (value) => view.send({kind: 'tableQuery', value}),
      value: view.tableQuery,
    }),
    Select({
      key: 'table-sort',
      label: view.t('정렬 열'),
      onSelect: (value) => view.send({column: Number(value), kind: 'tableSort'}),
      options: [
        {label: view.t('정렬 없음'), value: '-1'},
        ...headers.map((label, index) => ({label, value: String(index)})),
      ],
      value: String(view.tableSort?.column ?? -1),
    }),
    ...(view.tableSort === null
      ? []
      : [
          button('table-direction', view.tableSort.descending ? '내림차순' : '오름차순', {
            column: view.tableSort.column,
            kind: 'tableSort',
          }),
        ]),
    Text({children: [headers.join(' │ ')]}),
    ...(view.tablePreview.truncated
      ? [Text({children: [view.t('표시 한도에 도달했습니다.')], dimColor: true})]
      : []),
    ...view.tableRows
      .slice(offset, offset + view.rowCount)
      .map((row) => Text({children: [row.join(' │ ')]})),
    Box({
      children: [
        ...(view.tablePage > 0
          ? [button('table-previous', '이전 행', {delta: -1, kind: 'tablePage'})]
          : []),
        Text({
          children: [
            `${view.tablePage + 1}/${Math.max(1, Math.ceil(view.tableRows.length / view.rowCount))}`,
          ],
        }),
        ...(view.tableRows.length > offset + view.rowCount
          ? [button('table-next', '다음 행', {delta: 1, kind: 'tablePage'})]
          : []),
      ],
      flexWrap: 'wrap',
      key: 'source-viewport',
    }),
  ]
}
