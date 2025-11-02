import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy, Users, Target } from "lucide-react";
import { Link } from "react-router-dom";

type ShootoutStatus = "OPEN" | "LOCKED" | "EXPOSURE" | "SETTLED" | "CANCELLED" | "PUSH";

interface ShootoutCardProps {
  id: string;
  name: string;
  kicksCount: number;
  entryFee: string;
  prizePool: string;
  participants: number;
  timeRemaining: string;
  status: ShootoutStatus;
}

const statusConfig: Record<ShootoutStatus, { color: string; label: string }> = {
  OPEN: { color: "bg-goal text-goal-foreground", label: "Open" },
  LOCKED: { color: "bg-yellow-500 text-yellow-950", label: "Locked" },
  EXPOSURE: { color: "bg-aurora-purple text-foreground", label: "Revealing" },
  SETTLED: { color: "bg-muted text-muted-foreground", label: "Settled" },
  CANCELLED: { color: "bg-destructive text-destructive-foreground", label: "Cancelled" },
  PUSH: { color: "bg-aurora-orange text-foreground", label: "Push" },
};

const ShootoutCard = ({
  id,
  name,
  kicksCount,
  entryFee,
  prizePool,
  participants,
  timeRemaining,
  status,
}: ShootoutCardProps) => {
  const statusStyle = statusConfig[status];

  return (
    <Card className="group hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {name}
            </CardTitle>
            <CardDescription className="text-xs">ID: {id}</CardDescription>
          </div>
          <Badge className={statusStyle.color}>{statusStyle.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Kicks</p>
              <p className="font-semibold">{kicksCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Players</p>
              <p className="font-semibold">{participants}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-goal" />
            <div>
              <p className="text-xs text-muted-foreground">Entry Fee</p>
              <p className="font-semibold">{entryFee}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-save" />
            <div>
              <p className="text-xs text-muted-foreground">Time Left</p>
              <p className="font-semibold">{timeRemaining}</p>
            </div>
          </div>
        </div>

        {/* Prize Pool */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
          <p className="text-2xl font-bold text-primary">{prizePool}</p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link to={`/shootout/${id}`}>View Details</Link>
        </Button>
        {status === "OPEN" && (
          <Button variant="goal" size="sm" className="flex-1" asChild>
            <Link to={`/shootout/${id}`}>Join Now</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ShootoutCard;
