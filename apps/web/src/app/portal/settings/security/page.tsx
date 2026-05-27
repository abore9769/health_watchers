'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface MFAStatus {
  mfaEnabled: boolean;
  mfaMethod: 'totp' | 'sms' | null;
  mfaEnabledAt: string | null;
}

export default function PortalSecuritySettings() {
  const router = useRouter();
  const { user } = useAuth();
  const [mfaStatus, setMfAStatus] = useState<MFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupMethod, setSetupMethod] = useState<'totp' | 'sms'>('totp');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      const response = await fetch('/api/v1/portal/auth/mfa/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('portalAccessToken')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMFAStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupMFA = async () => {
    setError(null);
    try {
      const payload: any = { method: setupMethod };
      if (setupMethod === 'sms') {
        payload.phoneNumber = phoneNumber;
      }

      const response = await fetch('/api/v1/portal/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('portalAccessToken')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to setup MFA');
        return;
      }

      const data = await response.json();
      setTempToken(data.data.tempToken);

      if (setupMethod === 'totp') {
        setQrCode(data.data.qrCodeDataUrl);
      }
    } catch (err) {
      setError('An error occurred while setting up MFA');
      console.error(err);
    }
  };

  const handleVerifyMFA = async () => {
    if (!tempToken || !verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setError(null);
    try {
      const response = await fetch('/api/v1/portal/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          tempToken,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Invalid verification code');
        return;
      }

      const data = await response.json();
      setBackupCodes(data.data.backupCodes);
      setShowBackupCodes(true);
      setMFAStatus({
        mfaEnabled: true,
        mfaMethod: setupMethod,
        mfaEnabledAt: new Date().toISOString(),
      });
    } catch (err) {
      setError('An error occurred while verifying MFA');
      console.error(err);
    }
  };

  const handleDisableMFA = async () => {
    if (!disableCode) {
      setError('Please enter your verification code');
      return;
    }

    setError(null);
    try {
      const response = await fetch('/api/v1/portal/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('portalAccessToken')}`,
        },
        body: JSON.stringify({ code: disableCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to disable MFA');
        return;
      }

      setMFAStatus({
        mfaEnabled: false,
        mfaMethod: null,
        mfaEnabledAt: null,
      });
      setShowDisableModal(false);
      setDisableCode('');
    } catch (err) {
      setError('An error occurred while disabling MFA');
      console.error(err);
    }
  };

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
    element.setAttribute('download', 'backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return <div className="p-6">Loading security settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Security Settings</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>

        {mfaStatus?.mfaEnabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold">✓ MFA is enabled</p>
              <p className="text-green-700 text-sm mt-1">
                Method: {mfaStatus.mfaMethod === 'totp' ? 'Authenticator App' : 'SMS'}
              </p>
              {mfaStatus.mfaEnabledAt && (
                <p className="text-green-700 text-sm">
                  Enabled on: {new Date(mfaStatus.mfaEnabledAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowDisableModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Disable MFA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Protect your account with two-factor authentication. Choose your preferred method:
            </p>
            <div className="space-y-2">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="mfaMethod"
                  value="totp"
                  checked={setupMethod === 'totp'}
                  onChange={(e) => setSetupMethod(e.target.value as 'totp')}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold">Authenticator App</p>
                  <p className="text-sm text-gray-600">Use Google Authenticator, Authy, or similar</p>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="mfaMethod"
                  value="sms"
                  checked={setupMethod === 'sms'}
                  onChange={(e) => setSetupMethod(e.target.value as 'sms')}
                  className="mr-3"
                />
                <div>
                  <p className="font-semibold">SMS</p>
                  <p className="text-sm text-gray-600">Receive codes via text message</p>
                </div>
              </label>
            </div>
            <button
              onClick={() => setShowSetupModal(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Enable {setupMethod === 'totp' ? 'Authenticator App' : 'SMS'} MFA
            </button>
          </div>
        )}
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Setup {setupMethod === 'totp' ? 'Authenticator App' : 'SMS'} MFA
            </h3>

            {setupMethod === 'sms' && !tempToken && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            {!tempToken ? (
              <button
                onClick={handleSetupMFA}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Continue
              </button>
            ) : (
              <div className="space-y-4">
                {qrCode && (
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-3 py-2 border rounded-lg text-center text-2xl tracking-widest"
                  />
                </div>
                <button
                  onClick={handleVerifyMFA}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Verify & Enable MFA
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setShowSetupModal(false);
                setQrCode(null);
                setTempToken(null);
                setVerificationCode('');
                setPhoneNumber('');
              }}
              className="w-full mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Save Your Backup Codes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Save these codes in a safe place. Each code can be used once if you lose access to your authenticator.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-48 overflow-y-auto">
              {backupCodes.map((code, idx) => (
                <div key={idx} className="font-mono text-sm py-1">
                  {code}
                </div>
              ))}
            </div>
            <button
              onClick={downloadBackupCodes}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-2"
            >
              Download Codes
            </button>
            <button
              onClick={() => {
                setShowBackupCodes(false);
                setShowSetupModal(false);
                fetchMFAStatus();
              }}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Disable MFA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Disable Two-Factor Authentication</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your verification code to disable MFA. Your account will be less secure.
            </p>
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-3 py-2 border rounded-lg text-center text-2xl tracking-widest mb-4"
            />
            <button
              onClick={handleDisableMFA}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mb-2"
            >
              Disable MFA
            </button>
            <button
              onClick={() => {
                setShowDisableModal(false);
                setDisableCode('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
