import type { ArrayAlgorithmStep } from '@/lib/types'; // Updated import path


// Partition function helper for Quick Sort that generates steps
function partition(
  arr: number[],
  low: number,
  high: number,
  steps: ArrayAlgorithmStep[],
  currentSorted: number[] // Pass currently known sorted indices
): { partitionIndex: number; sortedIndices: number[] } {
  const pivotValue = arr[high];
  let pivotIndexHighlight = high; // Keep track of the pivot's original index for highlighting
  steps.push({
    array: [...arr],
    highlight: [pivotIndexHighlight],
    sortedIndices: [...currentSorted],
    pivot: pivotIndexHighlight,
    message: `Choosing pivot: ${pivotValue} (at index ${high}). Partitioning range ${low}-${high}.`,
  });

  let i = low - 1; // Index of smaller element

  for (let j = low; j < high; j++) {
    // Highlight pivot, i (boundary of smaller elements), and j (current element)
    steps.push({
      array: [...arr],
      highlight: [pivotIndexHighlight, i < low ? -1 : i , j].filter(idx => idx >= 0), // Filter out -1
      sortedIndices: [...currentSorted],
      pivot: pivotIndexHighlight,
      message: `Comparing element at index ${j} (${arr[j]}) with pivot ${pivotValue}. i is at ${i}.`,
    });

    if (arr[j] < pivotValue) {
      i++;
      if (i !== j) {
          steps.push({
            array: [...arr],
            highlight: [pivotIndexHighlight, i, j], // Highlight elements to be swapped
            sortedIndices: [...currentSorted],
             pivot: pivotIndexHighlight,
            message: `${arr[j]} < ${pivotValue}. Swapping element at index i (${i}, value ${arr[i]}) with element at index j (${j}, value ${arr[j]}).`,
          });
          [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap
          steps.push({
            array: [...arr],
            highlight: [pivotIndexHighlight, i, j], // Keep highlight briefly after swap
            sortedIndices: [...currentSorted],
             pivot: pivotIndexHighlight,
            message: `Swapped. i is now ${i}. Array: [${arr.join(', ')}].`,
          });
      } else {
           // Increment i visually even if no swap
           steps.push({
            array: [...arr],
            highlight: [pivotIndexHighlight, i, j],
            sortedIndices: [...currentSorted],
             pivot: pivotIndexHighlight,
            message: `${arr[j]} < ${pivotValue}. Incrementing i to ${i}. No swap needed as i==j.`,
           });
      }
    } else {
        steps.push({
            array: [...arr],
            highlight: [pivotIndexHighlight, i < low ? -1 : i, j].filter(idx => idx >= 0),
            sortedIndices: [...currentSorted],
             pivot: pivotIndexHighlight,
            message: `${arr[j]} >= ${pivotValue}. No swap needed. Moving j forward.`,
          });
    }
  }

  // Swap pivot element (arr[high]) with the element at i + 1
  const finalPivotIndex = i + 1;
   if (finalPivotIndex !== high) {
     steps.push({
       array: [...arr],
       highlight: [finalPivotIndex, high], // Highlight final pivot position and original pivot position
       sortedIndices: [...currentSorted],
        pivot: pivotIndexHighlight, // Still highlighting original pivot position
       message: `Partition complete for range ${low}-${high}. Swapping pivot ${arr[high]} (at index ${high}) with element ${arr[finalPivotIndex]} (at index ${finalPivotIndex}).`,
     });
     [arr[finalPivotIndex], arr[high]] = [arr[high], arr[finalPivotIndex]]; // Final swap
     steps.push({
       array: [...arr],
       highlight: [finalPivotIndex], // Highlight the pivot in its final sorted place
       sortedIndices: [...currentSorted], // Mark pivot index as 'locally' sorted
        pivot: finalPivotIndex, // Update pivot index highlight
       message: `Pivot ${arr[finalPivotIndex]} is now at its final sorted position (index ${finalPivotIndex}). Array: [${arr.join(', ')}].`,
     });
   } else {
        steps.push({
       array: [...arr],
       highlight: [finalPivotIndex], // Highlight the pivot in its final sorted place
       sortedIndices: [...currentSorted], // Mark pivot index as 'locally' sorted
       pivot: finalPivotIndex, // Update pivot index highlight
       message: `Pivot ${arr[finalPivotIndex]} (at index ${finalPivotIndex}) was already in its final sorted position.`,
     });
   }


  return { partitionIndex: finalPivotIndex, sortedIndices: currentSorted }; // Return the index and updated sorted indices
}

// Recursive Quick Sort function that generates steps
function quickSortRecursive(
  arr: number[],
  low: number,
  high: number,
  steps: ArrayAlgorithmStep[],
  currentSorted: number[] // Pass down and update sorted indices
): number[] { // Return updated sorted indices
  if (low < high) {
    // pi is the partitioning index, arr[pi] is now at the right place
    const { partitionIndex: pi, sortedIndices: updatedSortedAfterPartition } = partition(arr, low, high, steps, currentSorted);
    currentSorted = updatedSortedAfterPartition; // Update sorted list

     // Add step indicating recursion
      steps.push({
        array: [...arr],
        highlight: [],
        sortedIndices: [...currentSorted], // Carry over the locally sorted pivot index
        pivot: undefined, // Clear pivot highlight for recursive calls
        message: `Recursively sorting left subarray (${low}-${pi - 1}) and right subarray (${pi + 1}-${high}). Pivot ${arr[pi]} is sorted.`,
      });


    // Separately sort elements before partition and after partition
    currentSorted = quickSortRecursive(arr, low, pi - 1, steps, currentSorted);
    currentSorted = quickSortRecursive(arr, pi + 1, high, steps, currentSorted);
  } else if (low === high && low >= 0 && low < arr.length) {
      // Base case: subarray of size 1 is already sorted
       steps.push({
           array: [...arr],
           highlight: [low],
           sortedIndices: [...currentSorted],
           pivot: undefined,
           message: `Base case: Subarray at index ${low} (value ${arr[low]}) is size 1, considered sorted.`
       });
  }

   return currentSorted; // Return potentially updated list
}

// Main function to get steps
export function getQuickSortSteps(array: number[]): ArrayAlgorithmStep[] {
  const steps: ArrayAlgorithmStep[] = [];
  const n = array.length;
  let arr = [...array];
  let sortedIndices: number[] = []; // Track indices known to be sorted

  steps.push({ array: [...arr], highlight: [], sortedIndices: [], message: "Initial array." });

   quickSortRecursive(arr, 0, n - 1, steps, sortedIndices);

    steps.push({
        array: [...arr],
        highlight: [],
        sortedIndices: Array.from({length: n}, (_, i) => i), // Mark all as sorted
        message: "Array is sorted."
    });

  return steps;
}


// Standard quick sort (no steps) for testing or other uses if needed
export function quickSort(array: number[]): number[] {
 function partitionRecursive(arr: number[], low: number, high: number): number {
    const pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      if (arr[j] < pivot) {
        i++;
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    return i + 1;
  }

  function sortRecursive(arr: number[], low: number, high: number): void {
    if (low < high) {
      const pi = partitionRecursive(arr, low, high);
      sortRecursive(arr, low, pi - 1);
      sortRecursive(arr, pi + 1, high);
    }
  }

  let arrCopy = [...array];
  sortRecursive(arrCopy, 0, arrCopy.length - 1);
  return arrCopy;
}
