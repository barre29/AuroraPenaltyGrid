import type { Address } from "viem";

const defaultAddress = "0xe2F42146646CBe30E2Cbeab4A5F9D888E22AC67e";
const envAddress = import.meta.env.VITE_AURORA_PENALTY_GRID_ADDRESS;

export const AURORA_PENALTY_GRID_ADDRESS: Address = (envAddress || defaultAddress) as Address;

export const AURORA_PENALTY_GRID_ABI = [
  // Constants
  {
    type: "function",
    name: "MIN_ENTRY_FEE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "MIN_KICKS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "MAX_KICKS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },

  // Read functions
  {
    type: "function",
    name: "listReplicaShootouts",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string[]" }]
  },
  {
    type: "function",
    name: "getReplicaShootout",
    stateMutability: "view",
    inputs: [{ name: "shootoutId", type: "string" }],
    outputs: [
      { name: "entryFee", type: "uint256" },
      { name: "lockTime", type: "uint256" },
      { name: "prizePool", type: "uint256" },
      { name: "cancelled", type: "bool" },
      { name: "settled", type: "bool" },
      { name: "pushAll", type: "bool" },
      { name: "winnerCount", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "getReplicaKicks",
    stateMutability: "view",
    inputs: [{ name: "shootoutId", type: "string" }],
    outputs: [
      { name: "labels", type: "string[]" },
      { name: "picksGoal", type: "uint256[]" },
      { name: "picksSave", type: "uint256[]" }
    ]
  },
  {
    type: "function",
    name: "getReplicaResults",
    stateMutability: "view",
    inputs: [{ name: "shootoutId", type: "string" }],
    outputs: [{ name: "", type: "uint8[]" }]
  },
  {
    type: "function",
    name: "getReplicaEntry",
    stateMutability: "view",
    inputs: [
      { name: "shootoutId", type: "string" },
      { name: "player", type: "address" }
    ],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "claimed", type: "bool" },
      { name: "picks", type: "uint8[]" }
    ]
  },

  // Write functions
  {
    type: "function",
    name: "createReplicaShootout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shootoutId", type: "string" },
      { name: "entryFee", type: "uint256" },
      { name: "duration", type: "uint256" },
      { name: "kickLabels", type: "string[]" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "enterReplicaShootout",
    stateMutability: "payable",
    inputs: [
      { name: "shootoutId", type: "string" },
      { name: "picks", type: "uint8[]" },
      { name: "encryptedWeight", type: "bytes32" },
      { name: "proof", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "adjustReplicaEntry",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shootoutId", type: "string" },
      { name: "newPicks", type: "uint8[]" },
      { name: "newEncryptedWeight", type: "bytes32" },
      { name: "proof", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "settleReplicaShootout",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shootoutId", type: "string" },
      { name: "randomSeed", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "cancelReplicaShootout",
    stateMutability: "nonpayable",
    inputs: [{ name: "shootoutId", type: "string" }],
    outputs: []
  },
  {
    type: "function",
    name: "claimReplicaPrize",
    stateMutability: "nonpayable",
    inputs: [{ name: "shootoutId", type: "string" }],
    outputs: []
  },
  {
    type: "function",
    name: "claimReplicaRefund",
    stateMutability: "nonpayable",
    inputs: [{ name: "shootoutId", type: "string" }],
    outputs: []
  },

  // Events
  {
    type: "event",
    name: "ShootoutCreated",
    inputs: [
      { name: "shootoutId", type: "string", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "kickCount", type: "uint8", indexed: false },
      { name: "lockTime", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "EntrySubmitted",
    inputs: [
      { name: "shootoutId", type: "string", indexed: true },
      { name: "player", type: "address", indexed: true }
    ]
  },
  {
    type: "event",
    name: "ShootoutSettled",
    inputs: [
      { name: "shootoutId", type: "string", indexed: true },
      { name: "pushAll", type: "bool", indexed: false },
      { name: "winnerCount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "PrizeClaimed",
    inputs: [
      { name: "shootoutId", type: "string", indexed: true },
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  }
] as const;
