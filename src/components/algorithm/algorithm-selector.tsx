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
import { Shuffle, Search } from 'lucide-react';

const SORTING_ALGORITHMS = [
  { value: 'bubble-sort', label: 'Bubble Sort' },
  { value: 'selection-sort', label: 'Selection Sort' },
  { value: 'insertion-sort', label: 'Insertion Sort' },
  { value: 'merge-sort', label: 'Merge Sort' },
  { value: 'quick-sort', label: 'Quick Sort' },
];

const SEARCHING_ALGORITHMS = [
  { value: 'linear-search', label: 'Linear Search' },
  { value: 'binary-search', label: 'Binary Search' },
];

export default function AlgorithmSelector() {
  const router = useRouter();
  const pathname = usePathname();

  // Extract algorithm slug from the path, e.g., /sort/bubble-sort -> bubble-sort
  const currentAlgorithm = pathname.split('/').pop() || '';

  const handleValueChange = (value: string) => {
    if (value) {
      // Determine if it's sorting or searching based on the value
      const isSorting = SORTING_ALGORITHMS.some(algo => algo.value === value);
      const category = isSorting ? 'sort' : 'search';
      router.push(`/${category}/${value}`);
    }
  };

  return (
    <Select onValueChange={handleValueChange} value={currentAlgorithm}>
      <SelectTrigger className="w-[200px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
        <SelectValue placeholder="Select Algorithm" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" /> Sorting Algorithms
          </SelectLabel>
          {SORTING_ALGORITHMS.map((algo) => (
            <SelectItem key={algo.value} value={algo.value}>
              {algo.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Searching Algorithms
          </SelectLabel>
          {SEARCHING_ALGORITHMS.map((algo) => (
            <SelectItem key={algo.value} value={algo.value}>
              {algo.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
