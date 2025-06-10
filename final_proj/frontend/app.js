/* global ethers */

// --- 全局变量和不直接依赖 DOM 的函数定义 ---
let provider;
let signer;
let currentChainId;
let lastCreatedSwap = {};

// HTML 元素的引用将在 DOMContentLoaded 后被赋值
let logOutputEl, htlcAddressInputEl, connectionStatusDisplayEl,
    receiverEthInputEl, amountEthInputEl, timelockDurationEthInputEl, createSwapBtnEl,
    isRespondingPartyCheckboxEl, respondingPartyInputsEl, existingHashLockInputEl, useThisSwapIdInputEl,
    newSwapIdDisplayEl, newPreimageDisplayEl, newHashLockDisplayEl,
    initiatorNoteEl, responderNoteEl,
    existingSwapIdInputEl, existingPreimageInputEl, claimBtnEl, refundBtnEl, fillFromCreatedBtnEl;

const log = (msg) => {
  if (logOutputEl) {
    logOutputEl.textContent += msg + "\n";
    logOutputEl.scrollTop = logOutputEl.scrollHeight;
  }
  console.log(msg);
};

const HTLC_ADDR_PRESETS = {
  48898: "0x49CD5010Bf15DA6FbCF25c9f862f71437cA0193F", // Zircuit
  11155111: "0x749c472556682cDdA8BD1f8cd3bAD40f294E81d3", // Sepolia
};

const HTLC_ABI = [
  "function lockETH(bytes32 id, bytes32 hashLock, uint256 timelock, address receiver) payable",
  "function withdraw(bytes32 id, bytes32 preimage)",
  "function refund(bytes32 id)",
  "event Locked(bytes32 indexed id, address indexed sender, address indexed receiver, uint256 amount, bytes32 hashLock, uint256 timelock, uint8 tokenType, address tokenAddr)",
  "event Withdrawn(bytes32 indexed id, bytes32 preimage, address indexed withdrawnTo)", // 假设你的事件有 withdrawnTo
  "event Refunded(bytes32 indexed id)",
];

async function connectMetaMask() {
  log("Attempting to connect to MetaMask...");
  if (!window.ethereum) {
    log("🦊 MetaMask not detected - please install MetaMask extension!");
    if (connectionStatusDisplayEl) connectionStatusDisplayEl.textContent = "Status: MetaMask not detected.";
    return false;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    const network = await provider.getNetwork();
    currentChainId = Number(network.chainId);

    console.groupCollapsed('--- MetaMask Connection Details ---');
    console.log('Raw network object from provider.getNetwork():', JSON.parse(JSON.stringify(network)));
    console.log(`Successfully connected. Derived chainId: ${currentChainId}`);
    console.log(`Network name: ${network.name}`);
    console.log(`Signer address: ${signer.address}`);
    console.groupEnd();

    log(`🔗 Connected as ${signer.address} on chainId ${currentChainId} (Network: ${network.name})`);
    if (connectionStatusDisplayEl) connectionStatusDisplayEl.textContent = `Connected: ${signer.address} on ${network.name} (ID: ${currentChainId})`;

    const presetAddress = HTLC_ADDR_PRESETS[currentChainId];
    if (presetAddress && htlcAddressInputEl) {
      htlcAddressInputEl.value = presetAddress;
      log(`📝 Auto-filled HTLC address for ${network.name}: ${presetAddress}`);
    } else if (htlcAddressInputEl) {
      log(`⚠️ No preset HTLC address for chainId ${currentChainId}. Please enter manually or update presets.`);
    }
    return true;
  } catch (error) {
    log("❌ MetaMask Connection Error: " + (error.message || error));
    console.error("MetaMask Connection error details:", error);
    if (connectionStatusDisplayEl) connectionStatusDisplayEl.textContent = "Status: Connection failed.";
    return false;
  }
}

function getHTLCContract() {
  if (!signer) {
    log("❌ Signer not available. Please connect to MetaMask first.");
    throw new Error("Signer not available. Connect to MetaMask.");
  }
  const htlcAddr = htlcAddressInputEl ? htlcAddressInputEl.value.trim() : "";
  if (!ethers.isAddress(htlcAddr)) {
    log("❌ Invalid HTLC contract address provided.");
    throw new Error("Invalid HTLC contract address.");
  }
  return new ethers.Contract(htlcAddr, HTLC_ABI, signer);
}

