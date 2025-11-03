import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Lock, AlertCircle, Loader2 } from "lucide-react";
import ShootoutCard from "@/components/ShootoutCard";
import CreateShootoutDrawer from "@/components/CreateShootoutDrawer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useListShootouts, useGetShootout, useGetKicks } from "@/hooks/useAuroraContract";
import { formatEther } from "viem";

type ShootoutStatus = "OPEN" | "LOCKED" | "EXPOSURE" | "SETTLED";

const ShootoutItem = ({ shootoutId }: { shootoutId: string }) => {
  const { data: shootout } = useGetShootout(shootoutId);
  const { data: kicks } = useGetKicks(shootoutId);

  if (!shootout) return null;

  const [entryFee, lockTime, prizePool, cancelled, settled, pushAll, winnerCount] = shootout;

  if (cancelled) return null;

  const now = Math.floor(Date.now() / 1000);
  const lockTimeNum = Number(lockTime);

  let status: ShootoutStatus = "OPEN";
  let timeRemaining = "";

  if (settled) {
    status = "SETTLED";
    timeRemaining = "Settled";
  } else if (lockTimeNum <= now) {
    status = "EXPOSURE";
    timeRemaining = "Revealing";
  } else if (lockTimeNum - now < 3600) {
    status = "LOCKED";
    timeRemaining = "Locked";
  } else {
    const hoursRemaining = Math.floor((lockTimeNum - now) / 3600);
    const minutesRemaining = Math.floor(((lockTimeNum - now) % 3600) / 60);
    timeRemaining = `${hoursRemaining}h ${minutesRemaining}m`;
  }

  const kicksCount = kicks && kicks[0] ? kicks[0].length : 0;

  return (
    <ShootoutCard
      id={shootoutId}
      name={`Shootout ${shootoutId}`}
      kicksCount={kicksCount}
      entryFee={formatEther(entryFee)}
      prizePool={formatEther(prizePool)}
      participants={Number(winnerCount)}
      timeRemaining={timeRemaining}
      status={status}
    />
  );
};

const ShootoutHall = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: shootoutIds, isLoading, refetch } = useListShootouts();

  const handleCreateSuccess = () => {
    // Refetch shootout list after successful creation
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!shootoutIds || shootoutIds.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No shootouts yet</h3>
          <p className="text-muted-foreground mb-6">Be the first to create a shootout</p>
          <CreateShootoutDrawer onSuccess={handleCreateSuccess}>
            <Button variant="goal">
              <Plus className="h-5 w-5" />
              Create Shootout
            </Button>
          </CreateShootoutDrawer>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Banner */}
      <Alert className="border-goal/30 bg-goal/10">
        <Lock className="h-4 w-4 text-goal" />
        <AlertDescription className="text-sm">
          <span className="font-semibold text-goal">100% Fair & Transparent:</span> All predictions are encrypted on-chain. 
          Settlement is triggered by verifiable random numbers. No admin intervention needed.
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Shootout Hall</h1>
          <p className="text-muted-foreground">Join active penalty shootouts or create your own</p>
        </div>
        <CreateShootoutDrawer onSuccess={handleCreateSuccess}>
          <Button variant="goal" size="lg">
            <Plus className="h-5 w-5" />
            Create Shootout
          </Button>
        </CreateShootoutDrawer>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shootouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card/50 border-border/50">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="LOCKED">Locked</SelectItem>
            <SelectItem value="EXPOSURE">Revealing</SelectItem>
            <SelectItem value="SETTLED">Settled</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-[200px] bg-card/50 border-border/50">
            <SelectValue placeholder="Kicks count" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Kicks</SelectItem>
            <SelectItem value="5">5 Kicks</SelectItem>
            <SelectItem value="6">6 Kicks</SelectItem>
            <SelectItem value="7">7 Kicks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shootouts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shootoutIds.map((shootoutId) => (
          <ShootoutItem key={shootoutId} shootoutId={shootoutId} />
        ))}
      </div>
    </div>
  );
};

export default ShootoutHall;
