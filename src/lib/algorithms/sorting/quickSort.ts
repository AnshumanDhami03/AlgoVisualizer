type AlgorithmStep = {
  array: number[];
  highlight: number[]; // [pivotIndex, i, j] or indices being swapped
  sortedIndices: number[]; // Indices considered sorted (less useful for quicksort visualization)
  pivot?: number; // Index of the current pivot
  message: string;
};

// Partition function helper for Quick Sort that generates steps
function partition(
  arr: number[],
  low: number,
  high: number,
  steps: AlgorithmStep[]
): number {
  const pivotValue = arr[high];
  let pivotIndexHighlight = high; // Keep track of the pivot's original index for highlighting
  steps.push({
    array: [...arr],
    highlight: [pivotIndexHighlight],
    sortedIndices: [],
    pivot: pivotIndexHighlight,
    message: `Choosing pivot: ${pivotValue} (at index ${high}). Partitioning range ${low}-${high}.`,
  });

  let i = low - 1; // Index of smaller element

  for (let j = low; j < high; j++) {
    // Highlight pivot, i (boundary of smaller elements), and j (current element)
    steps.push({
      array: [...arr],
      highlight: [pivotIndexHighlight, i < low ? -1 : i , j], // Use -1 if i is out of bounds initially
      sortedIndices: [],
      pivot: pivotIndexHighlight,
      message: `Comparing element at index ${j} (${arr[j]}) with pivot ${pivotValue}. i is at ${i}.`,
    });

    if (arr[j] < pivotValue) {
      i++;
      if (i !== j) {
          steps.push({
            array: [...arr],
            highlight: [pivotIndexHighlight, i, j], // Highlight elements to be swapped
            sortedIndices: [],
             pivot: pivotIndexHighlight,
            message: `${arr[j]} < ${pivotValue}. Swapping element at index i (${i}, value ${arr[i]}) with element at index j (${j}, value ${arr[j]}).`,
          });
          [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap
          steps.push({
            array: [...arr],
            highlight: [pivotIndexHighlight, i, j], // Keep highlight briefly after swap
            sortedIndices: [],
             pivot: pivotIndexHighlight,
            message: `Swapped. i is now ${i}. Array: [${arr.join(', ')}].`,
          });
      } else {
           steps.push({
            array: [...arr],
            highlight: [pivotIndexHighlight, i, j],
            sortedIndices: [],
             pivot: pivotIndexHighlight,
            message: `${arr[j]} < ${pivotValue}, and i (${i}) equals j (${j}). Incrementing i to ${i+1}. No swap needed here.`,
          });
          // Note: i is incremented *before* this message technically, but state reflects post-increment. Message clarifies.
      }
    } else {
        steps.push({
            array: [...arr],
            highlight: [pivotIndexHighlight, i < low ? -1 : i, j],
            sortedIndices: [],
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
       sortedIndices: [],
        pivot: pivotIndexHighlight, // Still highlighting original pivot position
       message: `Partition complete for range ${low}-${high}. Swapping pivot ${arr[high]} (at index ${high}) with element ${arr[finalPivotIndex]} (at index ${finalPivotIndex}).`,
     });
     [arr[finalPivotIndex], arr[high]] = [arr[high], arr[finalPivotIndex]]; // Final swap
     steps.push({
       array: [...arr],
       highlight: [finalPivotIndex], // Highlight the pivot in its final sorted place for this partition
       sortedIndices: [finalPivotIndex], // Mark pivot index as 'locally' sorted
        pivot: finalPivotIndex, // Update pivot index highlight
       message: `Pivot ${arr[finalPivotIndex]} is now at its final sorted position (index ${finalPivotIndex}) for this partition. Array: [${arr.join(', ')}].`,
     });
   } else {
        steps.push({
       array: [...arr],
       highlight: [finalPivotIndex], // Highlight the pivot in its final sorted place
       sortedIndices: [finalPivotIndex], // Mark pivot index as 'locally' sorted
       pivot: finalPivotIndex, // Update pivot index highlight
       message: `Pivot ${arr[finalPivotIndex]} (at index ${finalPivotIndex}) was already in its final sorted position for this partition. No final swap needed.`,
     });
   }


  return finalPivotIndex; // Return the index of the pivot element
}

// Recursive Quick Sort function that generates steps
function quickSortRecursive(
  arr: number[],
  low: number,
  high: number,
  steps: AlgorithmStep[]
) {
  if (low < high) {
    // pi is the partitioning index, arr[pi] is now at the right place
    const pi = partition(arr, low, high, steps);

     // Add step indicating recursion
      steps.push({
        array: [...arr],
        highlight: [],
        sortedIndices: [pi], // Carry over the locally sorted pivot index
        pivot: undefined, // Clear pivot highlight for recursive calls
        message: `Recursively sorting left subarray (indices ${low}-${pi - 1}) and right subarray (indices ${pi + 1}-${high}).`,
      });


    // Separately sort elements before partition and after partition
    quickSortRecursive(arr, low, pi - 1, steps);
    quickSortRecursive(arr, pi + 1, high, steps);
  } else if (low === high) {
      // Base case: subarray of size 1 is already sorted
      steps.push({
          array: [...arr],
          highlight: [low],
          sortedIndices: [low],
          pivot: undefined,
          message: `Base case: Subarray at index ${low} (value ${arr[low]}) is of size 1, considered sorted.`
      });
  }
}

// Main function to get steps
export function getQuickSortSteps(array: number[]): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const n = array.length;
  let arr = [...array];

  steps.push({ array: [...arr], highlight: [], sortedIndices: [], message: "Initial array." });

   if (n > 0) {
       quickSortRecursive(arr, 0, n - 1, steps);
        // Collect all indices that were marked as sorted during base cases or partitioning
        const finalSortedIndices = Array.from({length: n}, (_, i) => i);
        steps.push({
            array: [...arr],
            highlight: [],
            sortedIndices: finalSortedIndices, // Mark all as sorted
            message: "Array is sorted."
        });
   }


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
