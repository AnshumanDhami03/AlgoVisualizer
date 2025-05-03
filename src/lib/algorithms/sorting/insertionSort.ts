type AlgorithmStep = {
  array: number[];
  highlight: number[]; // [current element i, comparison element j]
  sortedIndices: number[]; // Elements considered sorted (up to i-1)
  message: string;
};

export function insertionSort(array: number[]): number[] {
  const n = array.length;
  for (let i = 1; i < n; i++) {
    let current = array[i];
    let j = i - 1;
    while (j >= 0 && array[j] > current) {
      array[j + 1] = array[j];
      j--;
    }
    array[j + 1] = current;
  }
  return array;
}

export function getInsertionSortSteps(array: number[]): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const n = array.length;
  let arr = [...array];
  let sortedIndices: number[] = [];

  steps.push({ array: [...arr], highlight: [], sortedIndices: [...sortedIndices], message: "Initial array." });

  // The first element is trivially sorted
  if (n > 0) {
      sortedIndices.push(0);
      steps.push({ array: [...arr], highlight: [0], sortedIndices: [...sortedIndices], message: "First element is considered sorted." });
  }


  for (let i = 1; i < n; i++) {
    let current = arr[i];
    let j = i - 1;

    steps.push({
      array: [...arr],
      highlight: [i], // Highlight the element to be inserted
      sortedIndices: [...sortedIndices],
      message: `Picking element ${current} at index ${i} to insert into the sorted part.`,
    });

    let shifted = false;
    // Compare current with elements in the sorted portion (to the left)
    while (j >= 0 && arr[j] > current) {
      steps.push({
        array: [...arr],
        highlight: [i, j], // Highlight current element and element being compared
        sortedIndices: [...sortedIndices],
        message: `Comparing ${current} with ${arr[j]} at index ${j}. Since ${arr[j]} > ${current}, shift ${arr[j]} to the right.`,
      });
      arr[j + 1] = arr[j]; // Shift element to the right
      shifted = true;
      steps.push({
        array: [...arr],
        highlight: [i, j + 1], // Highlight current element's potential new position and the shifted element's old position
        sortedIndices: [...sortedIndices],
        message: `Shifted ${arr[j+1]} from index ${j} to ${j+1}. Array: [${arr.join(', ')}].`,
      });
      j--;
    }

    // Place the current element in its correct position
    if (j + 1 !== i) { // Only log insertion if position changed
       arr[j + 1] = current;
       steps.push({
         array: [...arr],
         highlight: [j + 1], // Highlight the inserted element's final position
         sortedIndices: [...sortedIndices], // Sorted indices remain the same until end of outer loop
         message: `Inserted ${current} at index ${j + 1}. Array: [${arr.join(', ')}].`,
       });
    } else if (!shifted) {
         steps.push({
         array: [...arr],
         highlight: [i], // Highlight the element at i
         sortedIndices: [...sortedIndices],
         message: `${current} is already in its correct position relative to the sorted part.`,
       });
    } else {
        // Case where loop finished but no shift happened in the last comparison (e.g., 1, [5], 3 -> compare 3 with 5, shift 5 -> compare 3 with 1 -> insert 3)
        arr[j + 1] = current;
         steps.push({
           array: [...arr],
           highlight: [j + 1], // Highlight the inserted element's final position
           sortedIndices: [...sortedIndices],
           message: `Found insertion point for ${current} at index ${j + 1}. Inserted. Array: [${arr.join(', ')}].`,
         });
    }


    // Update sorted indices after inserting element at index i
    sortedIndices = Array.from({ length: i + 1 }, (_, k) => k);
    steps.push({
      array: [...arr],
      highlight: [], // Clear highlights
      sortedIndices: [...sortedIndices],
      message: `Elements up to index ${i} are now sorted.`,
    });
  }

   // Final step to ensure all indices are marked sorted if n > 0
   if (n > 0) {
      steps.push({
        array: [...arr],
        highlight: [],
        sortedIndices: Array.from({ length: n }, (_, k) => k),
        message: "Array is sorted.",
      });
   }


  return steps;
}
