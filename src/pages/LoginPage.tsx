import { useCallback, useEffect, useRef, useState } from 'react'
import { Logo } from '../components/Logo'
import { api } from '../services/api'

type LoginStep = 'identity' | 'code' | 'welcome'

const EMPTY_CODE = ['', '', '', '', '', '']
const STEP_EXIT_MS = 320
const WELCOME_HOLD_MS = 950
const PLATFORM_LAUNCH_MS = 850

export function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [step, setStep] = useState<LoginStep>('identity')
  const [identity, setIdentity] = useState('')
  const [code, setCode] = useState(EMPTY_CODE)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(10)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sentCodeHint, setSentCodeHint] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const transitionTimer = useRef<number | undefined>(undefined)

  const changeStep = useCallback((nextStep: LoginStep) => {
    if (transitionTimer.current) return

    setIsLeaving(true)
    transitionTimer.current = window.setTimeout(() => {
      setStep(nextStep)
      setIsLeaving(false)
      transitionTimer.current = undefined
    }, STEP_EXIT_MS)
  }, [])

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!identity.trim() || loading) return
    setErrorMessage(null)
    setLoading(true)
    try {
      const res = await api.sendOtp(identity.trim())
      if (res.debugCode) {
        setSentCodeHint(res.debugCode)
      }
      changeStep('code')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar código de acesso'
      setErrorMessage(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const confirmCode = useCallback(async (codeToVerify?: string[]) => {
    const codeString = (codeToVerify || code).join('')
    if (codeString.length !== 6 || loading) return
    setErrorMessage(null)
    setLoading(true)
    try {
      await api.verifyOtp(identity.trim() || 'levycamara@hotmail.com', codeString)
      changeStep('welcome')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Código incorreto ou expirado. Tente novamente.'
      setErrorMessage(errorMsg)
      setCode(EMPTY_CODE)
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }, [changeStep, code, identity, loading])

  const setDigit = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '')

    if (digits.length > 1) {
      const nextCode = [...code]
      digits.slice(0, 6 - index).split('').forEach((digit, offset) => {
        nextCode[index + offset] = digit
      })
      setCode(nextCode)

      if (nextCode.every(Boolean)) confirmCode(nextCode)
      else inputs.current[Math.min(index + digits.length, 5)]?.focus()
      return
    }

    const digit = digits.slice(-1)
    const nextCode = code.map((item, itemIndex) => itemIndex === index ? digit : item)
    setCode(nextCode)

    if (digit && index < 5) inputs.current[index + 1]?.focus()
    if (nextCode.every(Boolean)) confirmCode(nextCode)
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const nextCode = EMPTY_CODE.map((_, index) => pasted[index] ?? '')
    setCode(nextCode)

    if (pasted.length === 6) confirmCode(nextCode)
    else inputs.current[pasted.length]?.focus()
  }

  const resendCode = async () => {
    setCode(EMPTY_CODE)
    setResendSeconds(10)
    setErrorMessage(null)
    inputs.current[0]?.focus()
    try {
      const res = await api.sendOtp(identity.trim())
      if (res.debugCode) setSentCodeHint(res.debugCode)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (step !== 'code' || resendSeconds === 0) return

    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [resendSeconds, step])

  useEffect(() => {
    if (step !== 'welcome') return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const reducedMotionTimer = window.setTimeout(onAuthenticated, 120)
      return () => window.clearTimeout(reducedMotionTimer)
    }

    const launchTimer = window.setTimeout(() => setIsLaunching(true), WELCOME_HOLD_MS)
    const authenticationTimer = window.setTimeout(onAuthenticated, WELCOME_HOLD_MS + PLATFORM_LAUNCH_MS)

    return () => {
      window.clearTimeout(launchTimer)
      window.clearTimeout(authenticationTimer)
    }
  }, [step, onAuthenticated])

  useEffect(() => () => {
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current)
  }, [])

  return (
    <div
      className="auth-page"
      data-node-id={step === 'identity' ? '1:1844' : step === 'code' ? '1:1858' : '1:3'}
    >
      <main className={`auth-card ${isLaunching ? 'auth-card--launching' : ''}`} aria-live="polite">
        <Logo light />

        {step === 'identity' && (
          <form
            className={`auth-content auth-content--identity auth-step-enter ${isLeaving ? 'auth-step-leave' : ''}`}
            onSubmit={sendCode}
          >
            <div className="auth-input-wrap" data-node-id="4:2">
              <input
                id="identity"
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                placeholder="Digite seu email ou celular"
                aria-label="Email ou celular"
                autoComplete="username"
                disabled={loading}
              />
              <button disabled={!identity.trim() || isLeaving || loading} aria-label="Continuar">
                <img src="/assets/figma/login_imgFrame1410119738.svg" alt="" />
              </button>
            </div>
            {errorMessage && (
              <p style={{ color: '#ff917b', fontSize: '13px', margin: '10px 0 0', textAlign: 'center' }}>
                {errorMessage}
              </p>
            )}
          </form>
        )}

        {step === 'code' && (
          <section className={`auth-content auth-content--code auth-otp-enter ${isLeaving ? 'auth-step-leave' : ''}`}>
            <p>
              Digite o código que você recebeu no seu email:
              {sentCodeHint && (
                <span style={{ display: 'block', fontSize: '13px', color: '#d7ff70', marginTop: '6px' }}>
                  Código gerado: <strong>{sentCodeHint}</strong>
                </span>
              )}
            </p>

            <div className="code-inputs" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { inputs.current[index] = element }}
                  value={digit}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  aria-label={`Dígito ${index + 1}`}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  disabled={isLeaving || loading}
                  style={{ '--otp-index': index } as React.CSSProperties}
                />
              ))}
            </div>

            {errorMessage && (
              <p style={{ color: '#ff917b', fontSize: '13px', margin: '8px 0 0', textAlign: 'center' }}>
                {errorMessage}
              </p>
            )}

            <p className="auth-resend">
              Não recebi ainda, reenviar código em:{' '}
              {resendSeconds > 0 ? (
                <span>{resendSeconds} seg</span>
              ) : (
                <button type="button" onClick={resendCode}>reenviar agora</button>
              )}
            </p>
          </section>
        )}

        {step === 'welcome' && (
          <section
            className={`auth-content auth-content--welcome auth-welcome-enter ${isLaunching ? 'auth-content--launching' : ''}`}
            data-node-id="4:8"
          >
            <p>Bem vindo ao</p>
            <h1>Allyo Space</h1>
          </section>
        )}
      </main>

      <div className={`auth-launch-curtain ${isLaunching ? 'auth-launch-curtain--active' : ''}`} aria-hidden="true">
        <Logo />
      </div>
    </div>
  )
}
