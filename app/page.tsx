import Hero from '@/components/hero';
import About from '@/components/about';
import HeaderBar from '@/components/header-bar';
import VouchedBy from '@/components/vouched-by';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <HeaderBar />
      <Hero />
      <About />
      <VouchedBy />
    </main>
  );
}