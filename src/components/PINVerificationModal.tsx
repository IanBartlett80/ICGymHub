'use client';

import { useState, useEffect, useRef } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

interface PINVerificationModalProps {
  clubId: string;
  clubName: string;
  onVerified: () => void;
}

const MAX_ATTEMPTS = 5;
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Session storage helper
const getPINSession = (clubId: string) => {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(`qr_pin_verified_${clubId}`);
  if (!stored) return null;
  
  const session = JSON.parse(stored);
  const now = Date.now();
  
  // Check if session expired
  if (now > session.expiresAt) {
    sessionStorage.removeItem(`qr_pin_verified_${clubId}`);
    return null;
  }
  
  return session;
};

const setPINSession = (clubId: string) => {
  if (typeof window === 'undefined') return;
  
  const session = {
    clubId,
    verifiedAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION,
  };
  
  sessionStorage.setItem(`qr_pin_verified_${clubId}`, JSON.stringify(session));
};

export default function PINVerificationModal({
  clubId,
  clubName,
  onVerified,
}: PINVerificationModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [locked, setLocked] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    // Focus first input on mount
    inputRefs[0].current?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-verify when all 4 digits entered
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      if (fullPin.length === 4) {
        verifyPIN(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Check if pasted data is 4 digits
    if (/^\d{4}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setPin(digits);
      inputRefs[3].current?.focus();
      verifyPIN(pastedData);
    }
  };

  const verifyPIN = async (pinValue: string) => {
    if (locked) return;
    
    setVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/clubs/verify-qr-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId, pin: pinValue }),
      });

      const data = await response.json();

      if (data.verified) {
        // Store session
        setPINSession(clubId);
        onVerified();
      } else {
        // Increment attempts
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setLocked(true);
          setError(`Maximum attempts reached. Please contact your club administrator.`);
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }

        // Clear PIN inputs
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setError('Failed to verify PIN. Please try again.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullPin = pin.join('');
    if (fullPin.length === 4 && !locked) {
      verifyPIN(fullPin);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <ShieldCheckIcon className="w-10 h-10 text-indigo-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          QR Access Verification
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Enter the 4-digit PIN for <strong>{clubName}</strong>
        </p>

        {/* PIN Input Form */}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 justify-center mb-6">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={locked || verifying}
                className={`w-14 h-16 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none transition-all ${
                  error
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                } ${locked || verifying ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 text-center">{error}</p>
            </div>
          )}

          {/* Verifying State */}
          {verifying && (
            <div className="mb-4 flex items-center justify-center gap-2 text-indigo-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
              <span className="text-sm font-medium">Verifying...</span>
            </div>
          )}

          {/* Attempts Counter */}
          {attempts > 0 && !locked && (
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-500">
                Attempts: {attempts} / {MAX_ATTEMPTS}
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              This PIN is set by your club administrator to secure QR code access.
              {!locked && ' Contact them if you need assistance.'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// Hook to check if user has verified PIN for a club
export function useQRPINVerification(clubId: string | null) {
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!clubId) {
      setIsChecking(false);
      return;
    }

    // Check session storage
    const session = getPINSession(clubId);
    setIsVerified(!!session);
    setIsChecking(false);
  }, [clubId]);

  const markAsVerified = () => {
    if (clubId) {
      setPINSession(clubId);
      setIsVerified(true);
    }
  };

  return { isVerified, isChecking, markAsVerified };
}
