# FoodBridge AI

An AI-powered platform connecting food donors with NGOs and shelters to reduce waste and fight hunger.

## Features

- **AI-Powered Matching**: Smart algorithms connect donors with nearby organizations
- **Real-time Tracking**: Monitor donations and their impact
- **Multi-role Support**: Donors, receivers, and administrators
- **Interactive Maps**: Visualize donation locations and opportunities
- **Analytics Dashboard**: Comprehensive insights and reporting
- **Mobile Responsive**: Works seamlessly on all devices

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js with Firebase Auth
- **Database**: Firebase Realtime Database
- **Maps**: Mapbox GL JS
- **Charts**: Recharts
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project
- Google OAuth credentials (optional)
- Mapbox API key (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FoodBridgeAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # NextAuth Configuration
   NEXTAUTH_SECRET=your-nextauth-secret-key-here-make-it-long-and-random
   NEXTAUTH_URL=http://localhost:3000

   # Google OAuth (for Google sign-in)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

   # Mapbox API Key
   NEXT_PUBLIC_MAPBOX_API_KEY=your-mapbox-api-key
   ```

4. **Set up Firebase**
   
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password and Google)
   - Create a Realtime Database
   - Update the Firebase configuration in your `.env.local`

5. **Set up Google OAuth (optional)**
   
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Update the Google credentials in your `.env.local`

6. **Set up Mapbox (optional)**
   
   - Sign up at [Mapbox](https://www.mapbox.com/)
   - Get your API key
   - Update the Mapbox API key in your `.env.local`

7. **Run the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Required
- `NEXTAUTH_SECRET`: A random string for NextAuth.js encryption
- `NEXTAUTH_URL`: Your application URL (http://localhost:3000 for development)

### Optional (with fallbacks)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`: Firebase database URL
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase app ID
- `NEXT_PUBLIC_MAPBOX_API_KEY`: Mapbox API key

## Project Structure

```
FoodBridgeAI/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── donor/             # Donor dashboard
│   ├── login/             # Login page
│   ├── receiver/          # Receiver dashboard
│   ├── register/          # Registration page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── about.tsx         # About section
│   ├── auth-wrapper.tsx  # Authentication wrapper
│   ├── hero.tsx          # Hero section
│   ├── navigation.tsx    # Navigation component
│   └── ...               # Other components
├── lib/                  # Utility libraries
│   ├── auth-config.ts    # NextAuth configuration
│   ├── firebase.ts       # Firebase configuration
│   ├── firebase-service.ts # Firebase service functions
│   ├── maps.ts           # Map utilities
│   └── utils.ts          # General utilities
├── hooks/                # Custom React hooks
└── public/               # Static assets
```

## Features by Role

### Donors
- Upload food donations with photos and details
- View matching opportunities
- Track donation history and impact
- Interactive map of nearby organizations

### Receivers (NGOs/Shelters)
- Post food requirements
- Browse available donations
- Manage pickup confirmations
- View organization statistics

### Administrators
- System-wide analytics and insights
- User management and verification
- Performance monitoring
- Data export capabilities

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app is configured for Vercel deployment but can be adapted for other platforms by updating the `next.config.js` file.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@foodbridge.ai or create an issue in the repository. 