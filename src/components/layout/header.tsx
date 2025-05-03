import Link from 'next/link';
import { Shuffle, Search } from 'lucide-react';
import AlgorithmSelector from '@/components/algorithm/algorithm-selector';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-primary"
          >
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-4" />
          </svg>
          <span className="font-bold text-lg">AlgoVision</span>
        </Link>
        <nav className="flex items-center space-x-4">
          <AlgorithmSelector />
        </nav>
      </div>
    </header>
  );
}

