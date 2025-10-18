# 🚀 SokaPost

> Powerful Social Media Management Platform for Threads

SokaPost adalah platform manajemen media sosial yang memungkinkan Anda untuk menjadwalkan posting, mengelola konten, dan mengotomatisasi balasan dengan AI untuk Threads 

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2.18-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Fitur Utama

### 🤖 Auto-Reply System
- **AI-Powered Replies**: Menggunakan Google Gemini AI untuk generate balasan kontekstual
- **Keyword-Based Replies**: Balasan otomatis berdasarkan keyword matching
- **Manual Review Mode**: Review dan approve balasan sebelum dikirim
- **Smart Filtering**: Filter berdasarkan followers, exclude keywords, rate limiting
- **Checkpoint System**: Hanya balas komentar baru setelah auto-reply diaktifkan
- **Race Condition Prevention**: Mencegah duplikasi balasan dengan status locking

### 📅 Post Scheduling
- **Calendar View**: Visual calendar untuk mengelola scheduled posts
- **Multi-Platform**: Support Threads
- **Draft System**: Simpan draft dan jadwalkan kapan saja
- **Media Management**: Upload dan kelola media library
- **Location Tagging**: Tag lokasi untuk posts

### 📊 Smart Analytics
- Post performance metrics
- Engagement tracking
- Custom analytics dashboard

### 🔐 Security & Performance
- Token encryption (AES-256)
- Rate limiting dengan Upstash Redis
- Auto token refresh
- Security headers (CSP, XSS Protection, etc.)
- Session management dengan Better Auth

## 🛠️ Tech Stack

### Core
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

### APIs & Integrations
- **AI**: Google Gemini AI (gemini-2.0-flash-lite)
- **Social**: Threads API, Instagram/Facebook Graph API
- **Cache/Rate Limiting**: Upstash Redis
- **OAuth**: Google Sign-In

### Background Jobs
- **Scheduler**: Node-Cron
- **Post Publishing**: Automated scheduling system
- **Auto-Reply**: AI-powered comment monitoring
- **Token Refresh**: Automatic OAuth token renewal

### State Management & UI
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Notifications**: React Hot Toast
- **Calendar**: React Big Calendar
- **Icons**: React Icons

## 📋 Prerequisites

- Node.js 18.x atau lebih tinggi
- PostgreSQL database (atau gunakan Neon, Supabase, dll)
- Akun Threads Developer
- Akun Facebook Developer (untuk Instagram)
- Google Gemini API Key
- Upstash Redis account (opsional, untuk rate limiting)

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/orif1n/sokapost.git
cd sokapost
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Copy `.env.example` ke `.env.local` dan isi dengan credentials Anda:

```bash
cp .env.example .env.local
```

