import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlagTriangleRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <FlagTriangleRight className="h-10 w-10 text-red-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-slate-900">Out of Bounds!</h1>
            <p className="text-slate-500">
              We couldn't find the page you were looking for. 
              Take a penalty drop and return to the fairway.
            </p>
          </div>

          <Link href="/">
            <Button className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90">
              Return to Leaderboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
