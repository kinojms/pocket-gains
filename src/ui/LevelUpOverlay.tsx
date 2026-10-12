import { Icon } from './Icon'
import { Pet } from './Pet'

export function LevelUpOverlay({ petName, level, onClose }: { petName: string; level: number; onClose(): void }) {
  return (
    <div className="levelup" role="dialog" aria-modal="true" aria-labelledby="levelup-title">
      <div className="levelup-card">
        <span className="levelup-burst" aria-hidden="true"><Icon name="star" size={40} /><Icon name="sparkle" size={30} /><Icon name="star" size={28} /></span>
        <div className="levelup-pet"><Pet size={150} mood="proud" /></div>
        <h2 id="levelup-title">Level up!</h2>
        <p className="muted">{petName} reached level {level}</p>
        <button className="btn btn-primary btn-block" data-feedback="none" onClick={onClose}>Awesome!</button>
      </div>
    </div>
  )
}
