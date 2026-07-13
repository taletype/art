const retiredMintListMessage =
  "The server-side /api/mint-list flow is retired. Use Seller Hub wallet-signed minting and marketplace listing instead.";

console.error(retiredMintListMessage);
console.error("Open /seller or /submit locally after running npm run dev.");
process.exitCode = 1;