async function createEthSwap() {
  log("⏳ Initiating new ETH Swap creation...");
  if (!receiverEthInputEl || !amountEthInputEl || !timelockDurationEthInputEl || !isRespondingPartyCheckboxEl || !existingHashLockInputEl || !useThisSwapIdInputEl) {
    log("❌ Critical DOM elements for creating swap not found.");
    return;
  }

  const receiver = receiverEthInputEl.value.trim();
  const amountStr = amountEthInputEl.value.trim();
  const durationSeconds = parseInt(timelockDurationEthInputEl.value, 10);

  log(`Input - Receiver: ${receiver}, Amount String: ${amountStr}, Duration Seconds: ${durationSeconds}`);

  if (!ethers.isAddress(receiver)) { log("❌ Validation Error: Invalid receiver address."); return; }
  if (isNaN(parseFloat(amountStr)) || parseFloat(amountStr) <= 0) { log("❌ Validation Error: Invalid amount."); return; }
  let amountInWei;
  try { amountInWei = ethers.parseEther(amountStr); log(`Converted Amount in Wei: ${amountInWei.toString()}`); } 
  catch (e) { log(`❌ Validation Error: Could not parse amount '${amountStr}' to Ether. ${e.message}`); return; }
  if (isNaN(durationSeconds) || durationSeconds <= 0) { log("❌ Validation Error: Invalid timelock duration."); return; }
  const timelock = Math.floor(Date.now() / 1000) + durationSeconds;
  log(`Calculated timelock (Unix timestamp): ${timelock}`);

  if (newSwapIdDisplayEl) newSwapIdDisplayEl.textContent = "Processing...";
  if (newPreimageDisplayEl) newPreimageDisplayEl.textContent = "Processing...";
  if (newHashLockDisplayEl) newHashLockDisplayEl.textContent = "Processing...";
  lastCreatedSwap = {};

  let swapIdToUse, preimageForDisplay, hashLockToUse;
  const isResponding = isRespondingPartyCheckboxEl.checked;

  try {
    if (isResponding) {
      log("ℹ️ Creating swap as a responding party.");
      hashLockToUse = existingHashLockInputEl.value.trim();
      if (!ethers.isBytesLike(hashLockToUse) || ethers.getBytes(hashLockToUse).length !== 32) {
        log("❌ Invalid HashLock provided for responding party.");
        if (newHashLockDisplayEl) newHashLockDisplayEl.textContent = "Error: Invalid HashLock";
        return;
      }
      log(`Using provided HashLock: ${hashLockToUse}`);
      if (newHashLockDisplayEl) newHashLockDisplayEl.textContent = hashLockToUse;

      const userProvidedSwapId = useThisSwapIdInputEl.value.trim();
      if (userProvidedSwapId && ethers.isBytesLike(userProvidedSwapId) && ethers.getBytes(userProvidedSwapId).length === 32) {
        swapIdToUse = userProvidedSwapId;
        log(`Using provided Swap ID: ${swapIdToUse}`);
      } else {
        const swapIdBytes = ethers.randomBytes(32);
        swapIdToUse = ethers.hexlify(swapIdBytes);
        log(`Generated new Swap ID (as responder): ${swapIdToUse}`);
      }
      if (newSwapIdDisplayEl) newSwapIdDisplayEl.textContent = swapIdToUse;
      if (newPreimageDisplayEl) newPreimageDisplayEl.textContent = "N/A (Responder)";
      preimageForDisplay = null; // Responder doesn't generate/know preimage

      if (initiatorNoteEl) initiatorNoteEl.classList.add('hidden');
      if (responderNoteEl) responderNoteEl.classList.remove('hidden');

    } else {
      log("ℹ️ Creating swap as an initiating party.");
      const preimageBytes = ethers.randomBytes(32);
      preimageForDisplay = ethers.hexlify(preimageBytes); // This is the actual preimage
      hashLockToUse = ethers.keccak256(preimageForDisplay);
      const swapIdBytes = ethers.randomBytes(32);
      swapIdToUse = ethers.hexlify(swapIdBytes);

      log(`Generated Preimage: ${preimageForDisplay}`);
      if (newPreimageDisplayEl) newPreimageDisplayEl.textContent = preimageForDisplay;
      log(`Generated HashLock: ${hashLockToUse}`);
      if (newHashLockDisplayEl) newHashLockDisplayEl.textContent = hashLockToUse;
      log(`Generated Swap ID: ${swapIdToUse}`);
      if (newSwapIdDisplayEl) newSwapIdDisplayEl.textContent = swapIdToUse;

      if (initiatorNoteEl) initiatorNoteEl.classList.remove('hidden');
      if (responderNoteEl) responderNoteEl.classList.add('hidden');
    }

    const htlcContract = getHTLCContract();
    log(`Attempting to lock ${amountStr} ETH to ${receiver} on chain ${currentChainId}...`);
    log(`   (Swap ID: ${swapIdToUse.substring(0,12)}..., HashLock: ${hashLockToUse.substring(0,12)}...)`);
    if (signer) log(`   DEBUG: Signer address: ${await signer.getAddress()}`);
    else { log("DEBUG: Signer is NOT defined before calling lockETH!"); return; }
    if (provider) log(`   DEBUG: Provider network chainId: ${(await provider.getNetwork()).chainId}`);
    else { log("DEBUG: Provider is NOT defined before calling lockETH!"); return; }

    log(">>> DEBUG: Preparing to call htlcContract.lockETH...");
    const tx = await htlcContract.lockETH(swapIdToUse, hashLockToUse, timelock, receiver, { value: amountInWei });
    log("✅ DEBUG: MetaMask interaction for lockETH should have occurred.");
    log(`➡️ Lock ETH transaction sent: ${tx.hash}. Waiting for confirmation...`);

    const receipt = await tx.wait(1);
    log(`✅ ETH Swap Locked! Block: ${receipt.blockNumber}. Tx hash: ${receipt.hash}. Gas used: ${receipt.gasUsed.toString()}`);

    lastCreatedSwap = { 
        swapId: swapIdToUse, 
        preimage: isResponding ? null : preimageForDisplay, // Only store preimage if initiator
        hashLock: hashLockToUse, 
        receiver, 
        amount: amountStr, 
        timelock,
        isInitiator: !isResponding 
    };
    console.log("lastCreatedSwap after successful creation:", JSON.stringify(lastCreatedSwap));
    if(isResponding) {
        log("💡 Swap created as responder. The initiator needs their Preimage to claim this swap's funds (if you are the receiver).");
    } else {
        log("💡 IMPORTANT: Share the Swap ID and HashLock with the counterparty. Keep your Preimage secret.");
    }

  } catch (error) {
    log("❌❌❌ Create ETH Swap - Error BEFORE or DURING lockETH call ❌❌❌");
    let errorMessage = "An unknown error occurred.";
    if (error.reason) { errorMessage = error.reason;
    } else if (error.code && typeof error.code === 'number') {
        errorMessage = `Error code: ${error.code} - ${error.message || (error.data ? error.data.message : '')}`;
    } else if (error.message) { errorMessage = error.message;
    } else if (typeof error === 'string') { errorMessage = error; }
    log(`   Error Message: ${errorMessage}`);
    if (error.transactionHash) log(`   Transaction Hash (if any): ${error.transactionHash}`);
    if (error.data && typeof error.data === 'object') log(`   Error Data: ${JSON.stringify(error.data)}`);
    else if (error.data) log(`   Error Data: ${error.data}`);
    console.error("Create ETH Swap - Full Error Object:", error);
    if (newSwapIdDisplayEl) newSwapIdDisplayEl.textContent = "Error!";
    if (newPreimageDisplayEl) newPreimageDisplayEl.textContent = "Error!";
    if (newHashLockDisplayEl) newHashLockDisplayEl.textContent = "Error!";
    lastCreatedSwap = {};
  }
}

