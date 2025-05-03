import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shuffle, Search, MousePointerClick } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
        Welcome to <span className="text-primary">AlgoVisualizer</span>
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Explore and understand fundamental sorting and searching algorithms through interactive visualizations. Input your own data and see how the algorithms work step-by-step.
      </p>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <MousePointerClick className="h-6 w-6 text-secondary" /> Get Started
          </CardTitle>
          <CardDescription>
            Select an algorithm from the dropdown menu in the header to begin visualizing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-around pt-4">
           <div className="flex flex-col items-center space-y-2">
             <Shuffle className="h-10 w-10 text-primary" />
             <span className="font-medium">Sorting Algorithms</span>
           </div>
           <div className="flex flex-col items-center space-y-2">
             <Search className="h-10 w-10 text-accent" />
             <span className="font-medium">Searching Algorithms</span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
