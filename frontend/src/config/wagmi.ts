import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Aurora Penalty Grid",
  projectId: "YOUR_PROJECT_ID", // Get from https://cloud.walletconnect.com
  chains: [sepolia],
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com")
  },
  ssr: false
});
