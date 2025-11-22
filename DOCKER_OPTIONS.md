# Docker Environment Variable Options

This document explains three different approaches for handling environment variables in your TanStack Router + Vite project.

## 🚀 Quick Summary

| Option | Flexibility | Complexity | Use Case |
|--------|-------------|------------|----------|
| **Option 1A: Runtime Replacement** | ⭐⭐⭐⭐⭐ | Medium | Change backends without rebuilding |
| **Option 1B: Runtime Config** | ⭐⭐⭐⭐⭐ | High | Cleanest runtime approach |
| **Option 2: Build-time** | ⭐⭐ | Low | Simple, fixed environments |

---

## Option 1A: Runtime Environment Variable Replacement (Recommended)

**Files:** `Dockerfile` + `docker-entrypoint.sh`

### How it works:
- Builds with placeholder values (`__API_BASE_URL__`)
- Entrypoint script replaces placeholders at container startup
- Uses `sed` to modify built files in-place

### Usage:
```bash
# Build once
docker build -t nebula-frontend .

# Run with different environments (no rebuild needed!)
docker run -p 80:80 \
  -e VITE_API_BASE_URL=http://staging-api.example.com \
  -e VITE_NOTIFICATION_BASE_URL=http://staging-notifications.example.com \
  nebula-frontend

docker run -p 80:80 \
  -e VITE_API_BASE_URL=http://prod-api.example.com \
  -e VITE_NOTIFICATION_BASE_URL=http://prod-notifications.example.com \
  nebula-frontend
```

**Pros:** ✅ Most flexible, ✅ No rebuild for different envs, ✅ Works with current code
**Cons:** ⚠️ Modifies files in container, ⚠️ Slightly slower startup

---

## Option 1B: Runtime Config Injection (Cleanest Runtime)

**Files:** `Dockerfile.runtime` + `docker-entrypoint-config.sh` + `nginx.runtime.conf`

### How it works:
- Generates `env-config.js` file at container startup
- Your app reads from `window.ENV` instead of `import.meta.env`
- Requires small code changes in your app

### Code changes needed:
```typescript
// Before (src/lib/api.ts):
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080'

// After:
// First, add this to your index.html:
// <script src="/env-config.js"></script>

// Then in your code:
const API_BASE_URL = window.ENV?.VITE_API_BASE_URL || 'http://localhost:8080'
```

### Usage:
```bash
# Build
docker build -f Dockerfile.runtime -t nebula-frontend .

# Run (same as Option 1A)
docker run -p 80:80 \
  -e VITE_API_BASE_URL=http://api.example.com \
  nebula-frontend
```

**Pros:** ✅ Very flexible, ✅ Clean approach, ✅ No file modification
**Cons:** ❌ Requires code changes, ⚠️ More complex setup

---

## Option 2: Build-time Environment Variables (Your Current Approach)

**Files:** `Dockerfile.buildtime` (or your original `Dockerfile`)

### How it works:
- Variables are baked into the build during `docker build`
- Uses `--build-arg` to pass values at build time
- No runtime flexibility

### Usage:
```bash
# Build for staging
docker build -f Dockerfile.buildtime \
  --build-arg VITE_API_BASE_URL=http://staging-api.example.com \
  --build-arg VITE_NOTIFICATION_BASE_URL=http://staging-notifications.example.com \
  -t nebula-frontend:staging .

# Build for production
docker build -f Dockerfile.buildtime \
  --build-arg VITE_API_BASE_URL=http://prod-api.example.com \
  --build-arg VITE_NOTIFICATION_BASE_URL=http://prod-notifications.example.com \
  -t nebula-frontend:prod .

# Run (no env vars needed)
docker run -p 80:80 nebula-frontend:staging
```

**Pros:** ✅ Simple, ✅ Fast startup, ✅ No entrypoint needed
**Cons:** ❌ Must rebuild for each environment, ❌ Less flexible

---

## 🎯 My Recommendation

**For most use cases, use Option 1A (Runtime Replacement).**

It gives you the flexibility to change backends without rebuilding, while requiring minimal changes to your current setup. This is perfect for:
- Development vs Production deployments
- Multi-tenant applications
- CI/CD pipelines where the same image needs to work in different environments

Choose Option 2 only if you have very fixed environments and want the simplest possible setup.

Choose Option 1B if you're willing to make small code changes for the cleanest runtime solution.

## 🐳 Docker Compose Example

```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=http://backend:3838
      - VITE_NOTIFICATION_BASE_URL=http://notifications:3010
    depends_on:
      - backend
      - notifications

  backend:
    image: your-backend-image
    ports:
      - "3838:3838"

  notifications:
    image: your-notifications-image
    ports:
      - "3010:3010"
```