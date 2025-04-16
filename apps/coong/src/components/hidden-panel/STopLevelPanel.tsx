import {SHiddenPanelProvider, SHiddenPanelProviderProps} from './SHiddenPanelProvider'
import {SClose} from './SClose'
import {useContext} from 'solid-js'
import {MidiPlayerContext} from 'src/components/midi-player'
import {Tab} from 'src/components/tab'
import {SHiddenContent} from './SHiddenContent'
import {STabList} from './STabList'
import {STabButton} from './STabButton'
import {SPlayerPanel} from './SPlayerPanel'

export interface STopLevelPanelProps extends SHiddenPanelProviderProps {
  //
}

type TabValue = 'player' | 'setting' | 'user'

export const STopLevelPanel = (props: STopLevelPanelProps) => {
  const {isPlaying} = useContext(MidiPlayerContext)

  return (
    // provide show or hide state and handle
    <SHiddenPanelProvider initShow={true}>
      <Tab.Provider activeTab="player">
        <div class="w-max h-max relative">
          <SClose class="mb-1" isPlaying={isPlaying()} />
          <SHiddenContent>
            <STabList>
              <STabButton value="player" fit flat variant="primary">
                <span class="i-tabler:music w-7 h-7 block" />
              </STabButton>
              <STabButton value="setting" fit flat variant="warning">
                <span class="i-tabler:settings w-7 h-7 block" />
              </STabButton>
              <STabButton value="user" fit flat variant="secondary">
                <span class="i-tabler:user w-7 h-7 block" />
              </STabButton>
            </STabList>
            <Tab.Content name="player">
              <SPlayerPanel class="w-140 h-80 bg-white top-0 left-0 rd-2 backdrop-blur-sm bg-opacity-90" />
            </Tab.Content>
            <Tab.Content name="setting">
              <div class="w-180 h-50 bg-white top-0 left-0 rd-2 backdrop-blur-sm bg-opacity-90"></div>
            </Tab.Content>
            <Tab.Content name="user">
              <div class="w-180 h-50 bg-white top-0 left-0 rd-2 backdrop-blur-sm bg-opacity-90"></div>
            </Tab.Content>
          </SHiddenContent>
        </div>
      </Tab.Provider>
    </SHiddenPanelProvider>
  )
}
