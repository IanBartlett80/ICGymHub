'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import axiosInstance from '@/lib/axios'

interface AuthContextType {
  isAuthenticated: boolean
  user: UserData | null
  logout: () => void
  setAuthUser: (userData: UserData) => void
}

interface UserData {
  id: string
  username: string
  email: string
  fullName: string
  role: string
  clubId: string
  clubName: string
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  logout: () => {},
  setAuthUser: () => {},
})

export const useAuth = () => useContext(AuthContext)

const INACTIVITY_TIMEOUT = 60 * 60 * 1000 // 1 hour in milliseconds
const PUBLIC_PATHS = ['/sign-in', '/register', '/verify-email', '/resend-verification', '/injury-report']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Check if current path is public
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname?.startsWith(path))

  // Initialize user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Failed to parse user data:', error)
        localStorage.removeItem('userData')
      }
    }
    setIsLoading(false)
  }, [])

  // Function to manually set authenticated user
  const setAuthUser = (userData: UserData) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('userData', JSON.stringify(userData))
  }

  // Logout function
  const logout = async (showExpiredMessage = false) => {
    try {
      // Call logout API to clear server-side session
      await axiosInstance.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      // Clear local state
      localStorage.removeItem('userData')
      setUser(null)
      setIsAuthenticated(false)
      
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }

      // Redirect to sign-in
      const redirectUrl = showExpiredMessage 
        ? '/sign-in?sessionExpired=true' 
        : '/sign-in?inactivity=true'
      router.push(redirectUrl)
    }
  }

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now()

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    // Set new timer only if user is authenticated and not on public path
    if (isAuthenticated && !isPublicPath) {
      inactivityTimerRef.current = setTimeout(() => {
        logout(false)
      }, INACTIVITY_TIMEOUT)
    }
  }

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated || isPublicPath) {
      return
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    // Activity handler with debounce
    let debounceTimer: NodeJS.Timeout
    const handleActivity = () => {
      // Debounce to avoid resetting timer too frequently
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        resetInactivityTimer()
      }, 1000) // Debounce by 1 second
    }

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    // Initialize timer
    resetInactivityTimer()

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      clearTimeout(debounceTimer)
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [isAuthenticated, isPublicPath])

  // Check for authentication on protected routes
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicPath && pathname !== '/') {
      router.push('/sign-in')
    }
  }, [isLoading, isAuthenticated, isPublicPath, pathname, router])

  // Periodic token refresh (every 45 minutes if user is active)
  useEffect(() => {
    if (!isAuthenticated || isPublicPath) {
      return
    }

    const refreshInterval = setInterval(async () => {
      // Only refresh if user has been active in the last hour
      const timeSinceLastActivity = Date.now() - lastActivityRef.current
      if (timeSinceLastActivity < INACTIVITY_TIMEOUT) {
        try {
          const response = await axiosInstance.post('/api/auth/refresh')
          if (response.data.user) {
            localStorage.setItem('userData', JSON.stringify(response.data.user))
            setUser(response.data.user)
          }
        } catch (error) {
          console.error('Periodic token refresh failed:', error)
        }
      }
    }, 45 * 60 * 1000) // 45 minutes

    return () => clearInterval(refreshInterval)
  }, [isAuthenticated, isPublicPath])

  const value = {
    isAuthenticated,
    user,
    logout: () => logout(false),
    setAuthUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
