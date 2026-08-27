import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types/campaign'

interface AuthContextType {
  user: UserRecord | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user?: UserRecord }>
  signUp: (
    email: string,
    password: string,
    name: string,
    role?: string,
  ) => Promise<{ error: Error | null; user?: UserRecord }>
  signOut: () => void
  refreshUser: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>
  confirmPasswordReset: (token: string, password: string) => Promise<{ error: Error | null }>
  requestEmailChange: (newEmail: string) => Promise<{ error: Error | null }>
  confirmEmailChange: (token: string, password: string) => Promise<{ error: Error | null }>
  confirmVerification: (token: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserRecord | null>(
    (pb.authStore.record as unknown as UserRecord) || null,
  )
  const [loading, setLoading] = useState(true)

  const syncUser = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record as unknown as UserRecord)
    } else {
      setUser(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    syncUser()
    const unsubscribe = pb.authStore.onChange(() => {
      syncUser()
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const refreshUser = async () => {
    if (pb.authStore.isValid) {
      try {
        const refreshed = await pb.collection('users').authRefresh()
        setUser(refreshed.record as unknown as UserRecord)
      } catch {
        pb.authStore.clear()
        setUser(null)
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      setUser(authData.record as unknown as UserRecord)
      return { error: null, user: authData.record as unknown as UserRecord }
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Erro ao autenticar usuário') }
    }
  }

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: string = 'coordinator',
  ) => {
    try {
      const newRecord = await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
        role,
      })

      try {
        await pb.collection('users').requestVerification(email)
      } catch {
        // best-effort verification trigger
      }

      const authData = await pb.collection('users').authWithPassword(email, password)
      setUser(authData.record as unknown as UserRecord)
      return { error: null, user: newRecord as unknown as UserRecord }
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Erro ao criar conta') }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return { error: null }
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error('Falha ao solicitar redefinição de senha'),
      }
    }
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, password)
      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Falha ao redefinir senha') }
    }
  }

  const requestEmailChange = async (newEmail: string) => {
    try {
      await pb.collection('users').requestEmailChange(newEmail)
      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Falha ao solicitar alteração de email'),
      }
    }
  }

  const confirmEmailChange = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmEmailChange(token, password)
      pb.authStore.clear()
      setUser(null)
      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Falha ao confirmar novo email') }
    }
  }

  const confirmVerification = async (token: string) => {
    try {
      await pb.collection('users').confirmVerification(token)
      await refreshUser()
      return { error: null }
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error('Token de verificação inválido ou expirado'),
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
        requestPasswordReset,
        confirmPasswordReset,
        requestEmailChange,
        confirmEmailChange,
        confirmVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
