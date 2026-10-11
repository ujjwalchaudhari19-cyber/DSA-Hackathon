import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LogIn, ArrowRight, UserCheck, ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/dashboard'

  const { loginWithGoogle, loginWithEmail, continueAsGuest } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setErrorMsg('')
    setIsLoading(true)
    const { error } = await loginWithGoogle()
    setIsLoading(false)
    if (error) {
      setErrorMsg(error.message || 'Google authentication failed. Please try again.')
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Please enter both your email address and password.')
      return
    }

    setIsLoading(true)
    const { error } = await loginWithEmail(email, password)
    setIsLoading(false)

    if (error) {
      setErrorMsg(error.message || 'Invalid email or password. Please verify and try again.')
    } else {
      navigate(redirectPath)
    }
  }

  const handleGuestContinue = async () => {
    setIsLoading(true)
    await continueAsGuest()
    setIsLoading(false)
    navigate(redirectPath)
  }

  return (
    <div className="max-w-md mx-auto py-6 sm:py-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
          <LogIn className="w-7 h-7 text-primary" />
          <span>{t('auth.login_title', 'Log In to GramUdyam AI')}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.login_subtitle', 'Save your enterprise reports, explore government subsidies, and sync across devices.')}
        </p>
      </div>

      <Card className="border-border shadow-md">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Large Continue with Google Button first */}
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full min-h-[48px] h-12 rounded-lg border-2 border-border bg-card hover:bg-secondary/60 text-foreground font-semibold text-base flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t('auth.continue_google', 'Continue with Google')}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-3 text-xs text-muted-foreground uppercase font-semibold">
              {t('auth.or_with_email', 'Or with email')}
            </span>
          </div>

          {/* 2. Email / Password form second */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-primary" />
                <span>{t('auth.email_label', 'Email Address')}</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full min-h-[48px] h-12 px-3.5 text-base rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-primary" />
                <span>{t('auth.password_label', 'Password')}</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[48px] h-12 px-3.5 text-base rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] h-12 text-base font-bold flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'Signing in...' : t('auth.login_submit', 'Sign In')}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* 3. Continue as guest always visible */}
          <div className="pt-2 border-t border-border space-y-3">
            <button
              type="button"
              onClick={handleGuestContinue}
              disabled={isLoading}
              className="w-full min-h-[48px] h-12 rounded-lg border border-dashed border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/60 text-foreground font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-muted-foreground" />
              <span>{t('auth.continue_guest', 'Continue as Guest (No Account Required)')}</span>
            </button>

            <div className="text-center text-sm text-muted-foreground">
              <span>{t('auth.no_account', "Don't have an account?")} </span>
              <Link to="/signup" className="text-primary font-bold underline hover:text-primary-700">
                {t('auth.sign_up_link', 'Sign Up')}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

