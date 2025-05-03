
import type { Metadata } from 'next';
import AlgorithmVisualizer from '@/components/algorithm/algorithm-visualizer';
// import { notFound } from 'next/navigation'; // Removed unused import

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
    // If algorithm name isn't found, we should handle this appropriately.
    // Returning a generic title or triggering notFound() here is an option,
    // but it might be better handled in the page component itself.
    // For metadata, a generic title is often acceptable.
    return {
      title: 'Algorithm Not Found | AlgoVisualizer',
      description: 'The requested algorithm visualization could not be found.',
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

  // Validate category and algorithm FIRST
  if (!isValidAlgorithm(category, algorithm)) {
      // Render a "Not Found" like component or redirect.
      // For now, let's return a simple message, but ideally use a proper 404 component.
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
            <h2 className="text-3xl font-bold mb-2 text-destructive">Algorithm Not Found</h2>
            <p className="text-lg text-muted-foreground mb-6">
                Sorry, we couldn&apos;t find the algorithm page you were looking for.
            </p>
            {/* Optionally add a link back home */}
            {/* <Button asChild><Link href="/">Return Home</Link></Button> */}
        </div>
     )
    // notFound(); // Show 404 if the category or algorithm is invalid - Replaced with inline message
  }

  // We now know the algorithm is valid, so get the name
  const algorithmName = getAlgorithmName(category, algorithm);

  // Double-check algorithmName exists before rendering (though isValidAlgorithm should guarantee this)
  if (!algorithmName) {
      console.error(`Algorithm name not found for valid category/algorithm: ${category}/${algorithm}`);
       return ( // Render error message if something went wrong
           <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
               <h2 className="text-3xl font-bold mb-2 text-destructive">Error</h2>
               <p className="text-lg text-muted-foreground mb-6">
                   An unexpected error occurred while loading the algorithm name.
               </p>
           </div>
       );
      // notFound(); // Fallback in case logic fails somehow - Replaced with inline message
  }


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

