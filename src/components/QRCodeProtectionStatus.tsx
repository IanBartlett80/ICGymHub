'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function QRCodeProtectionStatus() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const res = await fetch('/api/clubs/qr-access-pin');
      if (res.ok) {
        const data = await res.json();
        setHasPin(data.hasPin);
      }
    } catch (error) {
      console.error('Failed to check QR PIN status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-2">
        <div className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-gray-400 border-r-transparent"></div>
      </div>
    );
  }

  if (hasPin) {
    return (
      <div className="text-center mt-2">
        <div className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
          <ShieldCheckIcon className="h-4 w-4" />
          <span>Protected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center mt-2">
      <div className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold mb-1">
        <ShieldExclamationIcon className="h-4 w-4" />
        <span>Unprotected</span>
      </div>
      <div>
        <Link
          href="/dashboard/admin-config/access-control"
          className="text-red-600 text-xs underline hover:text-red-800 font-medium"
        >
          Protect your QR Codes
        </Link>
      </div>
    </div>
  );
}
