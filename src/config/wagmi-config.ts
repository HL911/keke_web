import { createConfig, http } from "wagmi";
import { mainnet, sepolia, polygon, bsc, foundry } from "wagmi/chains";

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, bsc, foundry],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
    [foundry.id]: http(),
  },
});
