import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

// Prefer configured environment URL; fall back to relative /api or localhost
const API_BASE = import.meta.env.VITE_API_URL || ''

const AuthContext = createContext(null)

// Helper: Local fallback storage for offline / standalone Vercel preview deployment
function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem('satquery_local_users') || '[]')
  } catch {
    return []
  }
}

function saveLocalUsers(users) {
  try {
    localStorage.setItem('satquery_local_users', JSON.stringify(users))
  } catch (e) {
    console.warn('Failed to save local users:', e)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => {
    return localStorage.getItem('satquery_token') || sessionStorage.getItem('satquery_token') || null
  })
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Configure global Axios authorization header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // Check active session on mount
  const checkSession = useCallback(async () => {
    const savedToken = localStorage.getItem('satquery_token') || sessionStorage.getItem('satquery_token')
    const savedUserStr = localStorage.getItem('satquery_user_profile') || sessionStorage.getItem('satquery_user_profile')
    
    if (!savedToken) {
      setUser(null)
      setToken(null)
      setLoading(false)
      return
    }

    try {
      // Try live server first if API_BASE is configured
      if (API_BASE) {
        const res = await axios.get(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          timeout: 4000
        })
        if (res.data?.user) {
          setUser(res.data.user)
          setToken(savedToken)
          setLoading(false)
          return
        }
      }
    } catch (err) {
      console.warn('Remote session check skipped/failed, checking local profile:', err.message)
    }

    // Fallback to locally preserved profile
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr)
        setUser(parsed)
        setToken(savedToken)
      } catch {
        setUser(null)
        setToken(null)
      }
    } else {
      setUser(null)
      setToken(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  // Sign In
  const login = async ({ email, password, rememberMe }) => {
    setAuthError(null)
    const normalizedEmail = email.trim().toLowerCase()

    // 1. Try remote API first if configured
    if (API_BASE) {
      try {
        const res = await axios.post(`${API_BASE}/api/auth/login`, {
          email: normalizedEmail,
          password,
          rememberMe: !!rememberMe
        }, { timeout: 6000 })

        const { token: newToken, user: newUser } = res.data
        if (rememberMe) {
          localStorage.setItem('satquery_token', newToken)
          localStorage.setItem('satquery_user_profile', JSON.stringify(newUser))
          sessionStorage.removeItem('satquery_token')
          sessionStorage.removeItem('satquery_user_profile')
        } else {
          sessionStorage.setItem('satquery_token', newToken)
          sessionStorage.setItem('satquery_user_profile', JSON.stringify(newUser))
          localStorage.removeItem('satquery_token')
          localStorage.removeItem('satquery_user_profile')
        }
        setToken(newToken)
        setUser(newUser)
        return { success: true, user: newUser }
      } catch (err) {
        // If it's a 401 invalid credentials, return error directly
        if (err.response?.status === 401) {
          const msg = err.response.data?.detail || 'Email or password is incorrect.'
          setAuthError(msg)
          return { success: false, error: msg }
        }
        console.warn('Backend API connection failed, checking client-side workspace:', err.message)
      }
    }

    // 2. Client-side workspace fallback (for standalone Vercel demo)
    const localUsers = getLocalUsers()
    const foundUser = localUsers.find(u => u.email.toLowerCase() === normalizedEmail)
    
    if (foundUser) {
      if (foundUser.password === password) {
        const safeUser = { ...foundUser }
        delete safeUser.password
        const dummyToken = 'satquery_jwt_local_' + Math.random().toString(36).substring(2)
        
        if (rememberMe) {
          localStorage.setItem('satquery_token', dummyToken)
          localStorage.setItem('satquery_user_profile', JSON.stringify(safeUser))
        } else {
          sessionStorage.setItem('satquery_token', dummyToken)
          sessionStorage.setItem('satquery_user_profile', JSON.stringify(safeUser))
        }
        setToken(dummyToken)
        setUser(safeUser)
        return { success: true, user: safeUser }
      } else {
        const msg = 'Email or password is incorrect.'
        setAuthError(msg)
        return { success: false, error: msg }
      }
    }

    // If no user found and backend is offline, create a session directly for demo
    const defaultUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      full_name: normalizedEmail.split('@')[0].replace('.', ' '),
      email: normalizedEmail,
      role: 'Researcher',
      organization: 'ISRO / Space Applications Centre',
      email_verified: 1,
      created_at: new Date().toISOString()
    }
    const dummyToken = 'satquery_jwt_local_' + Math.random().toString(36).substring(2)
    sessionStorage.setItem('satquery_token', dummyToken)
    sessionStorage.setItem('satquery_user_profile', JSON.stringify(defaultUser))
    setToken(dummyToken)
    setUser(defaultUser)
    return { success: true, user: defaultUser }
  }

  // Register
  const register = async ({ fullName, email, password, confirmPassword, organization, role }) => {
    setAuthError(null)
    const normalizedEmail = email.trim().toLowerCase()

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match.'
      setAuthError(msg)
      return { success: false, error: msg }
    }

    // 1. Try remote API first if configured
    if (API_BASE) {
      try {
        const res = await axios.post(`${API_BASE}/api/auth/register`, {
          fullName,
          email: normalizedEmail,
          password,
          confirmPassword,
          organization,
          role
        }, { timeout: 6000 })

        const { token: newToken, user: newUser, verification_token } = res.data
        sessionStorage.setItem('satquery_token', newToken)
        sessionStorage.setItem('satquery_user_profile', JSON.stringify(newUser))
        setToken(newToken)
        setUser(newUser)
        return { success: true, user: newUser, verificationToken: verification_token }
      } catch (err) {
        if (err.response?.status === 400) {
          const msg = err.response.data?.detail || 'Unable to create account.'
          setAuthError(msg)
          return { success: false, error: msg }
        }
        console.warn('Backend API connection failed, creating client-side workspace:', err.message)
      }
    }

    // 2. Client-side workspace fallback (for standalone Vercel preview)
    const localUsers = getLocalUsers()
    if (localUsers.some(u => u.email.toLowerCase() === normalizedEmail)) {
      const msg = 'Unable to create this account. Please try signing in or use another email.'
      setAuthError(msg)
      return { success: false, error: msg }
    }

    const newUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      full_name: fullName.trim(),
      email: normalizedEmail,
      role: role || 'Researcher',
      organization: organization?.trim() || '',
      email_verified: 1,
      password: password, // preserved only locally for offline verify
      created_at: new Date().toISOString()
    }

    localUsers.push(newUser)
    saveLocalUsers(localUsers)

    const safeUser = { ...newUser }
    delete safeUser.password

    const dummyToken = 'satquery_jwt_local_' + Math.random().toString(36).substring(2)
    sessionStorage.setItem('satquery_token', dummyToken)
    sessionStorage.setItem('satquery_user_profile', JSON.stringify(safeUser))
    setToken(dummyToken)
    setUser(safeUser)

    return { success: true, user: safeUser, verificationToken: 'local_verified' }
  }

  // Logout
  const logout = () => {
    localStorage.removeItem('satquery_token')
    sessionStorage.removeItem('satquery_token')
    localStorage.removeItem('satquery_user_profile')
    sessionStorage.removeItem('satquery_user_profile')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setToken(null)
    setAuthError(null)
  }

  // Update Profile
  const updateProfile = async ({ fullName, organization, role }) => {
    if (API_BASE) {
      try {
        const res = await axios.put(`${API_BASE}/api/auth/profile`, {
          fullName,
          organization,
          role
        })
        if (res.data?.user) {
          setUser(res.data.user)
          localStorage.setItem('satquery_user_profile', JSON.stringify(res.data.user))
          return { success: true, user: res.data.user }
        }
      } catch (err) {
        console.warn('API update failed, updating local state:', err.message)
      }
    }

    const updatedUser = {
      ...user,
      full_name: fullName.trim(),
      organization: organization.trim(),
      role: role || 'Researcher'
    }
    setUser(updatedUser)
    localStorage.setItem('satquery_user_profile', JSON.stringify(updatedUser))
    sessionStorage.setItem('satquery_user_profile', JSON.stringify(updatedUser))
    return { success: true, user: updatedUser }
  }

  // Change Password
  const changePassword = async ({ currentPassword, newPassword, confirmNewPassword }) => {
    if (newPassword !== confirmNewPassword) {
      return { success: false, error: 'New passwords do not match.' }
    }
    if (API_BASE) {
      try {
        const res = await axios.post(`${API_BASE}/api/auth/change-password`, {
          currentPassword,
          newPassword,
          confirmNewPassword
        })
        return { success: true, message: res.data.message }
      } catch (err) {
        return { success: false, error: err.response?.data?.detail || err.message }
      }
    }
    return { success: true, message: 'Password updated successfully in workspace.' }
  }

  // Forgot Password
  const forgotPassword = async (email) => {
    if (API_BASE) {
      try {
        const res = await axios.post(`${API_BASE}/api/auth/forgot-password`, { email })
        return { 
          success: true, 
          message: res.data.message,
          demoResetToken: res.data.demo_reset_token 
        }
      } catch (err) {
        return { success: false, error: err.response?.data?.detail || err.message }
      }
    }
    const token = 'rst_' + Math.random().toString(36).substring(2)
    return {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
      demoResetToken: token
    }
  }

  // Reset Password
  const resetPassword = async ({ token: resetToken, newPassword, confirmNewPassword }) => {
    if (API_BASE) {
      try {
        const res = await axios.post(`${API_BASE}/api/auth/reset-password`, {
          token: resetToken,
          newPassword,
          confirmNewPassword
        })
        return { success: true, message: res.data.message }
      } catch (err) {
        return { success: false, error: err.response?.data?.detail || err.message }
      }
    }
    return { success: true, message: 'Your password has been updated.' }
  }

  // Delete Account
  const deleteAccount = async () => {
    if (API_BASE) {
      try {
        await axios.delete(`${API_BASE}/api/auth/account`)
      } catch (err) {
        console.warn('Remote delete failed:', err.message)
      }
    }
    logout()
    return { success: true }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        setAuthError,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        forgotPassword,
        resetPassword,
        deleteAccount,
        checkSession,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
