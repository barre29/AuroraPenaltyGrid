import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft, Clock, Trophy, Lock, Target,
  TrendingUp, AlertCircle, CheckCircle, Loader2
} from "lucide-react";
import { useGetShootout, useGetKicks, useEnterShootout } from "@/hooks/useAuroraContract";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { initializeFHE, encryptWeight, isFheReady } from "@/lib/fhe";
import { AURORA_PENALTY_GRID_ADDRESS } from "@/config/contracts";
import { toast } from "sonner";

const ShootoutDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [fheReady, setFheReady] = useState(false);
  const { data: shootout, isLoading } = useGetShootout(id || "");
  const { data: kicks } = useGetKicks(id || "");
  const { enterShootout, isPending, isConfirming, isSuccess } = useEnterShootout();

  const [predictions, setPredictions] = useState<Record<number, number>>({});
  const [weight, setWeight] = useState<number>(50);

  useEffect(() => {
    if (!isConnected) return;
    console.log("[ShootoutDetail] Wallet connected:", address);
    if (!isFheReady()) {
      console.log("[ShootoutDetail] FHE not ready, initializing...");
      initializeFHE().then(() => setFheReady(true)).catch((error) => console.error("[ShootoutDetail] FHE init error:", error));
    } else {
      console.log("[ShootoutDetail] FHE already ready.");
      setFheReady(true);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (isSuccess) {
      toast.success("Successfully entered shootout!");
      navigate("/my-predictions");
    }
  }, [isSuccess, navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!shootout || !id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="border-save/30 bg-save/10">
          <AlertCircle className="h-4 w-4 text-save" />
          <AlertDescription>Shootout not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const [
    entryFee,
    lockTime,
    prizePool,
    cancelled,
    settled
  ] = shootout as [bigint, bigint, bigint, boolean, boolean, boolean, bigint];

  // Check if kicks data is valid
  if (!kicks || !Array.isArray(kicks) || kicks.length === 0 || !kicks[0] || kicks[0].length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="border-save/30 bg-save/10">
          <AlertCircle className="h-4 w-4 text-save" />
          <AlertDescription>No kicks data available for this shootout</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (cancelled || settled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="border-save/30 bg-save/10">
          <AlertCircle className="h-4 w-4 text-save" />
          <AlertDescription>
            This shootout is {cancelled ? "cancelled" : "settled"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const kickLabels = (kicks[0] as string[]) ?? [];

  const handlePredictionChange = (kickIndex: number, value: number) => {
    setPredictions((prev) => ({ ...prev, [kickIndex]: value }));
  };
  const allPredictionsMade = Object.keys(predictions).length === kickLabels.length;

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!isFheReady()) {
      toast.error("FHE SDK not ready. Please wait...");
      return;
    }

    try {
      const picks = kickLabels.map((_, index) => predictions[index] || 0);
      const { handle, proof } = await encryptWeight(
        BigInt(weight),
        AURORA_PENALTY_GRID_ADDRESS,
        address
      );

      await enterShootout(id, picks, handle, proof, entryFee);
    } catch (error) {
      console.error("Failed to enter shootout:", error);
      toast.error("Failed to enter shootout");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Back to Hall
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Shootout {id}</h1>
            <p className="text-muted-foreground">{kickLabels.length} Penalty Kicks</p>
          </div>
          <Badge className="bg-goal text-goal-foreground">OPEN</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Time Remaining</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-save" />
                <p className="text-2xl font-bold">
                  {Math.max(0, Math.floor((Number(lockTime) - Date.now() / 1000) / 3600))}h
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Prize Pool</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-goal" />
                <p className="text-2xl font-bold text-goal">{formatEther(prizePool)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Entry Fee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{formatEther(entryFee)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Kicks Count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{kickLabels.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Penalty Kicks */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Make Your Predictions</CardTitle>
          <CardDescription>Select Goal (0) or Save (1) for each penalty kick</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {kickLabels.map((kick, index) => (
            <div key={index} className="space-y-4 p-4 rounded-lg border border-border/50 bg-background/30">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Kick {index + 1}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Encrypted
                </div>
              </div>

              {/* Prediction */}
              <div>
                <Label className="mb-3 block text-sm font-medium">Your Prediction</Label>
                <RadioGroup
                  value={predictions[index]?.toString() || ""}
                  onValueChange={(value) => handlePredictionChange(index, parseInt(value))}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="0" id={`goal-${index}`} className="peer sr-only" />
                    <Label
                      htmlFor={`goal-${index}`}
                      className="flex flex-col items-center justify-between rounded-lg border-2 border-goal/30 bg-goal/5 p-4 hover:bg-goal/10 peer-data-[state=checked]:border-goal peer-data-[state=checked]:bg-goal/20 cursor-pointer transition-all"
                    >
                      <Trophy className="h-6 w-6 text-goal mb-2" />
                      <span className="font-semibold text-goal">GOAL</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="1" id={`save-${index}`} className="peer sr-only" />
                    <Label
                      htmlFor={`save-${index}`}
                      className="flex flex-col items-center justify-between rounded-lg border-2 border-save/30 bg-save/5 p-4 hover:bg-save/10 peer-data-[state=checked]:border-save peer-data-[state=checked]:bg-save/20 cursor-pointer transition-all"
                    >
                      <Target className="h-6 w-6 text-save mb-2" />
                      <span className="font-semibold text-save">SAVE</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weight Card */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Confidence Weight</CardTitle>
          <CardDescription>Set your confidence level (1-100)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Weight</Label>
              <span className="text-lg font-bold text-primary">{weight}</span>
            </div>
            <Slider
              value={[weight]}
              onValueChange={(value) => setWeight(value[0])}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Panel */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Validation alerts */}
            {!allPredictionsMade && (
              <Alert className="border-save/30 bg-save/10">
                <AlertCircle className="h-4 w-4 text-save" />
                <AlertDescription className="text-sm">
                  Please make predictions for all {kickLabels.length} penalty kicks
                </AlertDescription>
              </Alert>
            )}

            {!isConnected && (
              <Alert className="border-save/30 bg-save/10">
                <AlertCircle className="h-4 w-4 text-save" />
                <AlertDescription className="text-sm">
                  Please connect your wallet to submit predictions
                </AlertDescription>
              </Alert>
            )}

            {/* Submit button */}
            <Button
              variant="goal"
              size="lg"
              className="w-full"
              disabled={!allPredictionsMade || !isConnected || isPending || isConfirming}
              onClick={handleSubmit}
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {isPending ? "Encrypting..." : "Confirming..."}
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Submit Predictions ({formatEther(entryFee)} ETH)
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your predictions will be encrypted using FHE and stored on-chain
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShootoutDetail;
