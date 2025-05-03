import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shuffle, Search, Share2, MousePointerClick } from 'lucide-react'; // Added Share2 for Graph icon

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
        Welcome to <span className="text-primary">AlgoVision</span>
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Explore and understand fundamental sorting, searching, and graph algorithms (like Minimum Spanning Trees) through interactive visualizations. See how algorithms work step-by-step.
      </p>

      <Card className="w-full max-w-lg"> {/* Increased max-width slightly */}
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <MousePointerClick className="h-6 w-6 text-secondary" /> Get Started
          </CardTitle>
          <CardDescription>
            Select an algorithm from the dropdown menu in the header to begin visualizing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-around pt-4 gap-4"> {/* Added flex-wrap and gap */}
           <div className="flex flex-col items-center space-y-2 min-w-[120px]"> {/* Added min-width */}
             <Shuffle className="h-10 w-10 text-primary" />
             <span className="font-medium">Sorting Algorithms</span>
           </div>
           <div className="flex flex-col items-center space-y-2 min-w-[120px]"> {/* Added min-width */}
             <Search className="h-10 w-10 text-accent" />
             <span className="font-medium">Searching Algorithms</span>
           </div>
           <div className="flex flex-col items-center space-y-2 min-w-[120px]"> {/* Added min-width */}
             <Share2 className="h-10 w-10 text-secondary" /> {/* Using Share2 for Graph */}
             <span className="font-medium">Graph Algorithms</span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

