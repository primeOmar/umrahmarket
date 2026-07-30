# Email Verification Resend Implementation Examples

These examples implement the contract in:
- `EMAIL_VERIFICATION_RESEND_API_CONTRACT.md`

They are intentionally generic and can be adapted to your existing auth service and DB layer.

## Express Example (TypeScript-like JavaScript)

```js
// POST /api/auth/verify-email/resend
// Assumes you have a User model/service and a sendVerificationEmail(user) helper.

const MAX_RESENDS = 3;
const COOLDOWN_SECONDS = 60;

function genericOk(res, payload = {}) {
  return res.status(200).json({
    success: true,
    message: 'If an account exists for this email, a verification email has been sent.',
    ...payload,
  });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

app.post('/api/auth/verify-email/resend', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
        error: 'Email is required.',
      });
    }

    const user = await userService.findByEmail(email);

    // Anti-enumeration: never reveal whether account exists.
    if (!user) {
      return genericOk(res);
    }

    const resendCount = Number(user.email_verification_resend_count || 0);
    const lastResendAt = user.email_verification_last_resend_at
      ? new Date(user.email_verification_last_resend_at)
      : null;

    // Treat either boolean or timestamp as verified.
    const isVerified =
      user.email_verified === true ||
      !!user.email_confirmed_at ||
      !!user.email_verified_at;

    if (isVerified) {
      return genericOk(res, {
        resendCount,
        maxResends: MAX_RESENDS,
        resendLocked: true,
        alreadyVerified: true,
      });
    }

    if (resendCount >= MAX_RESENDS) {
      return res.status(429).json({
        success: false,
        message: 'Maximum verification resend attempts reached.',
        error: 'Maximum verification resend attempts reached.',
        resendCount,
        maxResends: MAX_RESENDS,
        resendLocked: true,
      });
    }

    if (lastResendAt) {
      const elapsedSeconds = Math.floor((Date.now() - lastResendAt.getTime()) / 1000);
      const remaining = Math.max(0, COOLDOWN_SECONDS - elapsedSeconds);

      if (remaining > 0) {
        // Keep response generic while exposing cooldown metadata.
        return genericOk(res, {
          resendCount,
          maxResends: MAX_RESENDS,
          resendLocked: false,
          cooldownSeconds: remaining,
        });
      }
    }

    await authService.sendVerificationEmail(user);

    const nextCount = resendCount + 1;
    await userService.updateById(user.id, {
      email_verification_resend_count: nextCount,
      email_verification_last_resend_at: new Date().toISOString(),
    });

    return genericOk(res, {
      resendCount: nextCount,
      maxResends: MAX_RESENDS,
      resendLocked: nextCount >= MAX_RESENDS,
      cooldownSeconds: COOLDOWN_SECONDS,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Unable to process verification resend right now. Please try again.',
      error: 'Unable to process verification resend right now. Please try again.',
    });
  }
});
```

## NestJS Example

```ts
// auth.controller.ts
@Post('verify-email/resend')
async resendVerifyEmail(@Body('email') email: string, @Res() res: Response) {
  return this.authService.resendVerifyEmail(email, res);
}
```

```ts
// auth.service.ts
import { Response } from 'express';

const MAX_RESENDS = 3;
const COOLDOWN_SECONDS = 60;

private normalizeEmail(email?: string) {
  return String(email || '').trim().toLowerCase();
}

private genericOk(res: Response, payload: Record<string, unknown> = {}) {
  return res.status(200).json({
    success: true,
    message: 'If an account exists for this email, a verification email has been sent.',
    ...payload,
  });
}

async resendVerifyEmail(rawEmail: string, res: Response) {
  const email = this.normalizeEmail(rawEmail);
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required.',
      error: 'Email is required.',
    });
  }

  const user = await this.usersRepo.findOne({ where: { email } });
  if (!user) return this.genericOk(res);

  const resendCount = Number(user.email_verification_resend_count || 0);
  const lastResendAt = user.email_verification_last_resend_at
    ? new Date(user.email_verification_last_resend_at)
    : null;

  const isVerified =
    user.email_verified === true ||
    !!user.email_confirmed_at ||
    !!user.email_verified_at;

  if (isVerified) {
    return this.genericOk(res, {
      resendCount,
      maxResends: MAX_RESENDS,
      resendLocked: true,
      alreadyVerified: true,
    });
  }

  if (resendCount >= MAX_RESENDS) {
    return res.status(429).json({
      success: false,
      message: 'Maximum verification resend attempts reached.',
      error: 'Maximum verification resend attempts reached.',
      resendCount,
      maxResends: MAX_RESENDS,
      resendLocked: true,
    });
  }

  if (lastResendAt) {
    const elapsedSeconds = Math.floor((Date.now() - lastResendAt.getTime()) / 1000);
    const remaining = Math.max(0, COOLDOWN_SECONDS - elapsedSeconds);

    if (remaining > 0) {
      return this.genericOk(res, {
        resendCount,
        maxResends: MAX_RESENDS,
        resendLocked: false,
        cooldownSeconds: remaining,
      });
    }
  }

  await this.mailer.sendVerificationEmail(user);

  user.email_verification_resend_count = resendCount + 1;
  user.email_verification_last_resend_at = new Date();
  await this.usersRepo.save(user);

  return this.genericOk(res, {
    resendCount: user.email_verification_resend_count,
    maxResends: MAX_RESENDS,
    resendLocked: user.email_verification_resend_count >= MAX_RESENDS,
    cooldownSeconds: COOLDOWN_SECONDS,
  });
}
```

## SQL Migration (Generic)

```sql
ALTER TABLE users
ADD COLUMN email_verification_resend_count INT NOT NULL DEFAULT 0,
ADD COLUMN email_verification_last_resend_at TIMESTAMP NULL;
```

## Reset Policy (Optional)

Recommended reset behavior after successful verification:
- set `email_verification_resend_count = 0`
- set `email_verification_last_resend_at = NULL`

This keeps retry state clean for future re-verification flows.
