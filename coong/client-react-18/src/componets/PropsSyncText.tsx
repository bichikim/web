import {useSyncState} from '../hooks/sync-state'

export interface SyncMeProps {
  value?: string
}

export const SyncMe: FC<SyncMeProps> = (props) => {
  const [value, setValue] = useSyncState(props.value)

  const onChange = () => {
    setValue(`${value}o`)
  }

  return (
    <div>
      <button onClick={onChange}>change</button>
      {value}
    </div>
  )
}

export const PropsSyncText: FC = () => {
  const [value, setValue] = useState('foo')
  const onChange = () => {
    setValue(`${value}o`)
  }
  return (
    <div>
      <button onClick={onChange}>change</button>
      <SyncMe value={value} />
    </div>
  )
}
