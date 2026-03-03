# YouTube Production Bug Investigation

## Issue Summary
**Date**: 2026-03-02  
**Status**: � FIX APPLIED - Pending Deploy  
**Environment**: Production only (works locally)

## Symptoms
1. YouTube player shows **Error 153: Video player configuration error**
2. Preview thumbnails don't load in production
3. Console errors:
   - `ERR_BLOCKED_BY_CLIENT` on `youtube.com/youtubei/v1/log_event`
   - `ERR_BLOCKED_BY_CLIENT` on `generate_204`

## Screenshot Evidence
- Modal shows "Watch video on YouTube" link with error icon
- Film: "Rising Son (1990)" - player fails to initialize

---

## Investigation Notes

### Possible Causes
1. **Content Security Policy (CSP)** - Production may have stricter CSP headers blocking YouTube domains
2. **iframe permissions** - Missing `allow` attributes on iframe
3. **Ad blocker false positive** - But unlikely since it works locally with same browser
4. **CORS/Mixed content** - Production HTTPS blocking certain requests
5. **YouTube API key differences** - Environment-specific configuration
6. **Netlify/hosting headers** - Production headers blocking embeds

### Key Questions
- [ ] What CSP headers are set in production?
- [ ] How is the YouTube iframe embedded?
- [ ] Are there environment-specific configs?
- [ ] What's in `netlify.toml` or `_headers` file?

---

## Technical Analysis

### Files to Check
- [ ] YouTube embed component
- [ ] CSP/security header configuration
- [ ] Environment variables
- [ ] Build configuration

---

## Root Cause
**IDENTIFIED**: Helmet CSP Default Directives

The Express server uses `helmet.contentSecurityPolicy.getDefaultDirectives()` as the base, then overrides specific directives. However, the default `connect-src` directive is `'self'` which blocks YouTube's internal player API requests.

### Key Difference Local vs Production:
| Environment | Server | CSP Applied? | YouTube |
|-------------|--------|--------------|----------|
| Local dev | Vite (5173) | ❌ None | ✅ Works |
| Production | Express + Helmet | ✅ Restrictive | ❌ Error 153 |

### Why Ad Blocker is a RED HERRING:
The `ERR_BLOCKED_BY_CLIENT` errors (log_event, generate_204) happen in **BOTH** environments!
- These are YouTube **telemetry/analytics** endpoints
- Your ad blocker blocks them locally too
- But locally the video STILL PLAYS because there's no CSP

**The real blocker is CSP, not the ad blocker:**
- Helmet's default `connect-src: 'self'` blocks YouTube's video stream API calls
- The player iframe loads, but can't fetch the actual video data
- Result: Error 153 "Video player configuration error"

### Missing CSP Directives:
- `connect-src` - YouTube player makes XHR/fetch calls to `*.youtube.com`, `*.googlevideo.com`
- `child-src` - For worker scripts
- `worker-src` - YouTube uses web workers

---

## Solution
Update `server/index.ts` helmet CSP config to add YouTube domains to `connect-src`, `child-src`, and `worker-src`.

```typescript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "frame-src": ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.youtube.com", "https://www.google.com"],
            "img-src": ["'self'", "data:", "*", "https://image.tmdb.org", "https://i.ytimg.com", "https://images.genius.com"],
            "connect-src": ["'self'", "https://www.youtube.com", "https://*.youtube.com", "https://*.googlevideo.com", "https://*.google.com"],
            "child-src": ["'self'", "blob:", "https://www.youtube.com"],
            "worker-src": ["'self'", "blob:"],
        },
    },
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
}));
```

---

## Prevention
- Test YouTube embeds in production-like environment (with helmet CSP) before deploying
- Consider adding a CSP-report-only header in staging to catch violations early

---

## Security Analysis

### Is Helmet Still Needed?
**YES.** Helmet provides critical protections:
- XSS prevention via CSP
- Clickjacking protection (`X-Frame-Options`)
- MIME sniffing prevention (`X-Content-Type-Options`)
- Referrer policy controls

### Did Our Fix Bypass Security?
**NO.** We made targeted exceptions for trusted Google/YouTube domains only.

| What We Did | Security Impact |
|-------------|-----------------|
| Added `*.youtube.com` to connect-src | ✅ Safe - trusted CDN |
| Added `*.googlevideo.com` to connect-src | ✅ Safe - Google's video CDN |
| Added `blob:` to worker-src | ✅ Safe - standard for web workers |

| What We Did NOT Do | |
|---------------------|---|
| Disable CSP entirely | ✅ Still protected |
| Allow `*` wildcard for all domains | ✅ Still protected |
| Remove other helmet headers | ✅ Still protected |

### Remaining Protections (Still Active)
- `default-src: 'self'` - blocks unknown sources
- `object-src: 'none'` - blocks Flash/plugins
- `base-uri: 'self'` - prevents base tag injection
- `form-action: 'self'` - prevents form hijacking
- All other helmet security headers
