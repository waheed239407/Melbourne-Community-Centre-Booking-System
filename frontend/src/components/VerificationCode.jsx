import React, { useRef } from 'react'

/** One native input supports password managers and one-time-code autofill. */
export default function VerificationCode({ value, onChange, disabled, error, state = 'idle' }) {
  const inputRef = useRef(null)
  return <div className={`verification-control ${error ? 'has-error' : ''} state-${state}`}>
    <label htmlFor="verification-input">Verification code</label>
    <div className="verification-entry" onClick={() => inputRef.current?.focus()}>
      <div className="verification-tiles" aria-hidden="true">
        {Array.from({length: 6}, (_, i) => <span className={`code-tile ${value[i] ? 'filled' : ''}`} key={i}>{value[i] || ''}</span>)}
      </div>
      <input
        ref={inputRef}
        id="verification-input"
        className="verification-native-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        enterKeyHint="done"
        pattern="[0-9]{6}"
        maxLength={6}
        aria-label="Six digit verification code"
        aria-invalid={Boolean(error)}
        aria-describedby="verification-help"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0,6))}
        disabled={disabled}
      />
    </div>
    <p id="verification-help" className="input-help" aria-live="polite">
      {state === 'checking' ? 'Checking your code…' : state === 'verified' ? 'Email address verified.' : 'Enter all six digits. Your code will be checked automatically.'}
    </p>
  </div>
}
