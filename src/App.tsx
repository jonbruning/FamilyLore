import { useAuth } from './lib/useAuth'
import { LoginPage } from './components/LoginPage'
import { Dashboard } from './components/Dashboard'

function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center bg-white dark:bg-neutral-900" />
  }

  return session ? <Dashboard session={session} /> : <LoginPage />
}

export default App
