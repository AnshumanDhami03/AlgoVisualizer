import type { ArrayAlgorithmStep } from '@/lib/types'; // Updated import path


export function linearSearch(array: number[], target: number): number {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === target) {
      return i; // Target found
    }
  }
  return -1; // Target not found
}

export function getLinearSearchSteps(array: number[], target: number): ArrayAlgorithmStep[] {
  const steps: ArrayAlgorithmStep[] = [];
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
       // Add step indicating non-match only if not the last element checked (or if found)
       if(i < n-1){ // Add this step only if not the last element
          steps.push({
            array: [...array],
            highlight: [i],
            target: target,
            message: `Element ${array[i]} does not match target ${target}. Moving to next index.`,
          });
       }
    }
  }

  if (foundIndex === -1) {
    // Add the final "not found" message if it wasn't found
     steps.push({
      array: [...array],
      highlight: [], // No highlight if not found after loop
      target: target,
      message: `Finished searching. Target ${target} not found in the array.`,
    });
  } else {
     // If found, add a final "finished" step after the "found" step
      steps.push({
        array: [...array],
        highlight: [foundIndex], // Keep highlighting the found index
        target: target,
        foundIndex: foundIndex,
        message: `Finished searching. Target found at index ${foundIndex}.`,
        });
  }


  return steps;
}
