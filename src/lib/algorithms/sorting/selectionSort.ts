import type { ArrayAlgorithmStep } from '@/lib/types'; // Updated import path


export function selectionSort(array: number[]): number[] {
  const n = array.length;
  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;
    for (let j = i + 1; j < n; j++) {
      if (array[j] < array[minIndex]) {
        minIndex = j;
      }
    }
    if (minIndex !== i) {
      [array[i], array[minIndex]] = [array[minIndex], array[i]]; // Swap
    }
  }
  return array;
}

export function getSelectionSortSteps(array: number[]): ArrayAlgorithmStep[] {
  const steps: ArrayAlgorithmStep[] = [];
  const n = array.length;
  let arr = [...array];
  let sortedIndices: number[] = [];

  steps.push({ array: [...arr], highlight: [], sortedIndices: [...sortedIndices], message: "Initial array." });

  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;
    // Highlight the current element we're finding the minimum for
    steps.push({
      array: [...arr],
      highlight: [i], // Highlight outer loop index i
      sortedIndices: [...sortedIndices],
      message: `Finding the minimum element in the unsorted part (from index ${i}). Current minimum guess: ${arr[minIndex]} at index ${minIndex}.`,
    });

    for (let j = i + 1; j < n; j++) {
      // Highlight current outer index i, comparing index j, and current minIndex
      steps.push({
        array: [...arr],
        highlight: [i, j, minIndex],
        sortedIndices: [...sortedIndices],
        message: `Comparing element at index ${j} (${arr[j]}) with current minimum (${arr[minIndex]} at index ${minIndex}).`,
      });
      if (arr[j] < arr[minIndex]) {
         const oldMinIndex = minIndex;
         minIndex = j;
          steps.push({
            array: [...arr],
            highlight: [i, j, minIndex], // Highlight new min index
            sortedIndices: [...sortedIndices],
            message: `Found new minimum: ${arr[minIndex]} at index ${minIndex}. (Previous was ${arr[oldMinIndex]} at index ${oldMinIndex})`,
          });
      }
    }

    // Swap if minimum is not the current element
    if (minIndex !== i) {
      steps.push({
        array: [...arr],
        highlight: [i, minIndex], // Highlight elements to be swapped
        sortedIndices: [...sortedIndices],
        message: `Minimum for pass ${i} found at index ${minIndex} (${arr[minIndex]}). Swapping with element at index ${i} (${arr[i]}).`,
      });
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]]; // Swap
       steps.push({
        array: [...arr],
        highlight: [i, minIndex], // Highlight briefly after swap
        sortedIndices: [...sortedIndices],
        message: `Swapped. Array is now [${arr.join(', ')}].`,
      });
    } else {
        steps.push({
        array: [...arr],
        highlight: [i], // Highlight element at i
        sortedIndices: [...sortedIndices],
        message: `Element at index ${i} (${arr[i]}) is already the minimum for this pass. No swap needed.`,
      });
    }

    // Mark the element at index i as sorted
    sortedIndices.push(i);
     steps.push({
        array: [...arr],
        highlight: [], // Clear highlights
        sortedIndices: [...sortedIndices],
        message: `Element ${arr[i]} at index ${i} is now sorted.`,
     });
  }

   // Mark the last element as sorted (it must be in the correct place after n-1 passes)
    if (n > 0) {
        sortedIndices.push(n - 1);
        // Add final step only if the last one isn't already fully sorted
        if (steps[steps.length - 1]?.sortedIndices?.length !== n) {
            steps.push({
                array: [...arr],
                highlight: [],
                sortedIndices: [...sortedIndices].sort((a,b)=>a-b), // Ensure final list is ordered
                message: "Array is sorted.",
            });
        }
    } else {
         // Handle empty array case
         steps.push({
             array: [],
             highlight: [],
             sortedIndices: [],
             message: "Array is empty, nothing to sort."
         });
    }


  return steps;
}
