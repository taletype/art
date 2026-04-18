import { createWallet } from "thirdweb/wallets";

export function getThirdwebWalletOptions() {
  return [
    createWallet("app.phantom"),
    createWallet("app.backpack"),
    createWallet("ag.jup"),
  ];
}
