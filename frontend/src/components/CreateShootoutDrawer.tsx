import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, X, Loader2, CheckCircle } from "lucide-react";
import { useCreateShootout } from "@/hooks/useAuroraContract";
import { parseEther } from "viem";
import { toast } from "sonner";

interface CreateShootoutDrawerProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

const CreateShootoutDrawer = ({ children, onSuccess }: CreateShootoutDrawerProps) => {
  const [open, setOpen] = useState(false);
  const [shootoutId, setShootoutId] = useState("");
  const [entryFee, setEntryFee] = useState("0.001");
  const [durationDays, setDurationDays] = useState("7");
  const [kickLabels, setKickLabels] = useState<string[]>(["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"]);
  const [newKickLabel, setNewKickLabel] = useState("");

  const { createShootout, isPending, isConfirming, isSuccess } = useCreateShootout();

  useEffect(() => {
    if (isSuccess) {
      setOpen(false);
      // Reset form
      setShootoutId("");
      setEntryFee("0.001");
      setDurationDays("7");
      setKickLabels(["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"]);
      setNewKickLabel("");
      // Call onSuccess callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [isSuccess, onSuccess]);

  const addKick = () => {
    if (kickLabels.length >= 12) {
      toast.error("Maximum 12 kicks allowed");
      return;
    }
    const label = newKickLabel.trim() || `Kick ${kickLabels.length + 1}`;
    setKickLabels([...kickLabels, label]);
    setNewKickLabel("");
  };

  const removeKick = (index: number) => {
    if (kickLabels.length <= 3) {
      toast.error("Minimum 3 kicks required");
      return;
    }
    setKickLabels(kickLabels.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!shootoutId.trim()) {
      toast.error("Please enter a shootout ID");
      return;
    }

    const feeValue = parseFloat(entryFee);
    if (isNaN(feeValue) || feeValue < 0.0005) {
      toast.error("Entry fee must be at least 0.0005 ETH");
      return;
    }

    const days = parseInt(durationDays);
    if (isNaN(days) || days < 1 || days > 10) {
      toast.error("Duration must be between 1 and 10 days");
      return;
    }

    if (kickLabels.length < 3 || kickLabels.length > 12) {
      toast.error("Must have between 3 and 12 kicks");
      return;
    }

    try {
      const durationSeconds = days * 24 * 60 * 60;
      await createShootout(
        shootoutId.trim(),
        parseEther(entryFee),
        durationSeconds,
        kickLabels
      );
    } catch (error) {
      console.error("Failed to create shootout:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Shootout</SheetTitle>
          <SheetDescription>
            Set up a new penalty shootout prediction market
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Shootout ID */}
          <div className="space-y-2">
            <Label htmlFor="shootoutId">Shootout ID</Label>
            <Input
              id="shootoutId"
              placeholder="e.g. champions-final-2025"
              value={shootoutId}
              onChange={(e) => setShootoutId(e.target.value)}
              disabled={isPending || isConfirming}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this shootout
            </p>
          </div>

          {/* Entry Fee */}
          <div className="space-y-2">
            <Label htmlFor="entryFee">Entry Fee (ETH)</Label>
            <Input
              id="entryFee"
              type="number"
              step="0.0001"
              min="0.0005"
              placeholder="0.001"
              value={entryFee}
              onChange={(e) => setEntryFee(e.target.value)}
              disabled={isPending || isConfirming}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 0.0005 ETH
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (Days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="10"
              placeholder="7"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              disabled={isPending || isConfirming}
            />
            <p className="text-xs text-muted-foreground">
              Between 1 and 10 days
            </p>
          </div>

          {/* Kick Labels */}
          <div className="space-y-2">
            <Label>Penalty Kicks ({kickLabels.length})</Label>
            <div className="space-y-2">
              {kickLabels.map((label, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={label}
                    onChange={(e) => {
                      const newLabels = [...kickLabels];
                      newLabels[index] = e.target.value;
                      setKickLabels(newLabels);
                    }}
                    disabled={isPending || isConfirming}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeKick(index)}
                    disabled={kickLabels.length <= 3 || isPending || isConfirming}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {kickLabels.length < 12 && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New kick label (optional)"
                  value={newKickLabel}
                  onChange={(e) => setNewKickLabel(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKick();
                    }
                  }}
                  disabled={isPending || isConfirming}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addKick}
                  disabled={kickLabels.length >= 12 || isPending || isConfirming}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Between 3 and 12 kicks. Press Enter or click + to add.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            variant="goal"
            className="w-full"
            onClick={handleSubmit}
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {isPending ? "Creating..." : "Confirming..."}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Create Shootout
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateShootoutDrawer;
