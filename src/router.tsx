import { Navigate, Outlet, createHashRouter } from 'react-router'
import { useAppData } from './data/AppData'
import { gateFor, type Gate } from './gate'
import { DecksScreen } from './screens/DecksScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LoginScreen } from './screens/LoginScreen'
import { NewSessionScreen } from './screens/NewSessionScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SummaryScreen } from './screens/SummaryScreen'
import { TabBar } from './ui/TabBar'

function Loading() {
  return <main className="screen full"><p className="muted">Loading…</p></main>
}

function useGate(): Gate {
  const d = useAppData()
  return gateFor({
    mode: d.mode, ready: d.ready, authChecked: d.authChecked, signedIn: d.signedIn,
    deviceSignedIn: d.deviceSignedIn, initialPull: d.initialPull, hasProfile: d.profile !== null,
  })
}

export function RequireAuth() {
  const gate = useGate()
  const { retryPull } = useAppData()
  if (gate === 'loading') return <Loading />
  if (gate === 'login') return <Navigate to="/login" replace />
  if (gate === 'restore_failed') {
    return (
      <main className="screen full">
        <h1>Couldn't restore your data</h1>
        <p className="muted">The first sign-in on a device needs a connection to download your progress. Check your connection and try again.</p>
        <button className="btn btn-primary" onClick={retryPull}>Try again</button>
      </main>
    )
  }
  return <Outlet />
}

export function RequireProfile() {
  const gate = useGate()
  if (gate === 'onboarding') return <Navigate to="/onboarding" replace />
  if (gate !== 'app') return <Loading />
  return <Outlet />
}

function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

export const router = createHashRouter([
  { path: '/login', element: <LoginScreen /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingScreen /> },
      {
        element: <RequireProfile />,
        children: [
          {
            element: <TabLayout />,
            children: [
              { index: true, element: <HomeScreen /> },
              { path: 'decks', element: <DecksScreen /> },
              { path: 'progress', element: <ProgressScreen /> },
              { path: 'profile', element: <ProfileScreen /> },
            ],
          },
          { path: '/session/new/:deckId', element: <NewSessionScreen /> },
          { path: '/session/play', element: <PlayScreen /> },
          { path: '/session/summary/:sessionId', element: <SummaryScreen /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
