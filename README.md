# Tech Academy Demo

A Next.js application for managing training academy users with role-based access control.

## Features

- User authentication with JWT tokens
- Role-based access control (Super Admin, Admin, Trainee)
- User invitation system with email notifications
- User management dashboard
- Password validation and email format validation
- Training scheduler for admins
- Course management with Contentstack integration
- Progress tracking for trainees

## Tech Stack

- Next.js 14
- TypeScript
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- nodemailer for email notifications
- Contentstack for course content management

## Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env.local` file in the root directory:

   ```
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   NODE_ENV=development
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   CONTENTSTACK_API_KEY=your-contentstack-api-key
   CONTENTSTACK_DELIVERY_TOKEN=your-contentstack-delivery-token
   CONTENTSTACK_ENVIRONMENT=prod
   ```

3. **Initialize Database**

   ```bash
   npx ts-node scripts/init-db.ts
   ```

   This will create:

   - Three roles: superadmin, admin, trainee
   - A default superadmin user (email: superadmin@techacademy.com, password: SuperAdmin123!)

4. **Run Development Server**

   ```bash
   npm run dev
   ```

5. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000)

## Default Credentials

- **Super Admin:**
  - Email: `superadmin@techacademy.com`
  - Password: `SuperAdmin123!`

⚠️ **Important:** Change the default password after first login!

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login

### Users

- `GET /api/users` - Get all users (Admin/Super Admin only)
- `POST /api/users` - Create new user (Admin/Super Admin only)
- `GET /api/users/trainees` - Get all trainees (Admin/Super Admin only)

### Roles

- `GET /api/roles` - Get all roles

### Training Plans

- `GET /api/training-plans` - Get all training plans (Admin/Super Admin only)
- `POST /api/training-plans` - Create training plan (Admin/Super Admin only)
- `GET /api/training-plans/progress` - Get trainee progress

### Courses

- `GET /api/courses` - Get all courses from Contentstack
- `GET /api/courses/[courseId]` - Get single course with modules
- `GET /api/taxonomy` - Get taxonomy terms for filtering

## User Roles

1. **Super Admin**

   - Full system access
   - Can invite users
   - Can create training plans
   - Can create content

2. **Admin**

   - Can invite users
   - Can create training plans
   - Can create content

3. **Trainee**
   - Can participate in training
   - Can view assigned courses
   - Limited access to dashboard

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Project Structure

```
├── app/
│   ├── api/          # API routes
│   ├── dashboard/    # Dashboard pages
│   └── page.tsx      # Login page
├── components/       # React components
├── lib/              # Utility functions
├── models/           # Mongoose models
└── scripts/          # Database initialization scripts
```
