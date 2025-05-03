import type { Metadata } from 'next';
import AlgorithmVisualizer from '@/components/algorithm/algorithm-visualizer';
import { notFound } from 'next/navigation';

type AlgorithmPageProps = {
  params: {
    category: string;
    algorithm: string;
  };
};

// TODO: Replace with actual algorithm details fetching if needed
const VALID_ALGORITHMS: Record<string, Record<string, string>> = {
  sort: {
    'bubble-sort': 'Bubble Sort',
    'selection-sort': 'Selection Sort',
    'insertion-sort': 'Insertion Sort',
    'merge-sort': 'Merge Sort',
    'quick-sort': 'Quick Sort',
  },
  search: {
    'linear-search': 'Linear Search',
    'binary-search': 'Binary Search',
  },
};

export async function generateMetadata({ params }: AlgorithmPageProps): Promise<Metadata> {
  const { category, algorithm } = params;
  const algorithmName = VALID_ALGORITHMS[category]?.[algorithm];

  if (!algorithmName) {
    return {
      title: 'Algorithm Not Found',
    };
  }

  return {
    title: `${algorithmName} | AlgoVisualizer`,
    description: `Visualize the ${algorithmName} algorithm step by step.`,
  };
}

export default function AlgorithmPage({ params }: AlgorithmPageProps) {
  const { category, algorithm } = params;

  // Validate category and algorithm
  if (!['sort', 'search'].includes(category) || !VALID_ALGORITHMS[category]?.[algorithm]) {
    notFound(); // Show 404 if the category or algorithm is invalid
  }

  const algorithmName = VALID_ALGORITHMS[category][algorithm];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">{algorithmName} Visualization</h1>
      <AlgorithmVisualizer algorithmId={algorithm} category={category} />
    </div>
  );
}

// Optional: Generate static paths if you know all algorithms beforehand
export async function generateStaticParams() {
  const paths = [];
  for (const category in VALID_ALGORITHMS) {
    for (const algorithm in VALID_ALGORITHMS[category]) {
      paths.push({ category, algorithm });
    }
  }
  return paths;
}
