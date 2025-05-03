import type { ArrayAlgorithmStep } from '@/lib/types'; // Updated import path


// Binary search requires a sorted array
export function binarySearch(sortedArray: number[], target: number): number {
  let low = 0;
  let high = sortedArray.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midValue = sortedArray[mid];

    if (midValue === target) {
      return mid; // Target found
    } else if (midValue < target) {
      low = mid + 1; // Search in the right half
    } else {
      high = mid - 1; // Search in the left half
    }
  }

  return -1; // Target not found
}


export function getBinarySearchSteps(sortedArray: number[], target: number): ArrayAlgorithmStep[] {
  const steps: ArrayAlgorithmStep[] = [];
  const n = sortedArray.length;
  let low = 0;
  let high = n - 1;
  let foundIndex = -1;

  steps.push({
    array: [...sortedArray],
    highlight: [low, high], // Highlight initial search range
    target: target,
    message: `Initial sorted array. Searching for target ${target} between index ${low} and ${high}.`,
  });

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midValue = sortedArray[mid];

    // Highlight low, mid, and high pointers
    steps.push({
      array: [...sortedArray],
      highlight: [low, mid, high].filter(idx => idx >=0 && idx < n), // Ensure indices are valid
      target: target,
      message: `Current range: [${low}, ${high}]. Calculating middle index: mid = floor((${low} + ${high}) / 2) = ${mid}. Value at mid: ${midValue}.`,
    });

    steps.push({
        array: [...sortedArray],
        highlight: [mid], // Focus highlight on mid for comparison
        target: target,
        message: `Comparing target ${target} with value at mid index ${mid} (${midValue}).`
    });


    if (midValue === target) {
      foundIndex = mid;
      steps.push({
        array: [...sortedArray],
        highlight: [mid], // Highlight the found index
        target: target,
        foundIndex: mid,
        message: `Target ${target} found at index ${mid}.`,
      });
      break; // Exit loop once found
    } else if (midValue < target) {
      steps.push({
        array: [...sortedArray],
        highlight: [low, mid, high].filter(idx => idx >=0 && idx < n),
        target: target,
        message: `${midValue} < ${target}. Target might be in the right half. Adjusting low pointer to mid + 1 (${mid + 1}).`,
      });
      low = mid + 1;
    } else {
       steps.push({
        array: [...sortedArray],
        highlight: [low, mid, high].filter(idx => idx >=0 && idx < n),
        target: target,
        message: `${midValue} > ${target}. Target might be in the left half. Adjusting high pointer to mid - 1 (${mid - 1}).`,
      });
      high = mid - 1;
    }

     // Show the updated search range if loop continues
     if (low <= high) {
        steps.push({
            array: [...sortedArray],
            highlight: [low, high].filter(idx => idx >=0 && idx < n), // Highlight new search range
            target: target,
            message: `New search range is from index ${low} to ${high}.`,
        });
     }

  }

  if (foundIndex === -1) {
    steps.push({
      array: [...sortedArray],
      highlight: [], // No highlight if not found
      target: target,
      message: `Search range became invalid (low=${low}, high=${high}). Target ${target} not found in the array.`,
    });
  }

  return steps;
}
