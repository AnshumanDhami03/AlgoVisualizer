import type { ArrayAlgorithmStep } from '@/lib/types'; // Updated import path


// Helper function for merging two sorted subarrays and generating steps
function merge(
  arr: number[],
  left: number,
  mid: number,
  right: number,
  steps: ArrayAlgorithmStep[],
  originalArrRef: number[] // Reference to the full array for display
) {
  const leftArr = originalArrRef.slice(left, mid + 1); // Use original ref for slicing correct values
  const rightArr = originalArrRef.slice(mid + 1, right + 1); // Use original ref

  let i = 0; // Index for leftArr
  let j = 0; // Index for rightArr
  let k = left; // Index for merged arr (in originalArrRef)

  steps.push({
      array: [...originalArrRef], // Show full array state
      highlight: Array.from({ length: right - left + 1 }, (_, idx) => left + idx), // Highlight the entire range being merged
      sortedIndices: [], // Not applicable in the same way as other sorts
      message: `Merging subarrays [${leftArr.join(', ')}] (indices ${left}-${mid}) and [${rightArr.join(', ')}] (indices ${mid + 1}-${right}).`,
  });


  while (i < leftArr.length && j < rightArr.length) {
     // Highlight the elements being compared in the context of the original array
     steps.push({
         array: [...originalArrRef],
         highlight: [left + i, mid + 1 + j], // Highlight indices in original array
         sortedIndices: [],
         message: `Comparing ${leftArr[i]} (from left subarray) and ${rightArr[j]} (from right subarray).`,
     });

    if (leftArr[i] <= rightArr[j]) {
      steps.push({
        array: [...originalArrRef],
        highlight: [left + i],
        sortedIndices: [],
        message: `${leftArr[i]} <= ${rightArr[j]}. Taking ${leftArr[i]} from left subarray.`,
      });
      //arr[k] = leftArr[i]; // Modify the temporary array used by recursion if needed
      originalArrRef[k] = leftArr[i]; // Update the reference array THAT IS VISUALIZED
      i++;
    } else {
       steps.push({
        array: [...originalArrRef],
        highlight: [mid + 1 + j],
        sortedIndices: [],
        message: `${leftArr[i]} > ${rightArr[j]}. Taking ${rightArr[j]} from right subarray.`,
      });
      //arr[k] = rightArr[j];
       originalArrRef[k] = rightArr[j]; // Update the reference array THAT IS VISUALIZED
      j++;
    }
     // Show the state after placing the element
      steps.push({
        array: [...originalArrRef],
        highlight: [k], // Highlight the position where element was placed
        sortedIndices: Array.from({ length: k - left + 1 }, (_, idx) => left + idx), // Tentatively mark merged part
        message: `Placed ${originalArrRef[k]} at index ${k}. Merged part: [${originalArrRef.slice(left, k + 1).join(', ')}].`,
      });
    k++;
  }

  // Copy remaining elements of leftArr, if any
  while (i < leftArr.length) {
     steps.push({
        array: [...originalArrRef],
        highlight: [left + i],
        sortedIndices: [],
        message: `Copying remaining element ${leftArr[i]} from left subarray.`,
      });
    //arr[k] = leftArr[i];
     originalArrRef[k] = leftArr[i];
      // Show the state after placing the element
      steps.push({
        array: [...originalArrRef],
        highlight: [k], // Highlight the position where element was placed
         sortedIndices: Array.from({ length: k - left + 1 }, (_, idx) => left + idx),
        message: `Placed ${originalArrRef[k]} at index ${k}. Merged part: [${originalArrRef.slice(left, k + 1).join(', ')}].`,
      });
    i++;
    k++;
  }

  // Copy remaining elements of rightArr, if any
  while (j < rightArr.length) {
      steps.push({
        array: [...originalArrRef],
        highlight: [mid + 1 + j],
        sortedIndices: [],
        message: `Copying remaining element ${rightArr[j]} from right subarray.`,
      });
    //arr[k] = rightArr[j];
     originalArrRef[k] = rightArr[j];
     // Show the state after placing the element
      steps.push({
        array: [...originalArrRef],
        highlight: [k], // Highlight the position where element was placed
         sortedIndices: Array.from({ length: k - left + 1 }, (_, idx) => left + idx),
        message: `Placed ${originalArrRef[k]} at index ${k}. Merged part: [${originalArrRef.slice(left, k + 1).join(', ')}].`,
      });
    j++;
    k++;
  }

   steps.push({
        array: [...originalArrRef],
        highlight: [], // Clear highlights for this range
        sortedIndices: Array.from({ length: right - left + 1 }, (_, idx) => left + idx), // Mark the full merged range
        message: `Finished merging indices ${left}-${right}. Result: [${originalArrRef.slice(left, right + 1).join(', ')}].`,
    });
}

