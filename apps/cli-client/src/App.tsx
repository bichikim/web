import {Route, Router} from '@solidjs/router'
import AgentPage from '@/routes/AgentPage'

export default function App() {
  return (
    <Router>
      <Route path="/" component={AgentPage} />
    </Router>
  )
}
