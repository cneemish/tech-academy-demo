# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- MongoDB connection string
- Contentstack account with API keys

## Setup Steps

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Create Environment File**
   Create a `.env.local` file in the root directory with:

   ```
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   NODE_ENV=development
   EMAIL_USER=your-email@gmail.com  # Optional - for email invitations
   EMAIL_PASS=your-app-password      # Optional - for email invitations
   CONTENTSTACK_API_KEY=your-contentstack-api-key
   CONTENTSTACK_DELIVERY_TOKEN=your-contentstack-delivery-token
   CONTENTSTACK_ENVIRONMENT=prod
   ```

3. **Initialize Database**

   ```bash
   npx ts-node scripts/init-db.ts
   ```

   This creates:

   - Three roles: superadmin, admin, trainee
   - Default superadmin user:
     - Email: `superadmin@techacademy.com`
     - Password: `SuperAdmin123!`

4. **Start Development Server**

   ```bash
   npm run dev
   ```

5. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

- **Super Admin:**
  - Email: `superadmin@techacademy.com`
  - Password: `SuperAdmin123!`

⚠️ **Important:** Change the default password after first login!

## Email Configuration (Optional)

If you want to send invitation emails:

1. Use a Gmail account
2. Enable "App Passwords" in your Google Account settings
3. Add `EMAIL_USER` and `EMAIL_PASS` to `.env.local`

If email is not configured, user invitations will still work but credentials will be logged to the console instead of being emailed.

## Testing the Application

1. **Login as Super Admin**

   - Use the default credentials above
   - You'll be redirected to the Home Dashboard

2. **Invite a User**

   - Click on "Users" in the sidebar
   - Click on "Invite User" tab
   - Fill in the form (first name, last name, email, role)
   - Submit to create a new user
   - The user will receive an email with their credentials (if email is configured)

3. **View Users**

   - Click on "Users" tab
   - See all users in the system
   - Search functionality available

4. **Create Training Plan**

   - Click on "Training Scheduler" in the sidebar
   - Select a trainee and create a training plan with modules

5. **View Courses**

   - Click on "Courses" in the sidebar
   - Browse available courses from Contentstack
   - Search and filter by taxonomy

6. **Login as Trainee**
   - Use credentials from an invited trainee user
   - View assigned courses and track progress

## Password Requirements

When logging in, passwords must:

- Be at least 8 characters long
- Contain at least one uppercase letter
- Contain at least one lowercase letter
- Contain at least one number
- Contain at least one special character

## Troubleshooting

- **MongoDB Connection Issues:** Check your connection string in `.env.local`
- **Email Not Sending:** Check console logs - credentials are logged if email is not configured
- **Authentication Errors:** Make sure JWT_SECRET is set in `.env.local`
- **Contentstack Errors:** Verify API keys and delivery token are correct
