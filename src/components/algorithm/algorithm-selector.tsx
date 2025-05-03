'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shuffle, Search, Share2 } from 'lucide-react'; // Added Share2 for Graph icon

const ALGORITHMS_DATA = {
  sort: {
    label: 'Sorting Algorithms',
    icon: Shuffle,
    algorithms: [
      { value: 'bubble-sort', label: 'Bubble Sort' },
      { value: 'selection-sort', label: 'Selection Sort' },
      { value: 'insertion-sort', label: 'Insertion Sort' },
      { value: 'merge-sort', label: 'Merge Sort' },
      { value: 'quick-sort', label: 'Quick Sort' },
    ]
  },
  search: {
    label: 'Searching Algorithms',
    icon: Search,
    algorithms: [
      { value: 'linear-search', label: 'Linear Search' },
      { value: 'binary-search', label: 'Binary Search' },
    ]
  },
  graph: {
    label: 'Graph Algorithms (MST)',
    icon: Share2,
    algorithms: [
        { value: 'prims-algorithm', label: "Prim's Algorithm" },
        { value: 'kruskals-algorithm', label: "Kruskal's Algorithm" },
    ]
  }
};

export default function AlgorithmSelector() {
  const router = useRouter();
  const pathname = usePathname();

  // Extract category and algorithm slug from the path, e.g., /sort/bubble-sort
  const pathSegments = pathname.split('/').filter(Boolean); // Filter out empty strings
  const currentCategory = pathSegments[0] || '';
  const currentAlgorithm = pathSegments[1] || '';
  const currentPath = currentCategory && currentAlgorithm ? `/${currentCategory}/${currentAlgorithm}` : '';


  const handleValueChange = (value: string) => {
    if (value && value !== currentPath) {
        // The value format is "/category/algorithm-slug"
        router.push(value);
    }
  };

  // Find the category of the current algorithm to set the Select value correctly
  let selectValue = '';
  if(currentCategory && currentAlgorithm){
      selectValue = `/${currentCategory}/${currentAlgorithm}`;
  }


  return (
    <Select onValueChange={handleValueChange} value={selectValue}>
      <SelectTrigger className="w-[220px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
        <SelectValue placeholder="Select Algorithm" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ALGORITHMS_DATA).map(([categoryKey, categoryData]) => (
          <SelectGroup key={categoryKey}>
            <SelectLabel className="flex items-center gap-2">
              <categoryData.icon className="h-4 w-4" /> {categoryData.label}
            </SelectLabel>
            {categoryData.algorithms.map((algo) => (
              <SelectItem key={`${categoryKey}-${algo.value}`} value={`/${categoryKey}/${algo.value}`}>
                {algo.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