// Recursive merge sort function that generates steps
function mergeSortRecursive(
  arr: number[], // This can be the original array reference now
  left: number,
  right: number,
  steps: ArrayAlgorithmStep[],
  originalArrRef: number[] // Pass this down to merge
) {
  if (left >= right) {
    // Base case: subarray of size 0 or 1 is already sorted
     if (left === right) {
         steps.push({
             array: [...originalArrRef],
             highlight: [left],
             sortedIndices: [left],
             message: `Base case: Subarray [${arr[left]}] at index ${left} is trivially sorted.`
         });
     }
    return;
  }

  const mid = Math.floor((left + right) / 2);

   steps.push({
      array: [...originalArrRef],
      highlight: [],
      sortedIndices: [],
      message: `Dividing array range ${left}-${right} into ${left}-${mid} and ${mid + 1}-${right}.`,
   });

  mergeSortRecursive(arr, left, mid, steps, originalArrRef);
  mergeSortRecursive(arr, mid + 1, right, steps, originalArrRef);
  // Pass originalArrRef to merge for visualization updates
  merge(arr, left, mid, right, steps, originalArrRef);
}

// Main function to get steps
export function getMergeSortSteps(array: number[]): ArrayAlgorithmStep[] {
  const steps: ArrayAlgorithmStep[] = [];
  const n = array.length;
  let arr = [...array]; // Keep a mutable copy for visualization state updates

  steps.push({ array: [...arr], highlight: [], sortedIndices: [], message: "Initial array." });

  if (n > 0) {
      // Pass the mutable 'arr' to the recursive function, which will update it via the 'merge' helper
      mergeSortRecursive(arr, 0, n - 1, steps, arr);
      steps.push({
          array: [...arr], // Show final sorted state
          highlight: [],
          sortedIndices: Array.from({length: n}, (_, i) => i), // Mark all as sorted
          message: "Array is sorted."
      });
  }


  return steps;
}

// Standard merge sort (no steps) for testing or other uses if needed
export function mergeSort(array: number[]): number[] {
 function mergeRecursive(arr: number[], left: number, right: number): void {
    if (left >= right) {
      return;
    }
    const mid = Math.floor((left + right) / 2);
    mergeRecursive(arr, left, mid);
    mergeRecursive(arr, mid + 1, right);
    mergeArrays(arr, left, mid, right);
  }

  function mergeArrays(arr: number[], left: number, mid: number, right: number): void {
    const leftArr = arr.slice(left, mid + 1);
    const rightArr = arr.slice(mid + 1, right + 1);
    let i = 0, j = 0, k = left;
    while (i < leftArr.length && j < rightArr.length) {
      if (leftArr[i] <= rightArr[j]) {
        arr[k++] = leftArr[i++];
      } else {
        arr[k++] = rightArr[j++];
      }
    }
    while (i < leftArr.length) {
      arr[k++] = leftArr[i++];
    }
    while (j < rightArr.length) {
      arr[k++] = rightArr[j++];
    }
  }

  let arrCopy = [...array];
  mergeRecursive(arrCopy, 0, arrCopy.length - 1);
  return arrCopy;
}
