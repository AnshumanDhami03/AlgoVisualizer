import type { ArrayAlgorithmStep } from '@/lib/types'; // Updated import path

export function bubbleSort(array: number[]): number[] {
  const n = array.length;
  let swapped;
  do {
    swapped = false;
    for (let i = 0; i < n - 1; i++) {
      if (array[i] > array[i + 1]) {
        [array[i], array[i + 1]] = [array[i + 1], array[i]]; // Swap
        swapped = true;
      }
    }
    // Optimization: The last element of each pass is sorted
    // n--; // This optimization slightly complicates step tracking, might omit for simplicity
  } while (swapped);
  return array;
}


export function getBubbleSortSteps(array: number[]): ArrayAlgorithmStep[] {
  const steps: ArrayAlgorithmStep[] = [];
  const n = array.length;
  let arr = [...array];
  let sortedIndices: number[] = [];
  let k = n; // Track the boundary of the unsorted part

  steps.push({ array: [...arr], highlight: [], sortedIndices: [...sortedIndices], message: "Initial array." });

  let swapped;
  do {
    swapped = false;
    for (let i = 0; i < k - 1; i++) {
      // Highlight elements being compared
      steps.push({
        array: [...arr],
        highlight: [i, i + 1],
        sortedIndices: [...sortedIndices],
        message: `Comparing ${arr[i]} and ${arr[i + 1]}.`,
      });

      if (arr[i] > arr[i + 1]) {
        steps.push({
          array: [...arr],
          highlight: [i, i + 1],
          sortedIndices: [...sortedIndices],
          message: `${arr[i]} > ${arr[i + 1]}, swapping.`,
        });
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; // Swap
        swapped = true;
        // Show the array state after swap
        steps.push({
          array: [...arr],
          highlight: [i, i + 1], // Keep highlight briefly after swap
          sortedIndices: [...sortedIndices],
          message: `Swapped. Array is now [${arr.join(', ')}].`,
        });
      } else {
          steps.push({
            array: [...arr],
            highlight: [i, i+1],
            sortedIndices: [...sortedIndices],
            message: `${arr[i]} <= ${arr[i + 1]}, no swap needed.`,
        });
      }
    }
    // Mark the last element of the pass as sorted
    if (k > 0 && swapped) { // Only mark if a swap occurred in the pass, or it's the final pass implicitly making it sorted
      sortedIndices.unshift(k - 1); // Add to the beginning as highest elements sort first
       steps.push({
           array: [...arr],
           highlight: [],
           sortedIndices: [...sortedIndices].sort((a,b)=>a-b), // Keep sortedIndices visually consistent
           message: `End of pass. ${arr[k-1]} is now in its sorted position.`,
       });
    } else if (!swapped && k > 0) {
        // If no swaps occurred, the rest is sorted
        const remainingUnsorted = Array.from({length: k}, (_, idx) => idx);
        sortedIndices = [...remainingUnsorted, ...sortedIndices].sort((a,b)=>a-b);
         steps.push({
           array: [...arr],
           highlight: [],
           sortedIndices: [...sortedIndices],
           message: `No swaps in this pass. Remaining elements are sorted.`,
       });
    }


    k--; // Reduce the range for the next pass
  } while (swapped);

  // Ensure all elements are marked as sorted at the end if not already
   const finalSortedIndices = Array.from({length: n}, (_, i) => i);
    // Add final step only if the last one isn't already fully sorted
    if (JSON.stringify(steps[steps.length - 1]?.sortedIndices?.sort((a,b)=>a-b)) !== JSON.stringify(finalSortedIndices)) {
        steps.push({
            array: [...arr],
            highlight: [],
            sortedIndices: finalSortedIndices,
            message: "Array is sorted.",
        });
    }


  return steps;
}
