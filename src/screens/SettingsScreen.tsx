import { useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { Button } from '../components/Button'
import { useAppData } from '../state/appDataContext'

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { name, setName, resetAll } = useAppData()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <>
      <BackHeader title="Settings" backLabel="Today" onBack={onBack} />
      <div className="form form--spaced">
        <label className="field">
          <span className="field__label">Your first name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
          <span className="field__hint">Used in the greeting on Today.</span>
        </label>

        <div className="field">
          <span className="field__label">Saved data</span>
          <span className="field__hint">
            Saved on this device only. Logins that sync
            across devices come later.
          </span>
          {confirmReset ? (
            <div className="confirm">
              <span>Erase everything you added and go back to the sample data?</span>
              <div className="confirm__actions">
                <Button variant="destructive" small onClick={() => { resetAll(); setConfirmReset(false) }}>Erase</Button>
                <Button variant="secondary" small onClick={() => setConfirmReset(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="destructive" onClick={() => setConfirmReset(true)}>Reset to sample data</Button>
          )}
        </div>
      </div>
    </>
  )
}
