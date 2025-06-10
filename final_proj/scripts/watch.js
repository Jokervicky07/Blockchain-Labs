require("dotenv").config();
const { ethers } = require("ethers");

/* -------- env vars -------- */
const {
  PRIVATE_KEY,
  SECOND_PRIVATE_KEY, 
  INFURA_API_KEY,
  SWAP_ID,
  SEPOLIA_HTLC,
  ZIRCUIT_HTLC
} = process.env;

/* -------- RPC endpoints -------- */
const RPC = {
  sepolia: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
  zircuit: "https://garfield-testnet.zircuit.com"
};

/* -------- providers & wallets -------- */
const providerSep = new ethers.JsonRpcProvider(RPC.sepolia);
const providerZir = new ethers.JsonRpcProvider(RPC.zircuit);

const walletSep = new ethers.Wallet(PRIVATE_KEY, providerSep);
const walletZir = new ethers.Wallet(SECOND_PRIVATE_KEY, providerZir);

/* -------- contract instances -------- */
const htlcSep = new ethers.Contract(
  process.env.SEPOLIA_HTLC,
  ["event Withdrawn(bytes32 indexed id, bytes32 preimage)",
   "function swaps(bytes32) view returns (uint256,bytes32,uint256,address,address,uint8,address,bool,bool,bytes32)"],
  walletSep
);

const htlcZir = new ethers.Contract(
  process.env.ZIRCUIT_HTLC,
  ["function withdraw(bytes32 id, bytes32 preimage)",
   "function swaps(bytes32) view returns (uint256,bytes32,uint256,address,address,uint8,address,bool,bool,bytes32)"],
  walletZir
);


/* -------- one-shot listener -------- */
/* htlcSep.once(htlcSep.filters.Withdrawn(SWAP_ID), async (_id, preimage) => {
  console.log("📡 Captured preimage:", preimage);

  try {
    const tx = await htlcZir.withdraw(SWAP_ID, preimage);
    console.log("→ Relayed to Zircuit:", tx.hash);
  } catch (err) {
    console.error("Withdraw on Zircuit failed:", err);
  }

  process.exit(0);
});

console.log("Watcher started, waiting for Withdrawn event on Sepolia…");*/
/* async function relay(preimage) {
  console.log("📡 Captured preimage:", preimage);
  const tx = await htlcZir.withdraw(SWAP_ID, preimage);
  console.log("→ Relayed to Zircuit:", tx.hash);
  process.exit(0);
}

(async () => {
  // monitor past events
  const logs = await htlcSep.queryFilter(
    htlcSep.filters.Withdrawn(SWAP_ID),
    0,
    "latest"
  );
  if (logs.length) {
    return relay(logs[0].args.preimage);
  }

  // ② monitor future events
  console.log("Watcher started, waiting for future Withdrawn …");
  htlcSep.once(
    htlcSep.filters.Withdrawn(SWAP_ID),
    (_id, preimage) => relay(preimage)
  );
})(); */

const swapId   = SWAP_ID;

/* -------- helper: query timelock & setTimeout -------- */
async function scheduleRefund() {
  // read swap info on each chain
  const swapZir = await htlcZir.swaps(swapId);
  const swapSep = await htlcSep.swaps(swapId);

  const now = Math.floor(Date.now() / 1000);

  const tLockZ = Number(swapZir.timelock);
  const tLockS = Number(swapSep.timelock);

  // delay in ms until timeout
  const delayZ = (tLockZ - now) * 1000;
  const delayS = (tLockS - now) * 1000;

  if (delayZ > 0) setTimeout(refundZircuit, delayZ);
  if (delayS > 0) setTimeout(refundSepolia, delayS);
}

async function refundZircuit() {
  try {
    const tx = await htlcZir.refund(swapId);
    console.log("💸 Auto-refund on Zircuit:", tx.hash);
  } catch (e) { console.log("refund Zir fail:", e.reason || e); }
}

async function refundSepolia() {
  try {
    const tx = await htlcSep.refund(swapId);
    console.log("💸 Auto-refund on Sepolia:", tx.hash);
  } catch (e) { console.log("refund Sep fail:", e.reason || e); }
}

/* -------- start logic -------- */
(async () => {
  await scheduleRefund();   // ① schedule auto-refund

  // ② search for past Withdrawn events 
  const logs = await htlcSep.queryFilter(
    htlcSep.filters.Withdrawn(swapId),
    0,
    "latest"
  );
  if (logs.length) {
    return relay(logs[0].args.preimage);
  }

  // ③ monitor future Withdrawn events
  console.log("Watcher started, waiting for Withdrawn on Sepolia …");
  htlcSep.once(
    htlcSep.filters.Withdrawn(swapId),
    (_id, preimage) => relay(preimage)
  );
})();

async function relay(preimage) {
  console.log("📡 Captured preimage:", preimage);
  try {
    const tx = await htlcZir.withdraw(swapId, preimage);
    console.log("→ Relayed to Zircuit:", tx.hash);
  } catch (err) { console.error("relay failed:", err); }
  process.exit(0);
}


