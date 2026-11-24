import { useEffect } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react'
import { setTokenGetter } from '../lib/api'
import { syncAccount } from '../lib/texts'

export const authEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

/** Connects Clerk's session to the API client and syncs when someone signs in. */
export function AuthBridge() {
  const { isSignedIn, getToken } = useAuth()
  useEffect(() => {
    if (!isSignedIn) {
      setTokenGetter(null)
      return
    }
    setTokenGetter(() => getToken())
    syncAccount().catch((e) => console.warn('Sync failed', e))
    const onFocus = () => syncAccount().catch(() => {})
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
    }
  }, [isSignedIn, getToken])
  return null
}

export function AccountButton() {
  if (!authEnabled) return null
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="btn small">Sign in to sync</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </>
  )
}
