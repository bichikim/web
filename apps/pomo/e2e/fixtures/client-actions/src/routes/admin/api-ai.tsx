import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import {MetaProvider} from '@solidjs/meta'
import AdminApiAi from 'src/routes/admin/api-ai'

export default function AdminApiAiFixture() {
  return (
    <MetaProvider>
      <AdminApiAi />
    </MetaProvider>
  )
}
