import {For, Show} from 'solid-js'
import {SCodeLine} from './SCodeLine'
import {SChangePanel} from './SChangePanel'
import {lineChange} from './create-line-changes'
import {changeAnchor} from './change-anchor'
import type {SCodeDocumentProps} from './SCodeDocument'
import type {useCodeFolding} from './use-code-folding'

interface SCodeRowsProps extends SCodeDocumentProps {
  readonly folds: ReturnType<typeof useCodeFolding>
  readonly selected: (line: number) => boolean
}
export const SCodeRows = (props: SCodeRowsProps) => {
  const expanded = () => props.inspection?.hunks[props.inspection.active]
  const panelLine = () => {
    const hunk = expanded()
    return hunk === undefined ? -1 : changeAnchor(hunk, props.document.lines.length)
  }
  const handleClose = (): void => props.onCloseChange?.()
  return (
    <div
      class="ui-code-text m-0 w-max min-w-full whitespace-pre pb-4 selection:bg-code-selection"
      style={{
        '--code-number-width': `${Math.max(2, String(props.document.lines.length).length)}ch`,
      }}
    >
      <Show when={panelLine() === 0 ? props.inspection : null}>
        {(inspection) => (
          <div class="ui-change-inset">
            <SChangePanel
              inspection={inspection()}
              onClose={handleClose}
              onNavigate={props.onNavigateChange}
            />
          </div>
        )}
      </Show>
      <For each={props.folds.visible()}>
        {(row) => (
          <>
            <SCodeLine
              change={lineChange(
                props.changes ?? [],
                row.line,
                props.folds.closed().has(row.line) ? props.folds.ranges().get(row.line) : row.line,
                {expanded: expanded(), lineCount: props.document.lines.length},
              )}
              expandedChange={expanded()}
              lineCount={props.document.lines.length}
              onOpenChange={props.onOpenChange}
              focusable={row.line === (props.selection?.line ?? props.document.location.line)}
              line={row.line}
              selectable={props.onSelect !== undefined}
              selected={props.selected(row.line)}
              tokens={row.tokens}
              folding={props.folds.ranges().size > 0}
              foldEnd={props.folds.ranges().get(row.line)}
              collapsed={props.folds.closed().has(row.line)}
              onToggleFold={() => props.folds.toggle(row.line)}
              matches={props.matches}
              activeMatch={props.activeMatch}
            />
            <Show
              when={
                panelLine() >= row.line &&
                panelLine() <=
                  (props.folds.closed().has(row.line)
                    ? (props.folds.ranges().get(row.line) ?? row.line)
                    : row.line)
                  ? props.inspection
                  : null
              }
            >
              {(inspection) => (
                <div class="ui-change-inset">
                  <SChangePanel
                    inspection={inspection()}
                    onClose={handleClose}
                    onNavigate={props.onNavigateChange}
                  />
                </div>
              )}
            </Show>
          </>
        )}
      </For>
    </div>
  )
}
