import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { getUserProfile, updateUserProfile, deleteMyAccount, type UserProfileData } from '@/services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, User, Globe, LogOut, Trash2, ShieldAlert, Check, Save } from 'lucide-react'
import type { Lang } from '@/types'

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { user, signOut } = useAuthStore()
  const { lang, setLang, reset: resetAppStore, profile, setProfile } = useAppStore()

  // Profile edit state
  const [profileForm, setProfileForm] = useState<UserProfileData>({
    state: profile.state || 'Maharashtra',
    district: profile.district || 'Nashik',
    village: profile.village || '',
    capital: profile.capital || 50000,
    category: profile.category || 'general',
    gender: profile.gender || 'm',
    age: profile.age || 28,
    experience: profile.experience || 'none',
    collateral: profile.collateral || false,
    preferred_language: lang,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Account deletion state
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const REQUIRED_DELETE_KEYWORD = 'DELETE'

  const handleLanguageChange = (newLang: Lang) => {
    setLang(newLang)
    i18n.changeLanguage(newLang)
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      await updateUserProfile(profileForm)
      setProfile({
        state: profileForm.state,
        district: profileForm.district,
        village: profileForm.village,
        capital: profileForm.capital,
        category: (profileForm.category as any) || 'general',
        gender: (profileForm.gender as any) || 'm',
        age: profileForm.age,
        experience: (profileForm.experience as any) || 'none',
        collateral: profileForm.collateral,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Keep local changes
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    // Phase 3 requirement: clear zustand persisted slices, React Query cache, and local state
    resetAppStore()
    queryClient.clear()
    await signOut()
    navigate('/')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== REQUIRED_DELETE_KEYWORD) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteMyAccount()
    } catch {
      // Continue cleanup locally
    } finally {
      resetAppStore()
      queryClient.clear()
      await signOut()
      localStorage.clear()
      sessionStorage.clear()
      setIsDeleting(false)
      navigate('/')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          <span>{t('settings.title', 'Settings & Account')}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('settings.subtitle', 'Manage language preferences, rural profile attributes, and data privacy.')}
        </p>
      </div>

      {/* Language Section */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-foreground">
            <Globe className="w-5 h-5 text-primary" />
            <span>{t('settings.language_section', 'Language Preference')}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'en' as Lang, label: 'English', script: 'EN' },
              { code: 'hi' as Lang, label: 'हिन्दी', script: 'HI' },
              { code: 'mr' as Lang, label: 'मराठी', script: 'MR' },
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => handleLanguageChange(item.code)}
                className={`min-h-[48px] p-2.5 rounded-lg border text-center transition-all cursor-pointer font-medium text-sm ${
                  lang === item.code
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-card text-foreground hover:bg-secondary/40'
                }`}
              >
                <div>{item.label}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile Edit Section */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-bold text-foreground">
              <User className="w-5 h-5 text-primary" />
              <span>{t('settings.profile_section', 'Rural Profile Details')}</span>
            </div>
            {saveSuccess && (
              <span className="text-xs text-primary font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Profile saved</span>
              </span>
            )}
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">State</label>
                <input
                  type="text"
                  value={profileForm.state || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  className="w-full min-h-[44px] px-3 text-sm rounded-md border border-input bg-card text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">District</label>
                <input
                  type="text"
                  value={profileForm.district || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, district: e.target.value })}
                  className="w-full min-h-[44px] px-3 text-sm rounded-md border border-input bg-card text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Village / Taluka</label>
                <input
                  type="text"
                  value={profileForm.village || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, village: e.target.value })}
                  placeholder="e.g. Sinnar"
                  className="w-full min-h-[44px] px-3 text-sm rounded-md border border-input bg-card text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Personal Capital (₹)</label>
                <input
                  type="number"
                  value={profileForm.capital || 0}
                  onChange={(e) => setProfileForm({ ...profileForm, capital: Number(e.target.value) })}
                  className="w-full min-h-[44px] px-3 text-sm rounded-md border border-input bg-card text-foreground"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] flex items-center gap-2 font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : t('settings.save_profile', 'Save Profile')}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Actions (Logout & Delete) */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-foreground">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>{t('settings.account_security', 'Account & Privacy')}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-secondary/30 border border-border text-xs text-muted-foreground flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-foreground block">Signed in as:</span>
              <span>{user?.email || 'Guest User'}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="min-h-[40px] flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('settings.logout', 'Log Out')}</span>
            </Button>
          </div>

          {/* Delete Account CTA */}
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-destructive">
                {t('settings.delete_data_title', 'Delete My Data & Account')}
              </h4>
              <p className="text-xs text-muted-foreground">
                Permanently wipes all saved reports, chats, and cached credentials from servers and this device.
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="min-h-[40px] shrink-0 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('settings.delete_btn', 'Delete My Data')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal with Typed Confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="max-w-md w-full border-border bg-card shadow-2xl animate-in fade-in zoom-in-95">
            <CardContent className="p-6 space-y-4">
              <div className="p-2.5 rounded-full bg-destructive/15 text-destructive w-fit">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-foreground text-lg">
                  {t('settings.modal_delete_title', 'Confirm Account Deletion')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This action is irreversible. All your feasibility reports, loan recommendations, and chat history will be permanently deleted.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-foreground block">
                  Please type <span className="font-mono text-destructive font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full min-h-[44px] px-3 text-sm font-mono rounded-md border border-input bg-card text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmText('')
                  }}
                  className="min-h-[44px]"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>

                <Button
                  variant="destructive"
                  disabled={deleteConfirmText.trim().toUpperCase() !== REQUIRED_DELETE_KEYWORD || isDeleting}
                  onClick={handleDeleteAccount}
                  className="min-h-[44px]"
                >
                  {isDeleting ? 'Deleting...' : t('settings.confirm_delete_cta', 'Permanently Delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

