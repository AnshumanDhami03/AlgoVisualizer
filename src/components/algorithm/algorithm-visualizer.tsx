"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Pause, RotateCcw, FastForward, Shuffle as ShuffleIcon, Search as SearchIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Algorithm Implementations (Placeholders - These need actual logic)
import { bubbleSort, getBubbleSortSteps } from "@/lib/algorithms/sorting/bubbleSort";
import { selectionSort, getSelectionSortSteps } from "@/lib/algorithms/sorting/selectionSort";
import { insertionSort, getInsertionSortSteps } from "@/lib/algorithms/sorting/insertionSort";
import { mergeSort, getMergeSortSteps } from "@/lib/algorithms/sorting/mergeSort";
import { quickSort, getQuickSortSteps } from "@/lib/algorithms/sorting/quickSort";
import { linearSearch, getLinearSearchSteps } from "@/lib/algorithms/searching/linearSearch";
import { binarySearch, getBinarySearchSteps } from "@/lib/algorithms/searching/binarySearch";

type AlgorithmStep = {
  array: number[];
  highlight?: number[]; // Indices to highlight (e.g., comparison)
  pivot?: number; // For algorithms like Quick Sort
  sortedIndices?: number[]; // Indices considered sorted
  target?: number; // For searching algorithms
  foundIndex?: number; // Index where target is found
  message: string; // Explanation for the current step
};

interface AlgorithmVisualizerProps {
  algorithmId: string;
  category: string;
}

const MAX_ARRAY_SIZE = 50;
const MIN_ARRAY_SIZE = 5;
const DEFAULT_ARRAY_SIZE = 15;
const MIN_SPEED = 50; // ms
const MAX_SPEED = 1000; // ms
const DEFAULT_SPEED = 300; // ms

const ALGORITHM_MAP: Record<string, Record<string, Function>> = {
    sort: {
        'bubble-sort': getBubbleSortSteps,
        'selection-sort': getSelectionSortSteps,
        'insertion-sort': getInsertionSortSteps,
        'merge-sort': getMergeSortSteps,
        'quick-sort': getQuickSortSteps,
    },
    search: {
        'linear-search': getLinearSearchSteps,
        'binary-search': getBinarySearchSteps,
    },
};

