'use client';

import { useState } from 'react';

interface EmailRecipientsInputProps {
  recipients: string[];
  onChange: (recipients: string[]) => void;
}

export default function EmailRecipientsInput({ recipients, onChange }: EmailRecipientsInputProps) {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = () => {
    const trimmedEmail = emailInput.trim();
    
    if (!trimmedEmail) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (recipients.includes(trimmedEmail)) {
      setError('This email address is already added');
      return;
    }

    onChange([...recipients, trimmedEmail]);
    setEmailInput('');
    setError('');
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(recipients.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <div className="space-y-3">
      {/* Added Recipients Pills */}
      {recipients.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          {recipients.map((email, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{email}</span>
              <button
                onClick={() => removeEmail(email)}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                type="button"
                title="Remove email"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Email Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter email address..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {error && (
            <p className="text-red-600 text-sm mt-1">{error}</p>
          )}
        </div>
        <button
          onClick={addEmail}
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          + Add
        </button>
      </div>

      {/* Helper Text */}
      {recipients.length === 0 && (
        <p className="text-xs text-gray-500">
          Add email addresses one at a time. Press Enter or click "+ Add" to add each email.
        </p>
      )}
    </div>
  );
}
