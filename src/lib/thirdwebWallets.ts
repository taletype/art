import { createWallet } from "thirdweb/wallets";

export function getThirdwebWalletOptions() {
  return [
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
  ];
}
