import Hero from '@/components/hero';
import About from '@/components/about';
import HeaderBar from '@/components/header-bar';
import VouchedBy from '@/components/vouched-by';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <HeaderBar />
      <Hero />
      <About />
      <VouchedBy />
      
      {/* Hackathon Footer */}
      <footer className="w-full bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-full">
              <span className="text-sm font-semibold">⚡ Built with Bolt</span>
            </div>
            <div className="bg-green-600 px-4 py-2 rounded-full">
              <span className="text-sm font-semibold">🏆 Hackathon 2025</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            FoodBridge AI - Connecting surplus food with communities in need through intelligent technology
          </p>
          <p className="text-gray-500 text-xs mt-2">
            © 2025 FoodBridge AI. Built for social impact. Open source and free to use.
          </p>
        </div>
      </footer>
    </main>
  );
}