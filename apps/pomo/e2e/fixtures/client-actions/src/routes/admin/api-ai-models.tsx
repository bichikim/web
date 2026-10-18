import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import {MetaProvider} from '@solidjs/meta'
import AdminApiAiModels from 'src/routes/admin/api-ai-models'

export default function AdminApiAiModelsFixture() {
  return (
    <MetaProvider>
      <AdminApiAiModels />
    </MetaProvider>
  )
}
