# Email Verification Resend API Contract

This contract is designed to work with the current frontend in:
- `src/components/EmailVerificationBanner.jsx`
- `src/api.js`

The frontend already supports:
- success payload metadata (`resendCount`, `maxResends`, `resendLocked`)
- lock detection via HTTP `429`
- fallback behavior for older responses

## Endpoint

`POST /api/auth/verify-email/resend`

## Request Body

```json
{
  "email": "user@example.com"
}
```

## Security/Behavior Rules

1. Always return generic messaging to avoid account enumeration.
2. Enforce max resend attempts per account/email:
- `maxResends = 3`
3. Keep existing cooldown (if any), e.g. 60s between sends.
4. If user is already verified, do not send email and return safe response.
5. Return metadata fields so UI can show authoritative state.

## Success Response (Email Sent)

HTTP `200`

```json
{
  "success": true,
  "message": "If an account exists for this email, a verification email has been sent.",
  "resendCount": 1,
  "maxResends": 3,
  "resendLocked": false,
  "cooldownSeconds": 60
}
```

## Success Response (No Send Due To Cooldown)

HTTP `200` (recommended) or `429` (acceptable if your policy prefers strict cooldown errors)

```json
{
  "success": true,
  "message": "If an account exists for this email, a verification email has been sent.",
  "resendCount": 1,
  "maxResends": 3,
  "resendLocked": false,
  "cooldownSeconds": 34
}
```

## Locked Response (Max Attempts Reached)

HTTP `429`

```json
{
  "success": false,
  "message": "Maximum verification resend attempts reached.",
  "error": "Maximum verification resend attempts reached.",
  "resendCount": 3,
  "maxResends": 3,
  "resendLocked": true
}
```

## Already Verified Response

HTTP `200`

```json
{
  "success": true,
  "message": "If an account exists for this email, a verification email has been sent.",
  "resendCount": 0,
  "maxResends": 3,
  "resendLocked": true,
  "alreadyVerified": true
}
```

## Error Response (Unexpected Failure)

HTTP `500`

```json
{
  "success": false,
  "message": "Unable to process verification resend right now. Please try again.",
  "error": "Unable to process verification resend right now. Please try again."
}
```

## Backend Data Model (Suggested)

Track these values on the user row (or related auth table):
- `email_verification_resend_count` (integer, default 0)
- `email_verification_last_resend_at` (timestamp nullable)
- `email_verified` / `email_confirmed_at`

## Server Pseudocode

```text
if email missing -> 400
normalize email
lookup user by email
return generic success if not found
if user email already verified -> return 200 + alreadyVerified:true + resendLocked:true
if resend_count >= 3 -> return 429 + resendLocked:true + resendCount/maxResends
if cooldown active -> return 200 + cooldownSeconds remaining + resendCount/maxResends
send verification email
increment resend_count
update last_resend_at
return 200 + resendCount/maxResends/resendLocked:false
```

## Notes For Frontend Compatibility

Current UI will automatically consume these fields:
- `resendCount`
- `maxResends`
- `resendLocked`
- `429` responses

No further frontend changes are required once backend returns this shape.
