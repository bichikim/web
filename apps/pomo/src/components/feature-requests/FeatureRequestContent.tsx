import {useAuth} from '../../features/auth/AuthProvider'
import {useFeatureRequests} from '../../features/feature-requests'
import {FeatureRequestForm} from './FeatureRequestForm'
import {FeatureRequestList} from './FeatureRequestList'

export const FeatureRequestContent = () => {
  const authentication = useAuth()
  const model = useFeatureRequests()

  return (
    <FeatureRequestList
      authentication={authentication}
      model={model}
      newRequestAction={<FeatureRequestForm authentication={authentication} model={model} />}
    />
  )
}
