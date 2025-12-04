# Contentstack Launch Deployment Guide

## Build Command

```bash
npm run build
```

## Configuration

### Build Settings in Contentstack Launch

1. **Build Command:**

   ```
   npm run build
   ```

2. **Output Directory:**

   ```
   .next
   ```

3. **Server Command (if Launch supports Node.js runtime):**

   ```
   npm run start
   ```

4. **Framework Preset:**
   - Select: **Next.js**
   - Node Version: **18.x or higher**

### Important Notes

⚠️ **This application requires server-side capabilities:**

- **API Routes**: The app uses Next.js API routes (`/app/api/*`) that require a Node.js server
- **MongoDB Connection**: Server-side database connections for authentication and data storage
- **JWT Authentication**: Server-side token verification
- **Dynamic Rendering**: All dashboard pages use `export const dynamic = 'force-dynamic'` to prevent static generation

### Environment Variables Required

Set these in Contentstack Launch's environment variables:

```
CONTENTSTACK_API_KEY=blt458f96b1d51470e8
CONTENTSTACK_DELIVERY_TOKEN=cs481b1820d8f02692d6d06fe6
CONTENTSTACK_ENVIRONMENT=prod
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Next.js Configuration

The `next.config.js` is configured with:

- `output: 'standalone'` - For server deployment
- All pages marked with `export const dynamic = 'force-dynamic'` to prevent static generation errors

### Build Output

After running `npm run build`, Next.js will:

- Create optimized production build in `.next` folder
- Generate server-side routes for Node.js runtime
- Skip static generation for dynamic pages

### Testing Locally

Before deploying, test the production build:

```bash
npm run build
npm run start
```

This will start the production server on `http://localhost:3000`

### Troubleshooting

1. **Build fails with "useContext" errors**:
   - ✅ Fixed by adding `export const dynamic = 'force-dynamic'` to all pages
2. **Build fails with "Html" import errors**:

   - ✅ Fixed by creating proper `app/error.tsx` and `app/not-found.tsx` files

3. **API routes not working**:

   - Ensure Launch supports Node.js runtime
   - Verify environment variables are set correctly

4. **MongoDB connection issues**:
   - Ensure MongoDB allows connections from Launch's IP addresses
   - Verify `MONGODB_URI` is set correctly

### Deployment Status

✅ **Build is now successful** - All pages are configured for dynamic rendering and the build completes without errors.
