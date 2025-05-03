type AlgorithmStep = {
  array: number[];
  highlight: number[]; // [current index i, index being compared j, current min index]
  sortedIndices: number[];
  message: string;
};

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

export function getSelectionSortSteps(array: number[]): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
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
      message: `Finding the minimum element in the unsorted part (starting from index ${i}). Current minimum is ${arr[minIndex]} at index ${minIndex}.`,
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
        message: `Minimum found at index ${minIndex} (${arr[minIndex]}). Swapping with element at index ${i} (${arr[i]}).`,
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
        message: `Element at index ${i} (${arr[i]}) is already the minimum in the unsorted part. No swap needed.`,
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

  // Mark the last element as sorted
  sortedIndices.push(n - 1);
  steps.push({
    array: [...arr],
    highlight: [],
    sortedIndices: [...sortedIndices],
    message: "Array is sorted.",
  });

  return steps;
}
