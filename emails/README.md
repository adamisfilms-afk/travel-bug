# Emails

All emails share one design, defined in `src/lib/email/templates.ts`.

## Trip invites (sent by the app)
Sent when someone uses **Invite → Send invite** in the trip planner — through Gmail (`SMTP_USER` +
`SMTP_PASS` app password) or [Resend](https://resend.com) (`RESEND_API_KEY`). See `.env.example`.
Preview: open `trip-invite-preview.html`.

## Supabase account emails (sign-up, log-in link, password reset, email change)
Paste these into **Supabase → Authentication → Emails → Templates** (one tab per email):

| Supabase template | File | Subject |
|---|---|---|
| Confirm signup | `supabase/confirm-signup.html` | see `supabase/SUBJECTS.txt` |
| Magic Link | `supabase/magic-link.html` | |
| Reset Password | `supabase/reset-password.html` | |
| Change Email Address | `supabase/change-email.html` | |
| Invite user | `supabase/invite.html` | |

They use `{{ .SiteURL }}` for the header photo, so set **Authentication → URL Configuration → Site URL**
to your live address.

After changing the design, rebuild them with:

    node --experimental-strip-types scripts/build-email-templates.mjs
