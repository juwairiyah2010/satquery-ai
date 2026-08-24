import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const AuthContext = createContext(null)

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
    if (!savedToken) {
      setUser(null)
      setToken(null)
      setLoading(false)
      return
    }

    try {
      const res = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
      if (res.data?.user) {
        setUser(res.data.user)
        setToken(savedToken)
      } else {
        throw new Error('Invalid session')
      }
    } catch (err) {
      console.warn('Session check failed or expired:', err.message)
      localStorage.removeItem('satquery_token')
      sessionStorage.removeItem('satquery_token')
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  // Sign In
  const login = async ({ email, password, rememberMe }) => {
    setAuthError(null)
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
        rememberMe: !!rememberMe
      })
      const { token: newToken, user: newUser } = res.data
      if (rememberMe) {
        localStorage.setItem('satquery_token', newToken)
        sessionStorage.removeItem('satquery_token')
      } else {
        sessionStorage.setItem('satquery_token', newToken)
        localStorage.removeItem('satquery_token')
      }
      setToken(newToken)
      setUser(newUser)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      return { success: true, user: newUser }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Email or password is incorrect.'
      setAuthError(msg)
      return { success: false, error: msg }
    }
  }

  // Register
  const register = async ({ fullName, email, password, confirmPassword, organization, role }) => {
    setAuthError(null)
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, {
        fullName,
        email,
        password,
        confirmPassword,
        organization,
        role
      })
      const { token: newToken, user: newUser, verification_token } = res.data
      sessionStorage.setItem('satquery_token', newToken)
      localStorage.removeItem('satquery_token')
      setToken(newToken)
      setUser(newUser)
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      return { success: true, user: newUser, verificationToken: verification_token }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Unable to create this account.'
      setAuthError(msg)
      return { success: false, error: msg }
    }
  }

  // Logout
  const logout = () => {
    localStorage.removeItem('satquery_token')
    sessionStorage.removeItem('satquery_token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setToken(null)
    setAuthError(null)
    // Clear any cached sensitive session data
  }

  // Update Profile
  const updateProfile = async ({ fullName, organization, role }) => {
    try {
      const res = await axios.put(`${API_BASE}/api/auth/profile`, {
        fullName,
        organization,
        role
      })
      if (res.data?.user) {
        setUser(res.data.user)
      }
      return { success: true, user: res.data.user }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update profile.'
      return { success: false, error: msg }
    }
  }

  // Change Password
  const changePassword = async ({ currentPassword, newPassword, confirmNewPassword }) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/change-password`, {
        currentPassword,
        newPassword,
        confirmNewPassword
      })
      return { success: true, message: res.data.message }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to change password.'
      return { success: false, error: msg }
    }
  }

  // Forgot Password
  const forgotPassword = async (email) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/forgot-password`, { email })
      return { 
        success: true, 
        message: res.data.message,
        demoResetToken: res.data.demo_reset_token 
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Something went wrong. Please try again.'
      return { success: false, error: msg }
    }
  }

  // Reset Password
  const resetPassword = async ({ token: resetToken, newPassword, confirmNewPassword }) => {
    try {
      const res = await axios.post(`${API_BASE}/api/auth/reset-password`, {
        token: resetToken,
        newPassword,
        confirmNewPassword
      })
      return { success: true, message: res.data.message }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to reset password.'
      return { success: false, error: msg }
    }
  }

  // Delete Account
  const deleteAccount = async () => {
    try {
      await axios.delete(`${API_BASE}/api/auth/account`)
      logout()
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete account.'
      return { success: false, error: msg }
    }
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