async function claimFunds() {
  log("⏳ Initiating claim (withdraw)...");
  if (!existingSwapIdInputEl || !existingPreimageInputEl) {
    log("❌ DOM elements for existing swap ID or preimage not found."); return;
  }
  const swapId = existingSwapIdInputEl.value.trim();
  const preimage = existingPreimageInputEl.value.trim();

  if (!ethers.isBytesLike(swapId) || ethers.getBytes(swapId).length !== 32) {
    log("❌ Invalid Swap ID format."); return;
  }
  if (!ethers.isBytesLike(preimage) || ethers.getBytes(preimage).length !== 32) {
    log("❌ Invalid Preimage format."); return;
  }
  try {
    const htlcContract = getHTLCContract();
    log(`Attempting to withdraw for Swap ID: ${swapId} with Preimage: ${preimage.substring(0, 10)}... on chain ${currentChainId}`);
    const tx = await htlcContract.withdraw(swapId, preimage);
    log(`➡️ Withdraw transaction sent: ${tx.hash}. Waiting for confirmation...`);
    const receipt = await tx.wait(1);
    log(`✅ Withdraw confirmed! Block: ${receipt.blockNumber}. Tx hash: ${receipt.hash}. Gas used: ${receipt.gasUsed.toString()}`);
  } catch (error) {
    let errorMessage = error.reason || error.message || (error.data ? error.data.message : "Unknown claim error");
    if(error.code && typeof error.code === 'number') errorMessage = `Code ${error.code}: ${errorMessage}`;
    log(`❌ Claim Error: ${errorMessage}`);
    if (error.transactionHash) log(`   Transaction hash (if any): ${error.transactionHash}`);
    console.error("Claim Error Details:", error);
  }
}

