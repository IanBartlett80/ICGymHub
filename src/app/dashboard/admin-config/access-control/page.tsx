'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { formatDateTime } from '@/lib/timezone';
import { showToast } from '@/lib/toast';
import { 
  ShieldCheckIcon, 
  KeyIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export default function AccessControlPage() {
  const [hasPin, setHasPin] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetPinForm, setShowSetPinForm] = useState(false);
  const [showChangePinForm, setShowChangePinForm] = useState(false);
  const [showRemovePinConfirm, setShowRemovePinConfirm] = useState(false);
  
  // PIN form state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPasswordVerify, setShowPasswordVerify] = useState(false);
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPINStatus();
  }, []);

  const loadPINStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/clubs/qr-access-pin');
      if (response.ok) {
        const data = await response.json();
        setHasPin(data.hasPin);
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error('Failed to load PIN status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    // Validation
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/clubs/qr-access-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });

      if (response.ok) {
        setHasPin(true);
        setLastUpdated(new Date().toISOString());
        setShowSetPinForm(false);
        setNewPin('');
        setConfirmPin('');
        showToast.success('QR Access PIN set successfully');
      } else {
        const data = await response.json();
        setPinError(data.error || 'Failed to set PIN');
      }
    } catch (error) {
      console.error('Failed to set PIN:', error);
      setPinError('Failed to set PIN. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    // Validation
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('New PINs do not match');
      return;
    }

    try {
      setSaving(true);

      // If showing password verify, use password to reset
      if (showPasswordVerify) {
        if (!accountPassword) {
          setPinError('Please enter your account password');
          return;
        }

        // Verify password first
        const passwordResponse = await fetch('/api/auth/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: accountPassword }),
        });

        if (!passwordResponse.ok) {
          setPinError('Incorrect password');
          return;
        }

        // Password verified, set new PIN
        const response = await fetch('/api/clubs/qr-access-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: newPin }),
        });

        if (response.ok) {
          setHasPin(true);
          setLastUpdated(new Date().toISOString());
          setShowChangePinForm(false);
          resetChangePinForm();
          showToast.success('QR Access PIN updated successfully');
        } else {
          const data = await response.json();
          setPinError(data.error || 'Failed to update PIN');
        }
      } else {
        // Verify current PIN first
        if (!/^\d{4}$/.test(currentPin)) {
          setPinError('Please enter your current PIN');
          return;
        }

        // Get current club ID from localStorage
        const userData = localStorage.getItem('userData');
        if (!userData) {
          setPinError('Session error. Please refresh and try again.');
          return;
        }
        
        const user = JSON.parse(userData);
        if (!user?.clubId) {
          setPinError('Session error. Please refresh and try again.');
          return;
        }

        // Verify current PIN
        const verifyResponse = await fetch('/api/clubs/verify-qr-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clubId: user.clubId, pin: currentPin }),
        });

        const verifyData = await verifyResponse.json();

        if (!verifyData.verified) {
          setPinError('Current PIN is incorrect');
          return;
        }

        // Current PIN verified, set new PIN
        const response = await fetch('/api/clubs/qr-access-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: newPin }),
        });

        if (response.ok) {
          setHasPin(true);
          setLastUpdated(new Date().toISOString());
          setShowChangePinForm(false);
          resetChangePinForm();
          showToast.success('QR Access PIN changed successfully');
        } else {
          const data = await response.json();
          setPinError(data.error || 'Failed to change PIN');
        }
      }
    } catch (error) {
      console.error('Failed to change PIN:', error);
      setPinError('Failed to change PIN. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetChangePinForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setAccountPassword('');
    setShowPasswordVerify(false);
    setPinError('');
  };

  const handleRemovePin = async () => {
    try {
      const response = await fetch('/api/clubs/qr-access-pin', {
        method: 'DELETE',
      });

      if (response.ok) {
        setHasPin(false);
        setLastUpdated(null);
        setShowRemovePinConfirm(false);
        showToast.success('QR Access PIN removed successfully');
      } else {
        showToast.error('Failed to remove PIN');
      }
    } catch (error) {
      console.error('Failed to remove PIN:', error);
      showToast.error('Failed to remove PIN. Please try again.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Access Control" showClubManagementNav={true}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Access Control & QR Security" showClubManagementNav={true}>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">QR Code Access Control</h1>
          <p className="text-gray-600">
            Secure your QR codes with a 4-digit PIN. Staff will need to enter this PIN when scanning QR codes for equipment zones, venues, and injury reports.
          </p>
        </div>

        {/* Current Status Card */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {hasPin ? (
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {hasPin ? 'QR Access PIN Active' : 'No QR Access PIN'}
                </h2>
                <p className="text-sm text-gray-600">
                  {hasPin 
                    ? 'Your QR codes are protected with a PIN' 
                    : 'QR codes can be accessed without a PIN (not recommended)'
                  }
                </p>
              </div>
            </div>
            {hasPin && (
              <button
                onClick={() => setShowRemovePinConfirm(true)}
                className="text-red-600 hover:text-red-700 p-2"
                title="Remove PIN"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          {lastUpdated && (
            <div className="text-sm text-gray-500 mb-4">
              Last updated: {formatDateTime(lastUpdated)}
            </div>
          )}

          <button
            onClick={() => {
              if (hasPin) {
                setShowChangePinForm(true);
              } else {
                setShowSetPinForm(true);
              }
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <KeyIcon className="w-5 h-5" />
            {hasPin ? 'Change PIN' : 'Set PIN'}
          </button>
        </div>

        {/* Protected QR Codes Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <QrCodeIcon className="w-5 h-5" />
            Protected QR Codes
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            The following QR codes will require PIN verification when scanned:
          </p>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">• Equipment Zones:</span>
              <span>Staff scanning zone QR codes to view/report equipment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">• Venues:</span>
              <span>Staff scanning venue QR codes to access zone information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[140px]">• Injury Reports:</span>
              <span>Staff scanning injury report form QR codes</span>
            </li>
          </ul>
        </div>

        {/* Security Info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5" />
            Security Information
          </h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• PIN is stored securely using industry-standard encryption</li>
            <li>• Staff have 5 attempts to enter the correct PIN</li>
            <li>• Verified sessions last for 1 hour on the device</li>
            <li>• If you forget your PIN, use the "I Don't Know Current PIN" option when changing PIN</li>
            <li>• Only Administrators can set or update the PIN</li>
          </ul>
        </div>
      </div>

      {/* Set Initial PIN Modal */}
      {showSetPinForm && !hasPin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Set QR Access PIN</h3>
            <form onSubmit={handleSetPin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New PIN (4 digits)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm PIN
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••"
                  required
                />
              </div>
              {pinError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {pinError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSetPinForm(false);
                    setNewPin('');
                    setConfirmPin('');
                    setPinError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || newPin.length !== 4 || confirmPin.length !== 4}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Set PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {showChangePinForm && hasPin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Change QR Access PIN</h3>
            <form onSubmit={handleChangePin}>
              {!showPasswordVerify ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current PIN (4 digits)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="••••"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New PIN (4 digits)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="••••"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New PIN
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="••••"
                      required
                    />
                  </div>
                  
                  {/* Forgot Current PIN Link */}
                  <div className="mb-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordVerify(true);
                        setCurrentPin('');
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      I Don't Know Current PIN
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Enter your GymHub account password to verify your identity and reset the PIN.
                    </p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Password
                    </label>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter your password"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New PIN (4 digits)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="••••"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New PIN
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="••••"
                      required
                    />
                  </div>
                  
                  {/* Back to Current PIN */}
                  <div className="mb-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordVerify(false);
                        setAccountPassword('');
                      }}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                    >
                      ← Back to Current PIN
                    </button>
                  </div>
                </>
              )}
              
              {pinError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {pinError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePinForm(false);
                    resetChangePinForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving || 
                    newPin.length !== 4 || 
                    confirmPin.length !== 4 ||
                    (!showPasswordVerify && currentPin.length !== 4) ||
                    (showPasswordVerify && !accountPassword)
                  }
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Change PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove PIN Confirmation Modal */}
      {showRemovePinConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Remove QR Access PIN?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove the PIN? QR codes will be accessible without verification (not recommended for security).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRemovePinConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemovePin}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
              >
                Remove PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
