"use client"

import { createContext, useContext } from 'react'
import type { AuthContext } from '@/utils/auth/requireAuth'

const AuthContextValue = createContext<AuthContext | null>(null)

export function AuthProvider({ value, children }: { value: AuthContext; children: React.ReactNode }) {
  return <AuthContextValue.Provider value={value}>{children}</AuthContextValue.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthContextValue)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
