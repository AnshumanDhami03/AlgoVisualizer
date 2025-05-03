import type { Metadata } from 'next';
import AlgorithmVisualizer from '@/components/algorithm/algorithm-visualizer';
import { notFound } from 'next/navigation';

type AlgorithmPageProps = {
  params: {
    category: string;
    algorithm: string;
  };
};

// Define valid algorithms and their display names
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
  graph: {
    'prims-algorithm': "Prim's Algorithm",
    'kruskals-algorithm': "Kruskal's Algorithm",
  },
};

// Function to get algorithm name safely
const getAlgorithmName = (category: string, algorithm: string): string | undefined => {
  return VALID_ALGORITHMS[category]?.[algorithm];
};

// Function to check if an algorithm is valid
const isValidAlgorithm = (category: string, algorithm: string): boolean => {
   return !!getAlgorithmName(category, algorithm);
};


export async function generateMetadata({ params }: AlgorithmPageProps): Promise<Metadata> {
  const { category, algorithm } = params;
  const algorithmName = getAlgorithmName(category, algorithm);

  if (!algorithmName) {
    return {
      title: 'Algorithm Not Found',
    };
  }

  const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);

  return {
    title: `${algorithmName} | ${capitalizedCategory} | AlgoVisualizer`,
    description: `Visualize the ${algorithmName} algorithm step by step.`,
  };
}

export default function AlgorithmPage({ params }: AlgorithmPageProps) {
  const { category, algorithm } = params;

  // Validate category and algorithm
  if (!isValidAlgorithm(category, algorithm)) {
    notFound(); // Show 404 if the category or algorithm is invalid
  }

  const algorithmName = getAlgorithmName(category, algorithm)!; // We know it's valid here

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">{algorithmName} Visualization</h1>
      {/* Ensure category is passed correctly as 'sort', 'search', or 'graph' */}
      <AlgorithmVisualizer algorithmId={algorithm} category={category as 'sort' | 'search' | 'graph'} />
    </div>
  );
}

// Generate static paths for all valid algorithms
export async function generateStaticParams() {
  const paths = [];
  for (const category in VALID_ALGORITHMS) {
    for (const algorithm in VALID_ALGORITHMS[category]) {
      paths.push({ category, algorithm });
    }
  }
  return paths;
}
