# Portal MFA Implementation Guide

## Overview

This document describes the implementation of two-factor authentication (MFA) for the Health Watchers patient portal. The implementation adds TOTP and SMS-based MFA support to protect patient health records.

## Files Created/Modified

### Backend (API)

#### New Files
1. **`apps/api/src/modules/portal/portal-mfa.routes.ts`**
   - MFA setup, verification, and management endpoints
   - Handles TOTP and SMS MFA flows
   - Requires patient authentication

2. **`apps/api/src/modules/portal/portal-mfa.service.ts`**
   - TOTP setup and verification logic
   - Backup code generation and validation
   - Uses `otplib` for TOTP operations

3. **`apps/api/src/modules/portal/sms-otp.service.ts`**
   - SMS OTP generation and verification
   - In-memory OTP store (production: use Redis)
   - Integration point for Twilio/AWS SNS

4. **`apps/api/src/modules/portal/portal.validation.ts`**
   - Zod schemas for MFA request validation
   - Validates codes, phone numbers, methods

5. **`apps/api/src/migrations/20260527_add_portal_mfa.ts`**
   - Database migration adding MFA fields to User collection
   - Adds indexes for performance

6. **`apps/api/src/modules/portal/portal-mfa.test.ts`**
   - Comprehensive test suite for MFA flows
   - Tests setup, verification, disable, and login flows
   - Mocks external dependencies

#### Modified Files
1. **`apps/api/src/modules/auth/models/user.model.ts`**
   - Added portal MFA fields to User interface and schema:
     - `portalMfaEnabled`: boolean
     - `portalMfaSecret`: encrypted TOTP secret
     - `portalMfaBackupCodes`: hashed backup codes
     - `portalMfaMethod`: 'totp' | 'sms'
     - `portalPhoneNumber`: for SMS delivery
     - `portalMfaEnabledAt`: timestamp

2. **`apps/api/src/modules/portal/portal.controller.ts`**
   - Updated login endpoint to check MFA status
   - Added MFA verification endpoint for login
   - Integrated MFA routes
   - Returns `mfaRequired` flag when MFA enabled

3. **`apps/api/src/lib/email.service.ts`**
   - Added email functions:
     - `sendPortalMfaEnabledEmail()`
     - `sendPortalMfaDisabledEmail()`
     - `sendPortalMfaBackupCodesEmail()`

### Frontend (Web)

#### New Files
1. **`apps/web/src/app/portal/settings/security/page.tsx`**
   - Portal security settings page
   - MFA setup UI (TOTP and SMS)
   - MFA disable UI
   - Backup code display and download
   - Status display

2. **`apps/web/src/app/portal/mfa/page.tsx`**
   - MFA verification page during login
   - Code input (6 digits or backup code)
   - Fallback to backup code option
   - Redirects to dashboard on success

#### Modified Files
1. **`apps/web/src/app/portal/login/page.tsx`**
   - Updated to handle MFA response
   - Stores temp token in localStorage
   - Redirects to MFA page if required
   - Stores access/refresh tokens on success

### Documentation

1. **`PORTAL_MFA_SECURITY.md`**
   - Comprehensive security documentation
   - API endpoint specifications
   - HIPAA compliance considerations
   - Operational guidelines
   - Troubleshooting guide

2. **`PORTAL_MFA_IMPLEMENTATION.md`** (this file)
   - Implementation overview
   - File structure and changes
   - Setup instructions
   - Testing guide

## Architecture

### MFA Flow Diagram

```
Login Request
    ↓
Validate Email + DOB
    ↓
Check MFA Enabled?
    ├─ No → Issue Access Token
    └─ Yes → Issue Temp Token + Redirect to MFA
              ↓
         Enter Code (TOTP/SMS/Backup)
              ↓
         Verify Code with Temp Token
              ↓
         Issue Access Token
```

### Setup Flow Diagram

```
Patient Initiates Setup
    ↓
Select Method (TOTP/SMS)
    ├─ TOTP → Generate Secret + QR Code
    └─ SMS → Generate OTP + Send SMS
    ↓
Enter Verification Code
    ↓
Verify Code
    ↓
Generate Backup Codes
    ↓
Enable MFA + Send Emails
```

## Database Schema

### User Collection Changes

```typescript
// New fields added to User schema
portalMfaEnabled: Boolean (default: false)
portalMfaSecret: String (encrypted, select: false)
portalMfaBackupCodes: [String] (hashed, select: false)
portalMfaMethod: String (enum: ['totp', 'sms'])
portalPhoneNumber: String
portalMfaEnabledAt: Date
```

## API Endpoints

### Setup MFA
```
POST /api/v1/portal/auth/mfa/setup
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "method": "totp" | "sms",
  "phoneNumber": "+1234567890"  // Required for SMS
}

Response:
{
  "status": "success",
  "data": {
    "method": "totp",
    "secret": "...",
    "qrCodeDataUrl": "data:image/png;base64,...",
    "tempToken": "...",
    "message": "Scan the QR code..."
  }
}
```

### Verify MFA Setup
```
POST /api/v1/portal/auth/mfa/verify
Content-Type: application/json

Request:
{
  "code": "123456",
  "tempToken": "..."
}

Response:
{
  "status": "success",
  "data": {
    "message": "MFA enabled successfully",
    "backupCodes": ["code1", "code2", ...],
    "method": "totp"
  }
}
```

