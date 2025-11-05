import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Eye, Gift, AlertCircle, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { useListShootouts, useGetShootout, useGetKicks, useGetReplicaEntry, useClaimPrize } from "@/hooks/useAuroraContract";
import { formatEther } from "viem";
import { toast } from "sonner";

type ShootoutStatus = "OPEN" | "LOCKED" | "EXPOSURE" | "SETTLED" | "CANCELLED" | "PUSH";

const statusConfig = {
  OPEN: { color: "bg-goal text-goal-foreground", label: "Open" },
  LOCKED: { color: "bg-yellow-500 text-yellow-950", label: "Locked" },
  EXPOSURE: { color: "bg-aurora-purple text-foreground", label: "Revealing" },
  SETTLED: { color: "bg-muted text-muted-foreground", label: "Settled" },
  CANCELLED: { color: "bg-destructive text-destructive-foreground", label: "Cancelled" },
  PUSH: { color: "bg-aurora-orange text-foreground", label: "Push" },
};

const PredictionRow = ({ shootoutId, userAddress }: { shootoutId: string; userAddress: string }) => {
  const { data: shootout } = useGetShootout(shootoutId);
  const { data: kicks } = useGetKicks(shootoutId);
  const { data: userEntry } = useGetReplicaEntry(shootoutId, userAddress as `0x${string}`);
  const { claimPrize, isPending } = useClaimPrize();

  if (!shootout || !kicks || !userEntry) return null;

  const [entryFee, lockTime, prizePool, cancelled, settled, pushAll] = shootout;
  const [exists, claimed, picks] = userEntry || [false, false, []];
  const hasPrediction = exists;

  if (!hasPrediction) return null;

  const now = Math.floor(Date.now() / 1000);
  const lockTimeNum = Number(lockTime);

  let status: ShootoutStatus = "OPEN";
  if (cancelled) status = "CANCELLED";
  else if (settled) status = pushAll ? "PUSH" : "SETTLED";
  else if (lockTimeNum <= now) status = "EXPOSURE";
  else if (lockTimeNum - now < 3600) status = "LOCKED";

  const handleClaim = async () => {
    try {
      await claimPrize(shootoutId);
      toast.success("Prize claimed successfully!");
    } catch (error) {
      console.error("Failed to claim prize:", error);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link to={`/shootout/${shootoutId}`} className="hover:text-primary transition-colors">
          Shootout {shootoutId}
        </Link>
      </TableCell>
      <TableCell className="text-center">{kicks[0] ? kicks[0].length : 0}</TableCell>
      <TableCell className="text-center">
        <Badge className={statusConfig[status].color}>{statusConfig[status].label}</Badge>
      </TableCell>
      <TableCell className="text-center">
        {settled && !pushAll && <span className="text-goal font-semibold">Claimable</span>}
        {pushAll && <span className="text-aurora-orange font-semibold">Refund</span>}
        {!settled && <span className="text-muted-foreground">-</span>}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/shootout/${shootoutId}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {(settled || pushAll) && (
            <Button variant="goal" size="sm" onClick={handleClaim} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
              Claim
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

const MyPredictions = () => {
  const { address, isConnected } = useAccount();
  const { data: shootoutIds, isLoading } = useListShootouts();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Wallet not connected</h3>
          <p className="text-muted-foreground mb-6">Please connect your wallet to view your predictions</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Predictions</h1>
          <p className="text-muted-foreground">View and manage your shootout entries</p>
        </div>
        <Button variant="goal" asChild>
          <Link to="/">
            <Trophy className="h-5 w-5" />
            Join Shootouts
          </Link>
        </Button>
      </div>

      {/* Predictions Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Your Entries</CardTitle>
          <CardDescription>All your shootout predictions and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {shootoutIds && shootoutIds.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shootout</TableHead>
                    <TableHead className="text-center">Kicks</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Prize/Refund</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shootoutIds.map((shootoutId) => (
                    <PredictionRow key={shootoutId} shootoutId={shootoutId} userAddress={address || ""} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No predictions yet</h3>
              <p className="text-muted-foreground mb-6">Join a shootout to start making predictions</p>
              <Button variant="goal" asChild>
                <Link to="/">
                  <Trophy className="h-5 w-5" />
                  Browse Shootouts
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyPredictions;
