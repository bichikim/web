import {text as uiText} from '../features/localization'
import {batch, createSignal, Show, useContext} from 'solid-js'
import type {WallpaperController} from '../features/settings'
import type {WallpaperLibraryController} from '../features/library'
import {SPoffoAssetPicker} from './SPoffoAssetPicker'
import {usePoffoImport} from '../features/poffo/use-poffo-import'
import {SCodexConnection} from './SCodexConnection'
import {SPoffoWidgetEditor} from './SPoffoWidgetEditor'
import {useWidgetEditor} from '../features/poffo/use-widget-editor'
import {HSettingsScope} from './HSettingsScope'
import {SSettingsLinks} from './SSettingsLinks'
import {SSettingsPath} from './SSettingsPath'
import {SSettingsContent} from './SSettingsContent'
import {SettingsNavigationContext, useSettingsNavigation} from '../features/settings-navigation'

const PAGES = [
  {
    get label() {
      return uiText('열린 위젯')
    },
    value: 'opened',
  },
  {
    get label() {
      return uiText('Poffo 불러오기')
    },
    value: 'assets',
  },
  {
    get label() {
      return uiText('AI 에이전트 연결')
    },
    value: 'connection',
  },
]
interface SPoffoWidgetSettingsProps {
  readonly controller: WallpaperController
  readonly library: WallpaperLibraryController
}

export const SPoffoWidgetSettings = (props: SPoffoWidgetSettingsProps) => {
  const parent = useContext(SettingsNavigationContext)
  const navigation =
    parent ??
    useSettingsNavigation(() => ({
      label: uiText('설정 화면 선택'),
      options: [
        {
          label: uiText('위젯'),
          value: 'widget',
        },
      ],
      value: 'widget',
    }))
  const [page, setPage] = createSignal('overview')
  const [editing, setEditing] = createSignal(false)
  const handlePage = (value: string) =>
    batch(() => {
      setPage(value)
      setEditing(false)
    })
  const handleOverview = () => handlePage('overview')
  const handleList = () => setEditing(false)
  const selection = useWidgetEditor({
    assets: () => props.controller.puppets(),
    widgets: () => props.library.widgets(),
  })
  const {error, importFiles, invalidateImport, selectAsset} = usePoffoImport(selection.selectAsset)
  const handleAddWidget = async () => {
    const id = selection.asset()
    if (id !== null) {
      await props.library.addWidget(id)
      batch(() => {
        setPage('opened')
        setEditing(true)
      })
    }
  }
  const selectWidget = (id: string) => {
    invalidateImport()
    selection.selectWidget(id)
  }
  const handleEdit = (id: string) => {
    selectWidget(id)
    setEditing(true)
  }
  const importActions = () => (
    <button
      type="button"
      class="wallpaper-file-button"
      disabled={selection.asset() === null}
      onClick={handleAddWidget}
    >
      {uiText('위젯으로 띄우기')}
    </button>
  )
  return (
    <SettingsNavigationContext.Provider value={navigation}>
      <Show when={parent === undefined}>
        <SSettingsPath />
      </Show>
      <HSettingsScope
        segment={
          page() === 'overview'
            ? null
            : {
                label: uiText('위젯 화면 선택'),
                onBack: handleOverview,
                onSelect: handlePage,
                options: PAGES,
                value: page(),
              }
        }
      >
        <SSettingsContent>
          <section
            aria-label={uiText('Poffo 위젯 설정')}
            aria-busy={navigation.pending()}
            inert={navigation.pending()}
            class="grid gap-4"
          >
            <Show when={page() === 'overview'}>
              <SSettingsLinks
                label={uiText('위젯 설정 목록')}
                options={PAGES}
                onChange={handlePage}
              />
            </Show>
            <div hidden={page() !== 'assets'}>
              <SPoffoAssetPicker
                selectLabel={uiText('위젯 Poffo')}
                options={selection.assetOptions()}
                value={selection.asset() ?? undefined}
                onChange={selectAsset}
                onFiles={importFiles}
                error={error()}
              >
                {importActions()}
              </SPoffoAssetPicker>
            </div>
            <div hidden={page() !== 'opened'}>
              <Show when={!editing()}>
                <SSettingsLinks
                  label={uiText('열린 위젯 목록')}
                  options={selection.widgetOptions()}
                  onChange={handleEdit}
                  onRemove={(id) => props.library.removeWidget(id)}
                />
              </Show>
              <div hidden={!editing()}>
                <HSettingsScope
                  active={page() === 'opened' && editing() && selection.widget() !== null}
                  segment={{
                    label: uiText('편집할 위젯'),
                    onBack: handleList,
                    onSelect: selectWidget,
                    options: selection.widgetOptions(),
                    value: selection.widget()?.id,
                  }}
                >
                  <section aria-label={uiText('위젯 조정')} class="grid min-w-0 gap-3">
                    <SPoffoWidgetEditor
                      controller={props.controller}
                      library={props.library}
                      widget={selection.widget()}
                      assetId={selection.previewAsset}
                      active={page() === 'opened' && editing()}
                    />
                  </section>
                </HSettingsScope>
              </div>
            </div>
            <div hidden={page() !== 'connection'}>
              <SCodexConnection />
            </div>
          </section>
        </SSettingsContent>
      </HSettingsScope>
    </SettingsNavigationContext.Provider>
  )
}
