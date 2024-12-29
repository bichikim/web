import {useStorage} from '@winter-love/solid-use'
import {HTMLInputElement} from 'happy-dom'
import {createSignal} from 'solid-js'
import {createPlayer} from 'src/create-player'
import {Meta, StoryObj} from 'storybook-solidjs'
import * as publicData from './_demo-data/public'
import * as publicDataData from './_demo-data/public-data'
import * as publicDrmData from './_demo-data/public-drm'
import {DrmOptions} from './player/types'

export interface RootProps {
  cookies?: string
  drm?: DrmOptions
  url: string | ContentKey
}

interface ContentKey {
  id: string
  type: string
}

const getUrl = async (
  data: string | ContentKey,
  apiCredential: string | null,
): Promise<{cookies?: string; url: string}> => {
  if (typeof data === 'string') {
    return {url: data}
  }
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  return fetch(
    `https://apis.wavve.com/fz/streaming?contentid=${data.id}&contenttype=${data.type}&credential=${apiCredential}`,
  )
    .then((response) => response.json())
    .then((data) => ({cookies: data.awscookie, url: data.playurl}))
}

export const Root = (props: RootProps) => {
  const [element, setElement] = createSignal(null)
  const [apiCredential, setApiCredential] = useStorage<string | null>(
    'local',
    '__api_credential',
    null,
  )
  const [playerState, setPlayerState, playerController] = createPlayer(element)

  const stop = () => {
    playerController.pause()
    setPlayerState((prevState) => ({...prevState, currentTime: 0}))
  }

  const load = async () => {
    const {url, cookies} = await getUrl(props.url, apiCredential())
    return playerController.load(url, {cookies: props.cookies ?? cookies, drm: props.drm})
  }

  const handleCredential: any = (event: InputEvent & {target: HTMLInputElement}) => {
    setApiCredential(event.target.value)
  }

  return (
    <div>
      <video ref={setElement} class="w-500px" controls />
      <br />
      <span>state currentTime {playerState().currentTime}</span>
      <br />
      <span>state duration {playerState().duration}</span>
      <br />
      <span>state muted {playerState().muted ? 'true' : 'false'}</span>
      <br />
      <span>state paused {playerState().paused ? 'true' : 'false'}</span>
      <br />
      <span>state seeking {playerState().seeking ? 'true' : 'false'}</span>
      <br />
      <span>state volume {playerState().volume}</span>
      <br />
      <button onClick={playerController.play}>Play</button>
      <button onClick={playerController.pause}>Pause</button>
      <button onClick={stop}>Stop</button>
      <button onClick={load}>Load</button>
      <br />
      credential <input onInput={handleCredential} value={apiCredential() ?? ''} />
    </div>
  )
}

const meta: Meta<typeof Root> = {
  component: Root,
}

export default meta

type Story = StoryObj<typeof meta>

export const PublicDrm: Story = {
  args: {
    drm: publicDrmData.drm,
    url: publicDrmData.url,
  },
}

export const Public: Story = {
  args: {
    cookies: publicData.cookies,
    url: publicData.url,
  },
}

export const PublicData: Story = {
  args: {
    url: publicDataData.url,
  },
}
