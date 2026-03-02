# GymHub

A comprehensive SaaS platform for Australian gymnastics clubs to manage classes, safety, incidents, competitions, and maintenance.

## Project Overview

GymHub is a multi-tenant web application designed specifically for Australian gymnastics clubs. It provides integrated solutions for:

1. **Class Rostering** - Manage class schedules, instructors, and student enrollment
2. **Injury / Incident Management** - Track incidents and maintain compliance records
3. **Equipment Safety Management** - Schedule inspections and maintain safety logs
4. **ICScore Competition Management** - Manage competitions and athlete scores
5. **ICMaintenance** - Track facility and equipment maintenance tasks

### Architecture

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (production on DigitalOcean)
- **ORM**: Prisma
- **Authentication**: Custom JWT-based auth with secure sessions
- **Multi-Tenancy**: Strict app-level club data separation with optional Postgres RLS

## Prerequisites

- Node.js 18+ and npm/yarn
- Git
- **No Docker needed!**

## Quick Start (2 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
npm run prisma:migrate
```

This applies migrations to the configured PostgreSQL database.

### 3. Seed Test Data (Optional)

```bash
npm run prisma:seed
```

Creates test club: **Elite Gymnastics Club**
- **Username**: `admin`
- **Password**: `TestPassword123`

### 4. Start Development Server

```bash
npm run dev
```

Open your deployed app URL.

## Key URLs

- **Landing Page**: https://your-production-domain.com
- **Register**: https://your-production-domain.com/register
- **Sign In**: https://your-production-domain.com/sign-in
- **Dashboard**: https://your-production-domain.com/dashboard

## Features Implemented ✅

- **Landing Page**: 5 service cards, benefits, FAQ, CTA
- **4-Step Registration**: Club info, location, admin account, review
- **Validation**: ABN checksum, email/domain matching, duplicate prevention
- **Sign-In**: Username/password, JWT sessions, account lockout
- **Dashboard**: Service cards, announcements, quick actions
- **Multi-Tenant Database**: Strict club isolation, audit logging
- **Email Verification**: Token-based verification flow (coming next)

## Database

**Production** (DigitalOcean):
- Use the DigitalOcean Managed PostgreSQL connection string in `DATABASE_URL`
- Ensure SSL is enabled via `?sslmode=require`
- Keep App Platform environment variables set for runtime

## Project Structure

```
ICGymHub/
├── src/
│   ├── app/
│   │   ├── api/auth/
│   │   │   ├── login/route.ts
│   │   │   └── register/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── register/page.tsx
│   │   ├── sign-in/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── lib/
│       ├── auth.ts
│       ├── prisma.ts
│       └── validation.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
├── .env.local (or .env) pointing to DigitalOcean PostgreSQL
└── package.json
```

## Common Commands

```bash
# Development
npm run dev

# Database migrations
npm run prisma:migrate
npm run prisma:seed

# View/edit database (UI)
npm run prisma:studio

# Build for production
npm run build
npm run start

# Linting
npm run lint
```

## Roadmap

### Phase 2
- Email verification flow
- Staff invitation & role management
- Class Rostering CRUD

### Phase 3
- Incident Management CRUD
- Equipment Safety Management CRUD
- ICScore Competition Management

### Phase 4
- ICMaintenance module
- Reporting & analytics
- Stripe payment integration

## Support

- Email: support@icgymhub.com

## License

All rights reserved © 2025 GymHub
