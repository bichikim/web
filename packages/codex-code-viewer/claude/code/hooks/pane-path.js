import {renderSearchField} from './pane-search-field.js'
const RESERVED_COLUMNS = 28
const ATTACHMENT_COLUMNS = 8
const MIN_COLUMNS = 8
/** Describes project path input with the original search field geometry. */
export function renderPath(view) {
  return renderSearchField(view, {
    change: {kind: 'field', name: 'query'},
    columns: Math.max(
      MIN_COLUMNS,
      view.bodyColumns -
        RESERVED_COLUMNS -
        (view.state.attachments.length ? ATTACHMENT_COLUMNS : 0),
    ),
    key: 'path',
    placeholder: view.t('파일 경로 또는 검색어...'),
    submit: {kind: 'path'},
    value: view.query,
  })
}
