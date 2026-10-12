import { useRegisterSW } from 'virtual:pwa-register/react'
import { Icon } from './Icon'

/** Shown only on the tab screens, so an update never reloads the app in the middle of a workout. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span className="row"><Icon name="sparkle" /> A new version of Pocket Gains is ready.</span>
      <div className="row">
        <button className="btn btn-primary" onClick={() => void updateServiceWorker(true)}>Update</button>
        <button className="btn btn-ghost" onClick={() => setNeedRefresh(false)}>Later</button>
      </div>
    </div>
  )
}
