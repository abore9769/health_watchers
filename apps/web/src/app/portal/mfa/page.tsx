'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PortalMFAVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'sms' | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);

  useEffect(() => {
    const method = searchParams.get('method') as 'totp' | 'sms' | null;
    setMfaMethod(method);
  }, [searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const tempToken = localStorage.getItem('portalMfaTempToken');
      if (!tempToken) {
        setError('Session expired. Please log in again.');
        router.push('/portal/login');
        return;
      }

      const response = await fetch('/api/v1/portal/auth/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.replace(/\D/g, ''),
          tempToken,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Invalid verification code');
        setLoading(false);
        return;
      }

      const data = await response.json();
      localStorage.setItem('portalAccessToken', data.data.accessToken);
      localStorage.setItem('portalRefreshToken', data.data.refreshToken);
      localStorage.removeItem('portalMfaTempToken');

      router.push('/portal/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleBackupCodeToggle = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Identity</h1>
          <p className="text-gray-600">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : mfaMethod === 'sms'
                ? 'Enter the code sent to your phone'
                : 'Enter the code from your authenticator app'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setCode(useBackupCode ? val.slice(0, 32) : val.slice(0, 6));
              }}
              placeholder={useBackupCode ? 'Enter backup code' : '000000'}
              maxLength={useBackupCode ? 32 : 6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < (useBackupCode ? 8 : 6)}
            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleBackupCodeToggle}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {useBackupCode ? 'Use verification code instead' : 'Use backup code instead'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/portal/login" className="text-sm text-gray-600 hover:text-gray-900">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
