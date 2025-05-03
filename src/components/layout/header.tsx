
import Link from 'next/link';
import { BarChartHorizontalBig } from 'lucide-react'; // Changed icon
import AlgorithmSelector from '@/components/algorithm/algorithm-selector';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8"> {/* Added responsive padding */}
        <Link href="/" className="flex items-center space-x-2">
          <BarChartHorizontalBig className="h-6 w-6 text-primary" /> {/* Use new icon */}
          <span className="font-bold text-lg whitespace-nowrap">AlgoVision</span> {/* Prevent wrapping */}
        </Link>
        {/* Use ml-auto to push selector to the right, allowing title to take space */}
        <nav className="ml-auto">
          <AlgorithmSelector />
        </nav>
      </div>
    </header>
  );
}

    