import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

// Create axios instance
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
})

// Flag to prevent multiple refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

// Request interceptor - attach access token from localStorage if available
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Access token is in HTTP-only cookie, so browser sends it automatically
    // But we can add user data from localStorage for additional context if needed
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip refresh for login and refresh endpoints to avoid loops
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            return axiosInstance(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to refresh the token
        const response = await axios.post('/api/auth/refresh', {}, { withCredentials: true })

        if (response.data.user) {
          // Update localStorage with fresh user data
          localStorage.setItem('userData', JSON.stringify(response.data.user))
        }

        // Process queued requests
        processQueue()
        isRefreshing = false

        // Retry the original request
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // Refresh failed - session truly expired
        processQueue(refreshError)
        isRefreshing = false

        // Clear local storage
        localStorage.removeItem('userData')

        // Check if we're not already on the sign-in page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/sign-in')) {
          // Redirect to sign-in with session expired message
          window.location.href = '/sign-in?sessionExpired=true'
        }

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
