import { z } from 'zod'

// ABN validation: accept any 11-digit numeric (relaxed for onboarding UX)
export const validateABN = (abn: string): boolean => {
  const cleanABN = abn.replace(/[^0-9]/g, '')
  return cleanABN.length === 11
}

// Extract domain from email
export const extractDomainFromEmail = (email: string): string | null => {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : null
}

// Normalize club domain (accept bare domain or URL)
export const normalizeDomain = (domain: string): string | null => {
  if (!domain) return null
  const trimmed = domain.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      return new URL(trimmed).hostname.toLowerCase()
    } catch {
      return null
    }
  }
  return trimmed.toLowerCase()
}

// Validate if domain matches club domain
export const validateDomainMatch = (email: string, clubDomain: string): boolean => {
  const emailDomain = extractDomainFromEmail(email)?.toLowerCase()
  const normalizedClubDomain = normalizeDomain(clubDomain)
  if (!emailDomain || !normalizedClubDomain) return false
  return emailDomain === normalizedClubDomain
}

const domainPattern = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/

export const isValidDomainOrUrl = (value: string): boolean => {
  const trimmed = value.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed)
      return true
    } catch {
      return false
    }
  }
  return domainPattern.test(trimmed)
}

// Check for common consumer email domains
export const isConsumerEmail = (email: string): boolean => {
  const consumerDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com']
  const domain = extractDomainFromEmail(email)
  return domain ? consumerDomains.includes(domain.toLowerCase()) : false
}

// Validation schemas
export const clubRegistrationSchema = z.object({
  clubName: z.string().min(2, 'Club name must be at least 2 characters').max(255),
  abn: z.string().refine((abn) => validateABN(abn), 'ABN must be 11 digits'),
  clubDomain: z.string().refine((d) => isValidDomainOrUrl(d), 'Enter a domain like example.com or https://example.com'),
  address: z.string().min(5, 'Please enter a valid address'),
  city: z.string().min(2, 'Please enter a valid city'),
  state: z.enum(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']),
  postalCode: z.string().regex(/^\d{4}$/, 'Postal code must be 4 digits'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  adminFullName: z.string().min(2, 'Full name must be at least 2 characters'),
  adminEmail: z.string().email('Please enter a valid email address'),
  adminUsername: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  agreeToTerms: z.boolean().refine((val) => val === true, 'You must agree to the terms'),
})

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

export const passwordResetSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type ClubRegistrationInput = z.infer<typeof clubRegistrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>
