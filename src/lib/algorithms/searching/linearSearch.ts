type AlgorithmStep = {
  array: number[];
  highlight: number[]; // Index being checked
  target: number;
  foundIndex?: number; // Index where target is found
  message: string;
};

export function linearSearch(array: number[], target: number): number {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === target) {
      return i; // Target found
    }
  }
  return -1; // Target not found
}

export function getLinearSearchSteps(array: number[], target: number): AlgorithmStep[] {
  const steps: AlgorithmStep[] = [];
  const n = array.length;
  let foundIndex = -1;

  steps.push({
    array: [...array],
    highlight: [],
    target: target,
    message: `Initial array. Searching for target value: ${target}.`,
  });

  for (let i = 0; i < n; i++) {
    // Highlight the current element being checked
    steps.push({
      array: [...array],
      highlight: [i],
      target: target,
      message: `Checking element at index ${i} (value: ${array[i]}).`,
    });

    if (array[i] === target) {
      foundIndex = i;
      steps.push({
        array: [...array],
        highlight: [i],
        target: target,
        foundIndex: i, // Mark the found index
        message: `Target ${target} found at index ${i}.`,
      });
      break; // Exit loop once found
    } else {
       steps.push({
        array: [...array],
        highlight: [i],
        target: target,
        message: `Element ${array[i]} does not match target ${target}.`,
      });
    }
  }

  if (foundIndex === -1) {
    steps.push({
      array: [...array],
      highlight: [], // No highlight if not found after loop
      target: target,
      message: `Target ${target} not found in the array.`,
    });
  }

  return steps;
}
