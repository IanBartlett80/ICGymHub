import { z } from 'zod'

// ABN validation (11 digits, basic format check)
export const validateABN = (abn: string): boolean => {
  const cleanABN = abn.replace(/[^0-9]/g, '')
  if (cleanABN.length !== 11) return false
  
  // Basic ABN checksum validation
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  let sum = 0
  for (let i = 0; i < 11; i++) {
    sum += parseInt(cleanABN[i]) * weights[i]
  }
  return sum % 89 === 0
}

// Extract domain from email
export const extractDomainFromEmail = (email: string): string | null => {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : null
}

// Validate if domain matches club domain
export const validateDomainMatch = (email: string, clubDomain: string): boolean => {
  const emailDomain = extractDomainFromEmail(email)
  if (!emailDomain) return false
  
  // Allow exact match or allow consumer domains to be explicitly added
  return emailDomain.toLowerCase() === clubDomain.toLowerCase()
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
  abn: z.string().refine((abn) => validateABN(abn), 'Invalid ABN format'),
  clubDomain: z.string().url('Please enter a valid domain').or(z.string().email()),
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