### Verify Login MFA
```
POST /api/v1/portal/auth/mfa/verify-login
Content-Type: application/json

Request:
{
  "code": "123456",
  "tempToken": "..."
}

Response:
{
  "status": "success",
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Disable MFA
```
POST /api/v1/portal/auth/mfa/disable
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "code": "123456"  // Current MFA code or backup code
}

Response:
{
  "status": "success",
  "data": {
    "message": "MFA disabled successfully"
  }
}
```

### Get MFA Status
```
GET /api/v1/portal/auth/mfa/status
Authorization: Bearer <access_token>

Response:
{
  "status": "success",
  "data": {
    "mfaEnabled": true,
    "mfaMethod": "totp",
    "mfaEnabledAt": "2026-05-27T10:00:00Z"
  }
}
```

## Setup Instructions

### 1. Database Migration

Run the migration to add MFA fields:
```bash
npm run migrate:up
```

This creates the new fields on the User collection and adds necessary indexes.

### 2. Environment Variables

No new environment variables required. SMS integration will need:
- `TWILIO_ACCOUNT_SID` (for SMS)
- `TWILIO_AUTH_TOKEN` (for SMS)
- `TWILIO_PHONE_NUMBER` (for SMS)

### 3. Dependencies

Ensure these are installed:
```bash
npm install otplib qrcode
```

Already included in the project.

### 4. Frontend Routes

The following routes are now available:
- `/portal/login` - Updated login page
- `/portal/mfa` - MFA verification page
- `/portal/settings/security` - Security settings page

### 5. Middleware Update

The portal middleware in `apps/web/src/middleware.ts` already handles:
- Portal public routes: `/portal/login`, `/portal/mfa`
- Portal protected routes: require `portalAccessToken`

## Testing

### Unit Tests

Run portal MFA tests:
```bash
npm run test -- portal-mfa.test.ts
```

Tests cover:
- TOTP setup and verification
- SMS OTP generation and verification
- Backup code generation and validation
- MFA enable/disable flows
- Login with MFA
- Error handling

### Integration Tests

Test the complete flow:
1. Create a test patient account
2. Enable TOTP MFA
3. Log out
4. Log in and verify MFA code
5. Disable MFA
6. Verify login works without MFA

### Manual Testing

1. **Setup TOTP**:
   - Navigate to `/portal/settings/security`
   - Click "Enable Authenticator App MFA"
   - Scan QR code with authenticator app
   - Enter code from app
   - Save backup codes

2. **Login with TOTP**:
   - Go to `/portal/login`
   - Enter email and DOB
   - Enter code from authenticator app
   - Verify redirect to dashboard

3. **Setup SMS**:
   - Navigate to `/portal/settings/security`
   - Select SMS method
   - Enter phone number
   - Enter OTP from SMS
   - Save backup codes

4. **Disable MFA**:
   - Navigate to `/portal/settings/security`
   - Click "Disable MFA"
   - Enter current MFA code
   - Verify MFA disabled

## Security Considerations

### Secrets Management

- TOTP secrets encrypted at rest using field-level encryption
- Backup codes hashed with SHA-256
- Phone numbers stored in plaintext (needed for SMS delivery)

### Token Security

- Temp tokens: 5-minute expiry
- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry with family-based rotation

### Rate Limiting

- OTP generation limited to prevent abuse
- Verification attempts limited (max 3 per OTP)
- Existing brute-force protection applies to login

### Email Security

- MFA change notifications sent to registered email
- Alerts patient to unauthorized changes
- Provides audit trail for compliance

## Compliance

### HIPAA

- MFA significantly reduces unauthorized access risk
- Encrypted secrets protect against database breaches
- Email notifications provide audit trail
- Backup codes enable legitimate account recovery

### NIST Guidelines

- Implements NIST SP 800-63B recommendations
- Supports both "something you have" (phone) and "something you know" (code)
- Backup codes provide account recovery mechanism

## Troubleshooting

### Common Issues

**"Invalid verification code"**
- Check system time on authenticator device
- Ensure code entered before 30-second window expires
- Try backup code if available

**"Temp token expired"**
- Session expired, restart MFA setup/login
- Temp tokens valid for 5 minutes only

**"Phone number invalid"**
- Use international format: +1234567890
- Ensure number can receive SMS

**"All backup codes used"**
- Contact clinic support for account recovery
- Will need to verify identity
- MFA will be reset

## Future Enhancements

1. **WebAuthn/FIDO2**: Hardware security key support
2. **Push Notifications**: App-based approval
3. **Conditional MFA**: Risk-based MFA requirement
4. **Recovery Codes**: Longer, more memorable codes
5. **MFA Enforcement**: Require MFA for all patients
6. **Audit Dashboard**: Patient view of MFA activity

## Support

For issues or questions:
1. Check `PORTAL_MFA_SECURITY.md` for detailed documentation
2. Review test cases in `portal-mfa.test.ts`
3. Check error messages and logs
4. Contact development team for assistance

## Acceptance Criteria Checklist

- [x] Patients can enable TOTP MFA for portal account
- [x] Portal login requires MFA when enabled
- [x] SMS OTP available as fallback method
- [x] Email notification sent on MFA changes
- [x] Tests cover full portal MFA flow
- [x] Security documentation updated
- [x] Backup codes provided for account recovery
- [x] MFA can be disabled with verification
- [x] Frontend UI for MFA setup and management
- [x] Database migration for MFA fields
