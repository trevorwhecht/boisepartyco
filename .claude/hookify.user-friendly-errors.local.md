---
name: user-friendly-errors
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: src/app/api/.*route\.ts$
---

## User-Friendly Error Handling Required

You are writing an API route. Apply these rules before finishing.

### The two categories of errors

**1. Business errors** — things the user did or a real-world constraint. Handle these BEFORE the DB call with a 400/409 and a specific plain-English message:

| Situation | Message |
|---|---|
| Missing required field | "Please fill in your [field name]." |
| Invalid date range | "Your dropoff date must be after your pickup date." |
| Past dates | "Please choose dates that haven't already passed." |
| Items unavailable | "Sorry, [item name] is no longer available for those dates." |
| Email belongs to staff | "That email is linked to a staff account — please use a different one or sign in." |
| Email already in use | "An account with that email already exists. Sign in to continue." |
| Password too short | "Password must be at least 8 characters." |

**2. Unexpected server errors** — bugs, DB outages, Prisma failures. The user can't fix these. Use ONE generic catch-all for everything that isn't a business error:

```ts
} catch (err: any) {
  console.error("[route] error:", err)
  return NextResponse.json(
    { data: null, error: "Something went wrong on our end. Please try again or call us at (208) 306-3079." },
    { status: 500 }
  )
}
```

**Never** return `err.message`, `err?.message`, `String(err)`, or any Prisma error text. Prisma validation errors, schema mismatches, and unknown request errors are code bugs — they must be caught by the generic fallback above, logged to the console, and shown as the generic message. They are never a user-actionable condition.

### On the client side

- Errors render as a dismissible inline alert (like the existing `submitError` pattern in `QuotePage-ContactStep.tsx`)
- The message must be ≤ 2 plain-English sentences
- For the "already in use" case, show a "Sign in" link inline — don't just print the message
- Never dump raw response JSON, stack traces, or Prisma invocation details into the DOM
