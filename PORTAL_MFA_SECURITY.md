# Portal MFA Security Documentation

## Overview

The Health Watchers patient portal now supports two-factor authentication (MFA) to protect patient health records (PHI). This document outlines the MFA implementation, security considerations, and operational guidelines.

## Why Portal MFA Matters

Patient portal accounts contain sensitive Protected Health Information (PHI) including:
- Medical history and diagnoses
- Appointment records
- Lab results
- Medication information
- Insurance details

Without MFA, a compromised patient password gives attackers full access to this data, constituting a HIPAA breach. Portal MFA significantly reduces this risk.

## Supported MFA Methods

### 1. TOTP (Time-based One-Time Password)

**Method**: Authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)

**Advantages**:
- Works offline
- No dependency on SMS infrastructure
- Industry standard
- User controls the secret

**Implementation**:
- Uses `otplib` library for TOTP generation and verification
- 30-second time window for code validity
- QR code provided for easy setup

**Security**:
- Secret stored encrypted in database
- Backup codes provided for account recovery
- 6-digit codes with 30-second validity window

### 2. SMS OTP (One-Time Password)

**Method**: SMS text message to registered phone number

**Advantages**:
- Accessible to users without smartphone apps
- Familiar to most users
- No setup required beyond phone number

**Limitations**:
- Dependent on SMS infrastructure
- Vulnerable to SIM swapping attacks
- Should be considered a fallback method

**Implementation**:
- 6-digit codes valid for 10 minutes
- In-memory OTP store (production should use Redis)
- Integration point for Twilio/AWS SNS

**Security**:
- Phone number stored in user record
- OTP codes not persisted to database
- Rate limiting on OTP generation

## Portal MFA Flow

### Setup Flow

1. **Patient initiates MFA setup**
   - Navigates to `/portal/settings/security`
   - Selects preferred method (TOTP or SMS)

2. **For TOTP**:
   - Backend generates secret and QR code
   - Returns temp token (5-minute expiry)
   - Frontend displays QR code for scanning
   - Patient enters verification code from authenticator

3. **For SMS**:
   - Patient provides phone number
   - Backend generates and sends OTP
   - Returns temp token
   - Patient enters OTP from SMS

4. **Verification**:
   - Backend verifies code using temp token
   - Generates 10 backup codes
   - Enables MFA on account
   - Sends confirmation email

5. **Backup Codes**:
   - 10 single-use codes generated
   - Hashed with SHA-256 before storage
   - Patient can download for safekeeping
   - Each code can be used once as fallback

### Login Flow with MFA

1. **Patient logs in**
   - Provides email and date of birth
   - Backend validates credentials

2. **MFA Check**:
   - If MFA enabled: returns `mfaRequired: true` + temp token
   - If MFA disabled: returns access token + refresh token

3. **MFA Verification**:
   - Patient redirected to `/portal/mfa`
   - Enters code from authenticator or SMS
   - Can use backup code as fallback
   - Backend verifies code with temp token

4. **Token Issuance**:
   - Upon successful verification
   - Backend issues access token + refresh token
   - Patient redirected to dashboard

### Disable Flow

1. **Patient initiates MFA disable**
   - Navigates to security settings
   - Clicks "Disable MFA"

2. **Verification Required**:
   - Must provide current MFA code or backup code
   - Prevents unauthorized disabling

3. **Confirmation**:
   - MFA disabled on account
   - Confirmation email sent
   - All backup codes invalidated

## Security Implementation Details

### Database Schema

**User Model Extensions**:
```typescript
portalMfaEnabled: boolean          // MFA enabled flag
portalMfaSecret: string            // Encrypted TOTP secret
portalMfaBackupCodes: string[]     // Hashed backup codes
portalMfaMethod: 'totp' | 'sms'   // Selected method
portalPhoneNumber: string          // For SMS method
portalMfaEnabledAt: Date          // When MFA was enabled
```

### Encryption & Hashing

- **TOTP Secret**: Encrypted using field-level encryption (same as PHI fields)
- **Backup Codes**: Hashed with SHA-256 before storage
- **Phone Number**: Stored in plaintext (not PHI, needed for SMS delivery)

### Token Security

- **Temp Token**: 5-minute expiry, used only for MFA setup/verification
- **Access Token**: 15-minute expiry, standard JWT
- **Refresh Token**: 7-day expiry with family-based rotation

### Rate Limiting

- **OTP Generation**: Limited to prevent abuse
- **Verification Attempts**: Max 3 attempts per OTP before invalidation
- **Login Attempts**: Existing brute-force protection applies

## API Endpoints

### Setup MFA

```
POST /api/v1/portal/auth/mfa/setup
Authorization: Bearer <access_token>
Content-Type: application/json

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

## Email Notifications

### MFA Enabled
- Sent when patient enables MFA
- Includes method (TOTP or SMS)
- Advises to contact support if unauthorized

### MFA Disabled
- Sent when patient disables MFA
- Warns about reduced security
- Advises to contact support if unauthorized

### Backup Codes Generated
- Sent with backup codes
- Advises secure storage
- Notes one-time use limitation

## Compliance & HIPAA

### Security Controls

1. **Access Control**: MFA required for portal access
2. **Encryption**: TOTP secrets encrypted at rest
3. **Audit Trail**: MFA events logged for compliance
4. **Notification**: Email alerts on MFA changes
5. **Recovery**: Backup codes enable account recovery

### HIPAA Considerations

- MFA significantly reduces unauthorized access risk
- Encrypted secrets protect against database breaches
- Email notifications provide audit trail
- Backup codes enable legitimate account recovery
- SMS OTP should be supplemented with TOTP for high-security environments

## Operational Guidelines

### For Patients

1. **Setup Recommendations**:
   - Use TOTP as primary method (more secure)
   - Save backup codes in secure location
   - Do not share codes with anyone

2. **Troubleshooting**:
   - If authenticator lost: use backup code
   - If all backup codes used: contact clinic support
   - If phone number changed: disable and re-enable SMS MFA

3. **Best Practices**:
   - Enable MFA immediately after account creation
   - Review security settings regularly
   - Update phone number if changed

### For Clinic Administrators

1. **Monitoring**:
   - Review MFA adoption rates
   - Monitor failed verification attempts
   - Check for suspicious account activity

2. **Support**:
   - Provide MFA setup guidance to patients
   - Assist with account recovery if needed
   - Document MFA-related support requests

3. **Security**:
   - Ensure SMS provider is secure
   - Monitor for SIM swapping attacks
   - Keep TOTP library updated

## Testing

### Unit Tests

- TOTP generation and verification
- Backup code generation and validation
- OTP generation and expiration
- Email notification sending

### Integration Tests

- Complete MFA setup flow
- Login with MFA verification
- MFA disable flow
- Backup code usage
- Error handling and edge cases

### Security Tests

- Temp token expiration
- Invalid code rejection
- Rate limiting enforcement
- Backup code one-time use
- Unauthorized access prevention

## Future Enhancements

1. **WebAuthn/FIDO2**: Hardware security key support
2. **Push Notifications**: App-based approval instead of codes
3. **Conditional MFA**: Risk-based MFA requirement
4. **Recovery Codes**: Longer, more memorable backup codes
5. **MFA Enforcement**: Require MFA for all patients
6. **Audit Dashboard**: Patient view of MFA activity

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

## References

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [NIST SP 800-63B - Authentication](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
