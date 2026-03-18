# UpClass - Learning Management System

A modern, full-featured Learning Management System (LMS) built with Next.js 16, featuring real-time collaboration, offline support, and a beautiful user interface.

## 🚀 Features

### Core Features
- **Class Management**: Create and manage classes with custom colors, schedules, and categories
- **Resource Sharing**: Upload and share learning materials (PDFs, documents, presentations, etc.)
- **Real-time Collaboration**: Interactive whiteboard with live cursors and real-time updates
- **Messaging System**: Direct messaging between users with media support
- **Notifications**: Real-time notifications for announcements, classwork, and messages
- **Quizzes & Assessments**: Create and take quizzes with multiple question types
- **Classwork Management**: Assignments, submissions, and grading system
- **User Profiles**: Comprehensive user profiles with role-based access (Teacher/Student)

### Progressive Web App (PWA)
- **Offline Support**: Full offline functionality with intelligent caching
- **Background Sync**: Automatic synchronization when connection is restored
- **Installable**: Can be installed as a native app on mobile and desktop
- **Offline Indicator**: Visual indicator showing connection status and sync state

### Performance & UX
- **Mobile Responsive**: Fully responsive design optimized for all devices
- **Touch Support**: Full touchscreen support for whiteboard and interactions
- **Real-time Updates**: Live updates using Supabase real-time subscriptions
- **Optimized Caching**: Intelligent caching of pages, data, and images
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Zustand** - Lightweight state management
- **React Hook Form** - Form management

### Backend & Database
- **Supabase** - Backend-as-a-Service (PostgreSQL, Auth, Storage, Real-time)
- **Drizzle ORM** - Type-safe database queries
- **Next.js Server Actions** - Server-side actions

### Real-time & Collaboration
- **Supabase Realtime** - Real-time subscriptions
- **Broadcast Channel API** - Cross-tab communication
- **Canvas API** - Interactive whiteboard drawing

### File Upload
- **UploadThing** - File upload service

### PWA & Offline
- **Service Worker** - Offline caching and background sync
- **IndexedDB** - Client-side data storage
- **Cache API** - HTTP caching

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (via Supabase)
- Supabase account and project

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd upclass
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Database
   DATABASE_URL=your_database_url

   # Auth
   AUTH_SECRET=your_auth_secret
   AUTH_URL=http://localhost:3000

   # UploadThing
   UPLOADTHING_SECRET=your_uploadthing_secret
   UPLOADTHING_APP_ID=your_uploadthing_app_id
   ```

4. **Set up the database**
   - Run the database migrations using Drizzle
   - Ensure all tables are created (classes, users, resources, messages, etc.)

### Vercel Deploys

Vercel deploys are configured to run database migrations before the Next.js build:

```bash
npm run db:migrate && next build
```

In this repo, `npm run db:migrate` uses `drizzle-kit migrate --config drizzle.config.ts`.

Make sure the Vercel project has a valid `DATABASE_URL` set for the target environment. If the database user cannot create enums, tables, or indexes, the deployment will fail before the new version is promoted.

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
upclass/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (main)/            # Main application routes
│   ├── actions/           # Server actions
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── classes/           # Class-related components
│   ├── messages/          # Messaging components
│   ├── resources/         # Resource components
│   ├── whiteboard/        # Whiteboard components
│   └── ui/                # UI components (shadcn)
├── lib/                   # Utility libraries
│   ├── background-cache.ts    # IndexedDB caching
│   ├── background-sync.ts     # Background synchronization
│   ├── offline-action-handler.ts  # Offline action handling
│   ├── sync-manager.ts         # Sync queue management
│   └── supabase-client.ts      # Supabase client
├── db/                    # Database schema and migrations
├── public/                # Static assets
│   ├── sw.js             # Service worker
│   └── manifest.json     # PWA manifest
└── README.md             # This file
```

## 🔧 Key Features Implementation

### Offline Support
- **Service Worker**: Caches all pages, API responses, and static assets
- **IndexedDB**: Stores structured data (classes, resources, messages, notifications)
- **Background Sync**: Queues actions when offline and syncs when online
- **Offline Indicator**: Shows connection status at the top of the page

### Real-time Collaboration
- **Whiteboard**: Real-time drawing with cursor tracking
- **Broadcast Channel**: Cross-tab synchronization
- **Supabase Realtime**: Database change subscriptions
- **Optimized Updates**: Debounced saves and throttled broadcasts

### Caching Strategy
- **Pages**: All pages cached for offline access (home, classes, resources, messages, notifications, settings, profile, etc.)
- **Data**: Classes, resources, messages, notifications, class details cached automatically
- **Images**: All images cached in background (avatars, resource images, etc.)
- **API Responses**: Network-first with cache fallback
- **Background Caching**: Automatic background caching every 30 minutes
- **Smart Cache Management**: Automatic cleanup of cache older than 7 days

### Offline Error Handling
- **Network Detection**: Automatic detection of offline state
- **Action Queueing**: Actions that require network are queued when offline
- **User Feedback**: Clear error messages when actions can't be performed offline
- **Auto-sync**: Queued actions automatically sync when connection is restored
- **Supported Offline Actions**:
  - Create class (queued)
  - Create resource (queued)
  - Join class (queued)
  - Create classwork (queued)
  - Submit classwork (queued)
  - Create announcement (queued)
  - Create quiz (queued)
  - Whiteboard updates (queued)

## 🎨 UI/UX Features

- **Dark Mode**: System-aware theme switching
- **Responsive Design**: Mobile-first approach
- **Touch Support**: Full touchscreen compatibility
- **Accessibility**: WCAG compliant components
- **Smooth Animations**: Optimized transitions and animations

## 📱 PWA Features

- **Installable**: Add to home screen on mobile and desktop
- **Offline Mode**: Full functionality without internet
- **Background Sync**: Automatic data synchronization when connection is restored
- **Offline Action Queue**: Actions performed offline are queued and synced automatically
- **Comprehensive Caching**: All pages, data, and images cached for offline access
- **Offline Indicator**: Visual indicator showing connection status and sync state
- **App-like Experience**: Native app feel with smooth transitions

## 🔐 Authentication

- **Supabase Auth**: Email/password authentication
- **Session Management**: Secure session handling
- **Role-based Access**: Teacher and Student roles
- **Protected Routes**: Authentication required for main features

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production
Ensure all environment variables are set in your deployment platform.

## 📝 Development

### Running Tests
```bash
npm run test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run type-check
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [UploadThing](https://uploadthing.com/) - File upload service

## 📧 Support

For support, email support@upclass.com or open an issue in the repository.

## 🎯 Roadmap

- [ ] Push notifications
- [ ] Video conferencing integration
- [ ] Advanced analytics
- [ ] Mobile apps (iOS/Android)
- [ ] Multi-language support
- [ ] Advanced quiz features
- [ ] Gradebook improvements
- [ ] Calendar integration

---

Built with ❤️ using Next.js and Supabase