async function refundFunds() {
  log("⏳ Initiating refund...");
  if (!existingSwapIdInputEl) {
    log("❌ DOM element for existing swap ID not found."); return;
  }
  const swapId = existingSwapIdInputEl.value.trim();
  if (!ethers.isBytesLike(swapId) || ethers.getBytes(swapId).length !== 32) {
    log("❌ Invalid Swap ID format."); return;
  }
  try {
    const htlcContract = getHTLCContract();
    log(`Attempting to refund for Swap ID: ${swapId} on chain ${currentChainId}`);
    const tx = await htlcContract.refund(swapId);
    log(`➡️ Refund transaction sent: ${tx.hash}. Waiting for confirmation...`);
    const receipt = await tx.wait(1);
    log(`✅ Refund confirmed! Block: ${receipt.blockNumber}. Tx hash: ${receipt.hash}. Gas used: ${receipt.gasUsed.toString()}`);
  } catch (error) {
    let errorMessage = error.reason || error.message || (error.data ? error.data.message : "Unknown refund error");
    if(error.code && typeof error.code === 'number') errorMessage = `Code ${error.code}: ${errorMessage}`;
    log(`❌ Refund Error: ${errorMessage}`);
    if (error.transactionHash) log(`   Transaction hash (if any): ${error.transactionHash}`);
    console.error("Refund Error Details:", error);
  }
}

function fillDetailsFromLastCreatedSwap() {
  console.log("fillDetails called, lastCreatedSwap is:", JSON.stringify(lastCreatedSwap));
  if (lastCreatedSwap.swapId && existingSwapIdInputEl) {
    existingSwapIdInputEl.value = lastCreatedSwap.swapId;
    log(`📋 Filled Swap ID: ${lastCreatedSwap.swapId}`);
  } else {
    log("ℹ️ No swap created successfully in this session to fill from, or Swap ID input element not found.");
    if(existingSwapIdInputEl) existingSwapIdInputEl.value = "";
    if(existingPreimageInputEl) existingPreimageInputEl.value = "";
    return;
  }

  if (lastCreatedSwap.isInitiator && lastCreatedSwap.preimage && existingPreimageInputEl) {
    existingPreimageInputEl.value = lastCreatedSwap.preimage;
    log(`📋 Filled Preimage: ${lastCreatedSwap.preimage.substring(0, 10)}...`);
  } else if (existingPreimageInputEl) {
    existingPreimageInputEl.value = "";
    if (!lastCreatedSwap.isInitiator) {
        log("ℹ️ Preimage field not filled as this swap was created as a responder (preimage is unknown to responder).");
    }
  }
}

// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed. Initializing element references and event listeners.");

  logOutputEl = document.getElementById("log");
  htlcAddressInputEl = document.getElementById("htlc");
  connectionStatusDisplayEl = document.getElementById("connectionStatus");

  receiverEthInputEl = document.getElementById("receiverEth");
  amountEthInputEl = document.getElementById("amountEth");
  timelockDurationEthInputEl = document.getElementById("timelockDurationEth");
  createSwapBtnEl = document.getElementById("createSwapBtn");
  
  isRespondingPartyCheckboxEl = document.getElementById("isRespondingParty");
  respondingPartyInputsEl = document.getElementById("respondingPartyInputs");
  existingHashLockInputEl = document.getElementById("existingHashLock");
  useThisSwapIdInputEl = document.getElementById("useThisSwapId");

  newSwapIdDisplayEl = document.getElementById("newSwapIdDisplay");
  newPreimageDisplayEl = document.getElementById("newPreimageDisplay");
  newHashLockDisplayEl = document.getElementById("newHashLockDisplay");
  initiatorNoteEl = document.getElementById("initiatorNote");
  responderNoteEl = document.getElementById("responderNote");

  existingSwapIdInputEl = document.getElementById("existingSwapIdInput");
  existingPreimageInputEl = document.getElementById("existingPreimageInput");
  claimBtnEl = document.getElementById("claimBtn");
  refundBtnEl = document.getElementById("refundBtn");
  fillFromCreatedBtnEl = document.getElementById("fillFromCreatedBtn");
  
  console.log("DOM Elements Check after DOMContentLoaded:", { /* ... elements ... */ });

  log("Page loaded (from DOMContentLoaded). Attempting initial MetaMask connection...");
  connectMetaMask();

  if (createSwapBtnEl) createSwapBtnEl.onclick = createEthSwap;
  else log("Warning: Create Swap button ('createSwapBtn') not found.");
  
  if (claimBtnEl) claimBtnEl.onclick = claimFunds;
  else log("Warning: Claim button ('claimBtn') not found.");
  
  if (refundBtnEl) refundBtnEl.onclick = refundFunds;
  else log("Warning: Refund button ('refundBtn') not found.");
  
  if (fillFromCreatedBtnEl) fillFromCreatedBtnEl.onclick = fillDetailsFromLastCreatedSwap;
  else log("Warning: 'Fill from Created' button ('fillFromCreatedBtn') not found.");

  if (isRespondingPartyCheckboxEl && respondingPartyInputsEl) {
    isRespondingPartyCheckboxEl.onchange = () => {
      if (isRespondingPartyCheckboxEl.checked) {
        respondingPartyInputsEl.classList.remove('hidden');
        if (initiatorNoteEl) initiatorNoteEl.classList.add('hidden');
        if (responderNoteEl) responderNoteEl.classList.remove('hidden');
      } else {
        respondingPartyInputsEl.classList.add('hidden');
        if (initiatorNoteEl) initiatorNoteEl.classList.remove('hidden');
        if (responderNoteEl) responderNoteEl.classList.add('hidden');
      }
    };
    // Initialize visibility based on current checkbox state (e.g., if page reloads with checkbox checked)
    isRespondingPartyCheckboxEl.dispatchEvent(new Event('change'));
  }
});

// --- MetaMask Event Listeners ---
if (window.ethereum) {
  window.ethereum.on("chainChanged", async (hexChainId) => {
    const newChainIdDecimal = Number(hexChainId);
    console.groupCollapsed('--- "chainChanged" Event Detected ---');
    console.log(`MetaMask reported new hexChainId: ${hexChainId}`);
    console.log(`Converted to decimal chainId: ${newChainIdDecimal}`);
    console.groupEnd();
    log(`🔄 Network changed in MetaMask. Detected new chainId: ${newChainIdDecimal}. Re-connecting...`);
    await connectMetaMask();
  });
  window.ethereum.on("accountsChanged", async (accounts) => {
    log(`👤 Account changed in MetaMask. New account: ${accounts[0] || 'No account selected'}. Re-connecting...`);
    await connectMetaMask();
  });
} else {
  console.log("MetaMask ethereum object not found (when setting up global listeners).");
}