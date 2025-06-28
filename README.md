# FoodBridge AI - Bolt Hackathon Submission

FoodBridge AI is an intelligent platform that connects surplus food providers, such as restaurants, grocers, and event organisers, with verified recipients through a network of NGOs, shelters, and community kitchens. Powered by automation and smart logistics, it ensures timely, efficient, and equitable food distribution, reducing waste and fighting hunger at scale.

## 🚀 Features

- **AI-Powered Matching**: Smart algorithms connect donors with nearby organizations
- **Real-time Tracking**: Monitor donations and their impact
- **Multi-role Support**: Donors, receivers, and administrators
- **Interactive Maps**: Visualize donation locations and opportunities
- **Analytics Dashboard**: Comprehensive insights and reporting
- **Mobile Responsive**: Works seamlessly on all devices
- **Offline Support**: Works with mock data when services are unavailable

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js with Firebase Auth
- **Database**: Firebase Realtime Database (with mock data fallback)
- **Maps**: Mapbox GL JS (with fallback UI)
- **Charts**: Recharts
- **Animations**: Framer Motion

## 🎯 Hackathon Ready Features

### ✅ Complete Functionality
- **User Authentication**: Email/password and Google OAuth
- **Role-based Dashboards**: Donor, Receiver, and Admin interfaces
- **Food Upload System**: Complete donation management
- **Requirements Posting**: Organizations can post food needs
- **Real-time Matching**: AI-powered donor-receiver matching
- **Interactive Maps**: Location-based food distribution
- **Analytics**: Comprehensive reporting and insights

### ✅ Production Ready
- **Error Handling**: Comprehensive error boundaries and fallbacks
- **Loading States**: Smooth loading experiences
- **Responsive Design**: Works on all device sizes
- **Performance Optimized**: Code splitting and lazy loading
- **SEO Optimized**: Meta tags and structured data

### ✅ Demo Ready
- **Mock Data**: Works without external services
- **Instant Setup**: No complex configuration required
- **Visual Appeal**: Modern, professional design
- **Interactive**: Fully functional demo experience

## 🚀 Quick Start

### Option 1: Instant Demo (No Setup Required)
```bash
git clone https://github.com/your-repo/foodbridge-ai
cd foodbridge-ai
npm install
npm run dev
```

The app will work immediately with mock data - perfect for demos!

### Option 2: Full Setup (Optional)
Create a `.env.local` file for enhanced features:

```env
# Required for production
NEXTAUTH_SECRET=your-secret-key-here

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Firebase (for real database)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config

# Optional: Mapbox (for real maps)
NEXT_PUBLIC_MAPBOX_API_KEY=your-mapbox-api-key
```

## 🎮 Demo Instructions

### For Judges/Reviewers:

1. **Homepage**: Start at the landing page to see the value proposition
2. **Registration**: Create accounts as different user types:
   - **Donor**: Restaurant/business donating food
   - **Receiver**: NGO/shelter needing food
   - **Admin**: Platform administrator

3. **Donor Flow**:
   - Upload food donations with photos and details
   - View nearby organizations needing food
   - Track donation history and impact

4. **Receiver Flow**:
   - Post food requirements with urgency levels
   - Browse available donations
   - Confirm pickups and manage requests

5. **Admin Flow**:
   - View system-wide analytics
   - Monitor platform activity
   - Export data and insights

### Key Demo Points:
- **Real-time Updates**: Changes appear instantly across dashboards
- **Smart Matching**: AI suggests relevant matches
- **Mobile Responsive**: Test on different screen sizes
- **Error Resilience**: Works even without external services
- **Professional UI**: Modern, intuitive design

## 🏆 Hackathon Highlights

### Innovation
- **AI-Powered Matching**: Intelligent algorithms for optimal food distribution
- **Real-time Coordination**: Instant updates and notifications
- **Scalable Architecture**: Designed to handle city-wide operations

### Impact
- **Food Waste Reduction**: Prevents surplus food from going to landfills
- **Hunger Relief**: Connects food directly to those in need
- **Community Building**: Strengthens local food security networks

### Technical Excellence
- **Modern Stack**: Latest React, Next.js, and TypeScript
- **Performance**: Optimized for speed and efficiency
- **Accessibility**: WCAG compliant design
- **Security**: Secure authentication and data handling

## 📊 Demo Data

The application includes realistic mock data:
- **5+ Food Donations**: Various food types and locations
- **3+ Requirements**: Different urgency levels and organizations
- **Real-time Updates**: Simulated live activity
- **Analytics**: Meaningful charts and statistics

## 🔧 Architecture

### Frontend
- **Next.js 14**: App router with server components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: High-quality components

### Backend Integration
- **Firebase**: Real-time database and authentication
- **NextAuth.js**: Secure session management
- **Mapbox**: Interactive maps and geocoding

### Performance
- **Code Splitting**: Lazy loading for optimal performance
- **Image Optimization**: Next.js image optimization
- **Caching**: Smart caching strategies
- **Bundle Analysis**: Optimized bundle sizes

## 🎨 Design System

- **Color Palette**: Green (growth/sustainability) + Blue (trust/reliability)
- **Typography**: Inter font for readability
- **Icons**: Lucide React for consistency
- **Animations**: Framer Motion for smooth interactions
- **Responsive**: Mobile-first design approach

## 🚀 Deployment

Ready for deployment on:
- **Vercel** (Recommended)
- **Netlify**
- **AWS Amplify**
- **Railway**

## 📈 Future Roadmap

- **Mobile App**: React Native implementation
- **AI Enhancement**: Machine learning for better matching
- **Blockchain**: Transparent donation tracking
- **IoT Integration**: Smart sensors for food quality
- **Multi-language**: International expansion

## 🤝 Contributing

This project is open for contributions and improvements. Perfect for:
- **Students**: Learning modern web development
- **Developers**: Contributing to social impact
- **Organizations**: Customizing for local needs

## 📄 License

MIT License - Feel free to use and modify for social good!

---

**Built with ❤️ for the Bolt Hackathon**

*Making food distribution smarter, faster, and more equitable through technology.*