export default function AlgorithmVisualizer({ algorithmId, category }: AlgorithmVisualizerProps) {
  const [array, setArray] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [targetValue, setTargetValue] = useState<string>(""); // For search
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const [isGenerated, setIsGenerated] = useState<boolean>(false); // Track if array is from input or generated
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const generateRandomArray = useCallback((size: number = DEFAULT_ARRAY_SIZE) => {
    const newArray = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1);
    setArray(newArray);
    setInputValue(newArray.join(", "));
    resetVisualization();
    setIsGenerated(true);
  }, []);

  useEffect(() => {
    generateRandomArray();
    // Cleanup on component unmount or when algorithm changes
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [algorithmId, category, generateRandomArray]); // Re-generate array when algorithm changes

  const parseInput = (input: string): number[] | null => {
    try {
      const parsedArray = input
        .split(",")
        .map((s) => s.trim())
        .filter(s => s !== '')
        .map((s) => {
          const num = parseInt(s, 10);
          if (isNaN(num)) {
            throw new Error(`Invalid number: "${s}"`);
          }
          if (num < 1 || num > 100) {
            throw new Error(`Number out of range (1-100): ${num}`);
          }
          return num;
        });

      if (parsedArray.length < MIN_ARRAY_SIZE || parsedArray.length > MAX_ARRAY_SIZE) {
        throw new Error(`Array size must be between ${MIN_ARRAY_SIZE} and ${MAX_ARRAY_SIZE}.`);
      }
      return parsedArray;
    } catch (error: any) {
      toast({
        title: "Invalid Input",
        description: error.message || "Please enter comma-separated numbers between 1 and 100.",
        variant: "destructive",
      });
      return null;
    }
  };

   const parseTarget = (input: string): number | null => {
    try {
      const num = parseInt(input, 10);
      if (isNaN(num)) {
        throw new Error(`Invalid target number: "${input}"`);
      }
      if (num < 1 || num > 100) {
        throw new Error(`Target number must be between 1 and 100.`);
      }
      return num;
    } catch (error: any) {
      toast({
        title: "Invalid Target",
        description: error.message || "Please enter a number between 1 and 100 for the target.",
        variant: "destructive",
      });
      return null;
    }
  };


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    setIsGenerated(false); // Mark as user input
  };

   const handleTargetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTargetValue(event.target.value);
  };

  const handleSetArray = () => {
    const parsedArray = parseInput(inputValue);
    if (parsedArray) {
      // If it's binary search, sort the array first
       if (algorithmId === 'binary-search' && category === 'search') {
         parsedArray.sort((a, b) => a - b);
         setInputValue(parsedArray.join(", ")); // Update input field with sorted array
         toast({
           title: "Array Sorted",
           description: "Input array has been sorted as Binary Search requires a sorted array.",
         });
       }
      setArray(parsedArray);
      resetVisualization();
    }
  };


  const resetVisualization = () => {
    setIsPlaying(false);
    setSteps([]);
    setCurrentStepIndex(0);
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = null;
    drawArray(array); // Draw the initial/reset array state
  };

  const startVisualization = () => {
     if (array.length === 0) {
       toast({ title: "Error", description: "Please provide an array first.", variant: "destructive" });
       return;
     }

     const algorithmFunction = ALGORITHM_MAP[category]?.[algorithmId];
     if (!algorithmFunction) {
       toast({ title: "Error", description: "Algorithm implementation not found.", variant: "destructive" });
       return;
     }

     let newSteps: AlgorithmStep[];
     if (category === 'search') {
       const targetNum = parseTarget(targetValue);
       if (targetNum === null) return; // Error handled in parseTarget

       // Ensure array is sorted for binary search
       let currentArray = [...array];
       if (algorithmId === 'binary-search') {
          currentArray.sort((a,b) => a - b);
          if (!isGenerated && JSON.stringify(array) !== JSON.stringify(currentArray)) {
            toast({
              title: "Array Sorted",
              description: "Input array has been sorted for Binary Search.",
            });
            setArray(currentArray); // Update state if user input needed sorting
            setInputValue(currentArray.join(", "));
          }
       }
       newSteps = algorithmFunction(currentArray, targetNum);
     } else {
       newSteps = algorithmFunction([...array]); // Pass a copy for sorting
     }

     setSteps(newSteps);
     setCurrentStepIndex(0);
     setIsPlaying(true);
  };


  const drawArray = useCallback((currentArrayState: number[], highlight: number[] = [], pivot?: number, sortedIndices: number[] = [], target?: number, foundIndex?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const n = currentArrayState.length;
    if (n === 0) return;

    const spacing = 5;
    const totalSpacing = (n + 1) * spacing;
    const barWidth = (width - totalSpacing) / n;
    const maxVal = Math.max(...currentArrayState, 1); // Avoid division by zero if array is empty or all zeros


    currentArrayState.forEach((value, index) => {
      const barHeight = (value / maxVal) * (height * 0.85); // Use 85% of height for bars
      const x = spacing + index * (barWidth + spacing);
      const y = height - barHeight - 20; // Leave space at bottom for numbers

      // Determine bar color
      if (foundIndex === index) {
         ctx.fillStyle = "#FF5722"; // Orange for found item (accent)
      } else if (target === value && category === 'search') {
          ctx.fillStyle = "#FFC107"; // Yellow if it's the target but not yet confirmed 'found'
      } else if (sortedIndices.includes(index)) {
        ctx.fillStyle = "#009688"; // Teal for sorted elements (secondary)
      } else if (highlight.includes(index)) {
        ctx.fillStyle = "#FF5722"; // Orange for highlighted elements (accent)
      } else if (pivot === index) {
          ctx.fillStyle = "#E91E63"; // Pink for pivot
      }
      else {
        ctx.fillStyle = "#673AB7"; // Default Purple (primary)
      }

      // Draw the bar
      ctx.fillRect(x, y, barWidth, barHeight);

       // Draw the number below the bar if space allows
      if (barWidth > 15) { // Only draw numbers if bars are wide enough
          ctx.fillStyle = "#333"; // Dark text color
          ctx.textAlign = "center";
          ctx.font = "12px Arial";
          // Adjust text position based on bar width
          const textX = x + barWidth / 2;
          const textY = height - 5; // Position numbers at the bottom
          ctx.fillText(value.toString(), textX, textY);
      }
    });
  }, [category]); // Dependency on category for search-specific highlighting


 useEffect(() => {
    if (steps.length > 0 && currentStepIndex < steps.length) {
      const { array: stepArray, highlight, pivot, sortedIndices, target, foundIndex } = steps[currentStepIndex];
      drawArray(stepArray, highlight, pivot, sortedIndices, target, foundIndex);
    } else if (array.length > 0 && steps.length === 0) {
        // Draw initial state if array exists but no steps yet
        drawArray(array);
    }
 }, [currentStepIndex, steps, drawArray, array]); // Redraw when step or array changes


   useEffect(() => {
    if (isPlaying && currentStepIndex < steps.length) {
      timeoutId.current = setTimeout(() => {
        setCurrentStepIndex((prevIndex) => prevIndex + 1);
      }, speed);
    } else if (isPlaying && currentStepIndex >= steps.length) {
        setIsPlaying(false); // Stop playing when finished
         toast({ title: "Visualization Complete", description: steps[steps.length -1]?.message || "Finished." });
    }

    // Cleanup timeout on pause, finish, or speed change
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps, speed, toast]);


  const handlePlayPause = () => {
    if (steps.length === 0) {
        startVisualization(); // Start if no steps exist yet
    } else {
       setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
     // Reset to the originally generated or input array
    const originalArray = parseInput(inputValue);
    if(originalArray) {
        setArray(originalArray);
        resetVisualization();
        drawArray(originalArray); // Explicitly draw the reset state
    } else {
        // Fallback to generating a new random array if input parse fails
        generateRandomArray(DEFAULT_ARRAY_SIZE);
    }

  };

  const handleSpeedChange = (value: number[]) => {
    // Speed slider gives value, timeout uses delay. Invert the relationship.
    setSpeed(MAX_SPEED + MIN_SPEED - value[0]);
  };

  const currentExplanation = steps[currentStepIndex]?.message || (steps.length > 0 ? steps[steps.length -1]?.message : "Ready to visualize.");


  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Controls Column */}
      <Card className="w-full lg:w-1/4">
        <CardHeader>
          <CardTitle>Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="array-input">Array (comma-separated, {MIN_ARRAY_SIZE}-{MAX_ARRAY_SIZE} elements, 1-100)</Label>
            <div className="flex gap-2">
              <Input
                id="array-input"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="e.g., 5, 3, 8, 1, 9"
                className="flex-grow"
              />
               <Button onClick={handleSetArray} variant="secondary" size="sm">Set</Button>
            </div>
             <Button onClick={() => generateRandomArray(array.length || DEFAULT_ARRAY_SIZE)} variant="outline" size="sm" className="w-full">
               <ShuffleIcon className="mr-2 h-4 w-4" /> Randomize Array
            </Button>
          </div>

         {category === 'search' && (
            <div className="space-y-2">
                <Label htmlFor="target-input">Target Value (1-100)</Label>
                <div className="flex gap-2">
                <Input
                    id="target-input"
                    type="number"
                    value={targetValue}
                    onChange={handleTargetChange}
                    placeholder="e.g., 7"
                    min="1"
                    max="100"
                />
                 {algorithmId === 'binary-search' && (
                    <span className="text-xs text-muted-foreground self-center">(Array must be sorted)</span>
                 )}
                </div>
            </div>
          )}


          <div className="space-y-2">
            <Label htmlFor="speed-slider">Speed</Label>
            <Slider
              id="speed-slider"
              min={MIN_SPEED}
              max={MAX_SPEED}
              step={10}
               // Invert value for display: faster means higher slider value
              value={[MAX_SPEED + MIN_SPEED - speed]}
              onValueChange={handleSpeedChange}
              className="my-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          <div className="flex justify-center space-x-2 mt-4">
             <Button onClick={handlePlayPause} variant="primary" size="icon" aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
            </Button>
            <Button onClick={handleReset} variant="outline" size="icon" aria-label="Reset">
                 <RotateCcw className="h-5 w-5"/>
            </Button>
             {/* <Button onClick={() => { if (isPlaying) setSpeed(Math.max(MIN_SPEED, speed / 1.5))}} variant="outline" size="icon" disabled={!isPlaying} aria-label="Fast Forward">
                 <FastForward className="h-5 w-5"/>
            </Button> */}
          </div>
        </CardContent>
      </Card>

      {/* Visualization Column */}
      <div className="flex-grow flex flex-col gap-4">
         <Card className="flex-grow">
            <CardHeader>
                <CardTitle>Visualization</CardTitle>
                <CardDescription className={cn("transition-opacity duration-300", steps.length > 0 ? 'opacity-100' : 'opacity-50')}>
                    {currentExplanation}
                </CardDescription>
            </CardHeader>
            <CardContent className="aspect-[2/1] p-0 overflow-hidden"> {/* Maintain aspect ratio */}
                 <canvas
                    ref={canvasRef}
                    width="800" // Intrinsic width
                    height="400" // Intrinsic height
                    className="w-full h-full bg-muted/30 rounded-b-lg border-t"
                 ></canvas>
            </CardContent>
         </Card>
         {/* Optional: Add a card for algorithm description */}
         {/* <Card> <CardHeader> <CardTitle>Algorithm Details</CardTitle> </CardHeader> <CardContent>...</CardContent> </Card> */}
      </div>
    </div>
  );
}
