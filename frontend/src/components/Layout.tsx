import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, User } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Aurora background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-aurora-cyan/10 rounded-full blur-[100px] animate-aurora-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-aurora-orange/10 rounded-full blur-[100px] animate-aurora-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-aurora-purple/10 rounded-full blur-[100px] animate-aurora-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Trophy className="h-8 w-8 text-primary animate-float" />
                <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/40 transition-all" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Aurora Penalty Grid</h1>
                <p className="text-xs text-muted-foreground">Encrypted Shootout Predictions</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link to="/">
                  <Trophy className="h-4 w-4" />
                  Shootouts
                </Link>
              </Button>
              <Button
                variant={isActive("/my-predictions") ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link to="/my-predictions">
                  <User className="h-4 w-4" />
                  My Predictions
                </Link>
              </Button>
              <div className="ml-2">
                <ConnectButton />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative">
        {children}
      </main>
    </div>
  );
};

export default Layout;