Lihat [Environment Variables](#-environment-variables) untuk detail lengkap.

### 4. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema ke database
npm run db:push

# (Opsional) Buka Prisma Studio
npm run db:studio
```

### 5. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 🔧 Environment Variables

### Required Variables

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="your_secret_min_32_characters"
BETTER_AUTH_URL="http://localhost:3000"

# Threads API (https://developers.facebook.com/apps)
THREADS_CLIENT_ID="your_threads_client_id"
THREADS_CLIENT_SECRET="your_threads_client_secret"
THREADS_REDIRECT_URI="http://localhost:3000/api/threads/callback"

# Instagram API (https://developers.facebook.com/apps)
FACEBOOK_APP_ID="your_facebook_app_id"
FACEBOOK_APP_SECRET="your_facebook_app_secret"
FACEBOOK_REDIRECT_URI="http://localhost:3000/api/instagram/callback"

# Google Gemini AI (https://makersuite.google.com/app/apikey)
GEMINI_API_KEY="your_gemini_api_key"

# Token Encryption (Generate: openssl rand -hex 32)
ENCRYPTION_KEY="your_64_character_hex_string"

# Base URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Optional Variables

```env
# Google OAuth (untuk login dengan Google)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Upstash Redis (untuk rate limiting)
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_token"

# Auto-reply Interval
# * * * * * = every minute (testing)
# */5 * * * * = every 5 minutes (recommended)
AUTO_REPLY_CRON_INTERVAL="*/5 * * * *"
```

## 📁 Project Structure

```
sokapost/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes (login, register)
│   ├── (dashboard)/         # Dashboard routes
│   │   ├── calendar/        # Calendar view
│   │   ├── posts/           # Post management
│   │   ├── auto-reply/      # Auto-reply settings
│   │   ├── connections/     # Social account connections
│   │   └── ...
│   ├── api/                 # API routes
│   │   ├── auth/            # Better Auth endpoints
│   │   ├── threads/         # Threads API
│   │   ├── instagram/       # Instagram API
│   │   ├── auto-reply/      # Auto-reply management
│   │   └── ...
│   └── layout.tsx           # Root layout
├── components/
│   ├── features/            # Feature components
│   ├── layout/              # Layout components
│   ├── providers/           # Context providers
│   └── ui/                  # UI components
├── lib/
│   ├── api/                 # API client functions
│   ├── auto-reply/          # Auto-reply logic
│   ├── security/            # Security utilities
│   ├── services/            # Background services
│   └── utils/               # Utilities
├── prisma/
│   └── schema.prisma        # Database schema
├── public/                  # Static files
├── .env.example             # Environment template
└── package.json
```

## 🎯 Usage Guide

### 1. Connect Social Accounts

1. Login ke SokaPost
2. Pergi ke **Connections**
3. Connect akun Threads dan/atau Instagram
4. Authorize aplikasi

### 2. Create & Schedule Posts

1. Pergi ke **Calendar** atau **Compose**
2. Tulis konten post Anda
3. Upload media (opsional)
4. Pilih platform (Threads/Instagram)
5. Set tanggal & waktu publish
6. Save sebagai draft atau schedule

### 3. Setup Auto-Reply

1. Pergi ke **Auto-Reply Settings**
2. Pilih mode:
   - **AI Mode**: AI generates contextual replies
   - **Keyword Mode**: Predefined keyword-based replies
   - **Manual Mode**: Review before sending
3. Configure filters:
   - Followers only
   - Exclude keywords
   - Rate limiting
4. Choose posts to monitor (All or Selected)
5. Activate auto-reply

### 4. Monitor Performance

1. Pergi ke **Insights** atau **Smart Analytics**
2. View engagement metrics
3. Track post performance
4. Analyze trends

## 🔄 Background Jobs

SokaPost menjalankan background jobs otomatis untuk:

1. **Post Scheduler** - Publish scheduled posts on time
2. **Auto-Reply System** - Monitor & reply to comments automatically
3. **Token Refresh** - Keep OAuth tokens valid

Jobs berjalan via `node-cron` dan diinisialisasi saat server start.

### Cron Intervals

- **Post Scheduler**: Every 1 minute
- **Auto-Reply**: Configurable (default: 5 minutes)
- **Token Refresh**: Every 24 hours

## 📦 Scripts

```bash
# Development
npm run dev                  # Start development server

# Build
npm run build                # Build for production
npm start                    # Start production server

# Database
npm run db:push              # Push schema to database
npm run db:studio            # Open Prisma Studio
npm run db:generate          # Generate Prisma Client

# Code Quality
npm run lint                 # Run ESLint
```

## 🚀 Deployment

### Production Setup

1. **Environment Variables**: Set semua required env vars di production
2. **Database**: Ensure PostgreSQL accessible
3. **Build**: `npm run build`
4. **Process Manager**: Gunakan PM2 (konfigurasi di `ecosystem.config.js`)

### Deploy dengan PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs kchat
```

### Deploy ke VPS

1. Clone repository ke server
2. Install dependencies: `npm install`
3. Setup environment variables
4. Build: `npm run build`
5. Start dengan PM2: `pm2 start ecosystem.config.js`
6. Setup nginx sebagai reverse proxy
7. Setup SSL dengan Let's Encrypt

## 🔐 Security Best Practices

1. **Never commit** `.env` files ke Git
2. **Rotate secrets** regularly (auth secret, encryption key)
3. **Use strong passwords** untuk database
4. **Enable rate limiting** dengan Upstash Redis
5. **Review auto-reply logs** untuk ensure no spam
6. **Monitor token expiration** dan refresh

## 🐛 Troubleshooting

### Auto-Reply tidak bekerja

- Check console logs untuk error messages
- Verify Threads/Instagram token masih valid
- Check `enabledAt` checkpoint di database
- Ensure cron job running (lihat console untuk "🤖 [Auto-Reply] Starting job...")

### Post gagal publish

- Check token validity
- Verify media URLs accessible
- Check Threads/Instagram API limits
- Review error logs di database (`Post.errorMessage`)

### Database connection error

- Verify `DATABASE_URL` correct
- Check database accessible
- Run `npm run db:push` untuk sync schema


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Better Auth](https://www.better-auth.com/) - Modern authentication
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Google Gemini](https://ai.google.dev/) - AI capabilities
- [Upstash](https://upstash.com/) - Serverless Redis

## 📧 Contact

- Website: [https://sokapod.com](https://sokapod.com)
- GitHub: [@yourusername](https://github.com/orif1n)

---

Made with vibe coding 
