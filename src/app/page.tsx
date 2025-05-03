
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shuffle, Search, Share2, MousePointerClick } from 'lucide-react'; // Added Share2 for Graph icon

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 text-center px-4"> {/* Added padding */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"> {/* Responsive text size */}
        Welcome to <span className="text-primary">AlgoVision</span>
      </h1>
      <p className="max-w-xl sm:max-w-2xl text-base sm:text-lg text-muted-foreground"> {/* Responsive text size and max-width */}
        Explore and understand fundamental sorting, searching, and graph algorithms (like Minimum Spanning Trees) through interactive visualizations. See how algorithms work step-by-step.
      </p>

      <Card className="w-full max-w-md sm:max-w-lg lg:max-w-xl"> {/* Responsive max-width */}
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-xl sm:text-2xl"> {/* Responsive text size */}
            <MousePointerClick className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" /> Get Started
          </CardTitle>
          <CardDescription className="text-sm sm:text-base"> {/* Responsive text size */}
            Select an algorithm from the dropdown menu in the header to begin visualizing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row flex-wrap justify-around items-center pt-4 gap-6 sm:gap-8"> {/* Adjusted flex direction and gap */}
           <div className="flex flex-col items-center space-y-1 text-center min-w-[100px]"> {/* Reduced min-width slightly */}
             <Shuffle className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
             <span className="text-sm font-medium">Sorting Algorithms</span>
           </div>
           <div className="flex flex-col items-center space-y-1 text-center min-w-[100px]">
             <Search className="h-8 w-8 sm:h-10 sm:w-10 text-accent" />
             <span className="text-sm font-medium">Searching Algorithms</span>
           </div>
           <div className="flex flex-col items-center space-y-1 text-center min-w-[100px]">
             <Share2 className="h-8 w-8 sm:h-10 sm:w-10 text-secondary" />
             <span className="text-sm font-medium">Graph Algorithms</span>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

    