import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AURORA_PENALTY_GRID_ADDRESS, AURORA_PENALTY_GRID_ABI } from "@/config/contracts";
import { toast } from "sonner";
import type { Address } from "viem";
import { useEffect } from "react";

// Read hooks
export const useListShootouts = () => {
  return useReadContract({
    address: AURORA_PENALTY_GRID_ADDRESS,
    abi: AURORA_PENALTY_GRID_ABI,
    functionName: "listReplicaShootouts"
  });
};

export const useGetShootout = (shootoutId: string) => {
  return useReadContract({
    address: AURORA_PENALTY_GRID_ADDRESS,
    abi: AURORA_PENALTY_GRID_ABI,
    functionName: "getReplicaShootout",
    args: [shootoutId]
  });
};

export const useGetKicks = (shootoutId: string) => {
  return useReadContract({
    address: AURORA_PENALTY_GRID_ADDRESS,
    abi: AURORA_PENALTY_GRID_ABI,
    functionName: "getReplicaKicks",
    args: [shootoutId]
  });
};

export const useGetUserPick = (shootoutId: string, userAddress: Address) => {
  return useReadContract({
    address: AURORA_PENALTY_GRID_ADDRESS,
    abi: AURORA_PENALTY_GRID_ABI,
    functionName: "getUserPick",
    args: [shootoutId, userAddress]
  });
};

export const useGetUserWeight = (shootoutId: string, userAddress: Address) => {
  return useReadContract({
    address: AURORA_PENALTY_GRID_ADDRESS,
    abi: AURORA_PENALTY_GRID_ABI,
    functionName: "getUserWeight",
    args: [shootoutId, userAddress]
  });
};

export const useGetWinners = (shootoutId: string) => {
  return useReadContract({
    address: AURORA_PENALTY_GRID_ADDRESS,
    abi: AURORA_PENALTY_GRID_ABI,
    functionName: "getWinners",
    args: [shootoutId]
  });
};

export const useMinEntryFee = () => {
  return useReadContract({
    address: AURORA_PENALTY_GRID_ADDRESS,
    abi: AURORA_PENALTY_GRID_ABI,
    functionName: "MIN_ENTRY_FEE"
  });
};

// Write hooks
export const useEnterShootout = () => {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const enterShootout = async (
    shootoutId: string,
    picks: number[],
    encryptedWeight: `0x${string}`,
    proof: `0x${string}`,
    entryFee: bigint
  ) => {
    try {
      writeContract({
        address: AURORA_PENALTY_GRID_ADDRESS,
        abi: AURORA_PENALTY_GRID_ABI,
        functionName: "enterReplicaShootout",
        args: [shootoutId, picks, encryptedWeight, proof],
        value: entryFee
      });
    } catch (err) {
      toast.error("Failed to enter shootout");
      throw err;
    }
  };

  return { enterShootout, hash, error, isPending, isConfirming, isSuccess };
};

export const useSettleShootout = () => {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const settleShootout = async (shootoutId: string, randomSeed: bigint) => {
    try {
      writeContract({
        address: AURORA_PENALTY_GRID_ADDRESS,
        abi: AURORA_PENALTY_GRID_ABI,
        functionName: "settleReplicaShootout",
        args: [shootoutId, randomSeed]
      });
    } catch (err) {
      toast.error("Failed to settle shootout");
      throw err;
    }
  };

  return { settleShootout, hash, error, isPending, isConfirming, isSuccess };
};

export const useClaimPrize = () => {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claimPrize = async (shootoutId: string) => {
    try {
      writeContract({
        address: AURORA_PENALTY_GRID_ADDRESS,
        abi: AURORA_PENALTY_GRID_ABI,
        functionName: "claimPrize",
        args: [shootoutId]
      });
    } catch (err) {
      toast.error("Failed to claim prize");
      throw err;
    }
  };

  return { claimPrize, hash, error, isPending, isConfirming, isSuccess };
};

export const useGetReplicaEntry = (shootoutId: string, userAddress: Address) => {
  return useReadContract({
    address: AURORA_PENALTY_GRID_ADDRESS,
    abi: AURORA_PENALTY_GRID_ABI,
    functionName: "getReplicaEntry",
    args: [shootoutId, userAddress],
    query: {
      enabled: !!shootoutId && !!userAddress
    }
  });
};

export const useCreateShootout = () => {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createShootout = async (
    shootoutId: string,
    entryFee: bigint,
    duration: number,
    kickLabels: string[]
  ) => {
    try {
      console.log('[useCreateShootout] Creating shootout:', { shootoutId, entryFee, duration, kickLabels });
      writeContract({
        address: AURORA_PENALTY_GRID_ADDRESS,
        abi: AURORA_PENALTY_GRID_ABI,
        functionName: "createReplicaShootout",
        args: [shootoutId, entryFee, BigInt(duration), kickLabels]
      });
    } catch (err) {
      console.error('[useCreateShootout] Error:', err);
      toast.error("Failed to create shootout");
      throw err;
    }
  };

  // Show toast when transaction is submitted
  useEffect(() => {
    if (hash) {
      toast.loading("Transaction submitted...", {
        id: hash,
        description: `View on Etherscan: https://sepolia.etherscan.io/tx/${hash}`,
        duration: 5000,
      });
    }
  }, [hash]);

  // Show success toast when transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success("Shootout created successfully!", {
        id: hash,
        description: `View on Etherscan: https://sepolia.etherscan.io/tx/${hash}`,
        duration: 5000,
      });
    }
  }, [isSuccess, hash]);

  return { createShootout, hash, error, isPending, isConfirming, isSuccess };
};
