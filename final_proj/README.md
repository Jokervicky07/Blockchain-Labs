# HTLC Atomic Swap with Relayer Service

This project implements an Atomic Swap zweiten HTLC (Hashed TimeLock Contract) mechanism, enabling cross-chain asset swaps between two parties without trusting a central intermediary. It features a basic frontend for user interaction and a conceptual backend relayer service to alleviate the requirement for both parties to remain online throughout the swap process.

The demonstration is designed to be run on two L2 testnets (e.g., Zircuit Garfield Testnet and Sepolia Testnet).

**Project Link (if applicable, e.g., live demo or video):** [Insert Link Here]
**Your Repository Link:** [Your GitHub Repo URL Here - this is for users who clone it]

## Features

*   **HTLC Smart Contract (`HTLC.sol`):**
    *   Supports locking and swapping native ETH (can be extended for ERC20).
    *   Functions: `lockETH`, `withdraw`, `refund`.
    *   Events: `Locked`, `Withdrawn`, `Refunded` for off-chain monitoring.
    *   `withdraw` function designed to allow a third-party (relayer) to submit the transaction with the correct preimage, with funds going to the original intended receiver.
*   **Frontend Interface (`index.html`, `app.js`):**
    *   Connects to MetaMask.
    *   Displays current connection status and network.
    *   **Initiate Swap:** Allows a user (Alice) to create a new HTLC by locking ETH, specifying the receiver, amount, and timelock. It generates and displays the `swapId`, `preimage`, and `hashLock`.
    *   **Respond to Swap:** Allows a user (Bob) to create a corresponding HTLC on another chain, using the `hashLock` (and optionally `swapId`) provided by the initiator.
    *   **Interact with Swap:** Allows users to `claim` funds using a `preimage` or `refund` funds after the timelock expires.
    *   Fills interaction fields from the last created swap for convenience.
    *   Logs transaction progress and results.
*   **Backend Relayer/Watcher Service (Conceptual - `watch.js`):**
    *   **Solves "Online Requirement":** Demonstrates how a backend service can assist users.
    *   Monitors one chain (e.g., Sepolia) for `Withdrawn` events (which reveal the `preimage`).
    *   Upon detecting a revealed `preimage`, it uses its own funded wallet to call `withdraw` on the corresponding HTLC on the other chain (e.g., Zircuit), completing the swap for the other party.
    *   **Does NOT require user private keys.**
    *   Includes a conceptual auto-refund mechanism based on timelocks.
*   **Hardhat Scripts:**
    *   `createswap.js`: Script for Party A to initiate an HTLC on Chain A.
    *   `participateswap.js`: Script for Party B to create a corresponding HTLC on Chain B using details from Party A.
    *   `claim.js`: Script for Party A to claim funds from Party B's HTLC, revealing the preimage.
    *   (`watch.js` acts as the relayer script).

## Problem Solved

This project primarily addresses one of the major issues in traditional HTLCs: **the requirement for both parties to remain online.** The backend relayer service automates the second leg of the swap once the preimage is revealed, meaning the second party doesn't need to manually monitor the chain and claim their funds.

The "price agreement" aspect is assumed to be handled off-chain before the HTLCs are created.

## Technical Stack

*   **Smart Contracts:** Solidity, Hardhat
*   **Frontend:** HTML, CSS, JavaScript, Ethers.js
*   **Backend Relayer (PoC):** Node.js, Ethers.js, dotenv
*   **Blockchain Networks:**
    *   Chain A: Zircuit Garfield Testnet (Chain ID: 48898) - *Replace if different*
    *   Chain B: Sepolia Testnet (Chain ID: 11155111) - *Replace if different*
*   **Wallet:** MetaMask

## Project Structure (Illustrative)
├── contracts/
│ └── HTLC.sol
│ ├── ERC20Mock.sol
├── scripts/
│ ├── createswap.js
│ ├── participateswap.js
│ ├── deploy.js
│ ├── deployERC20.js
│ ├── claim.js
│ └── watch.js # Backend Relayer/Watcher Script
├── frontend/ # Contains index.html and app.js
│ ├── index.html
│ └── app.js
├── .env # Example environment file
├── hardhat.config.js
├── package.json
└── README.md


## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Jokervicky07/Blockchain-Labs.git
    cd final_project
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    *   Create a `.env` file in the root directory 
    *   Fill in the required values:
        ```dotenv
        # For Hardhat scripts and deployment
        PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY_FOR_ALICE_OR_DEPLOYER 
        SECOND_PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY_FOR_BOB_OR_RELAYER 
        INFURA_API_KEY=YOUR_INFURA_API_KEY_OR_OTHER_RPC_PROVIDER_KEY

        # For Hardhat scripts: Deployed HTLC contract addresses (update after deployment)
        ZIRCUIT_HTLC=YOUR_DEPLOYED_HTLC_ADDRESS_ON_ZIRCUIT
        SEPOLIA_HTLC=YOUR_DEPLOYED_HTLC_ADDRESS_ON_SEPOLIA

        # For Hardhat scripts: Receiver addresses for cross-chain swaps
        # (These would be Alice's address on Sepolia and Bob's address on Zircuit)
        A_RECEIVER=ALICE_ADDRESS_ON_SEPOLIA_OR_CHAIN_B 
        B_RECEIVER=BOB_ADDRESS_ON_ZIRCUIT_OR_CHAIN_A

        # For watch.js (Relayer) and frontend presets (SWAP_ID is for specific watch.js run)
        # RELAYER_PRIVATE_KEY can be same as SECOND_PRIVATE_KEY if that account is funded for relaying
        # CHAIN_A_RPC_URL, CHAIN_B_RPC_URL (e.g., Zircuit RPC, Sepolia RPC via Infura)
        # CHAIN_A_HTLC_ADDRESS, CHAIN_B_HTLC_ADDRESS (same as above)
        # SWAP_ID= # Only if running watch.js for a specific, known swap ID
        # PREIMAGE= # Only if running claim.js for a specific, known preimage
        ```
    *   **Note:** Ensure the accounts corresponding to `PRIVATE_KEY`, `SECOND_PRIVATE_KEY` (and `RELAYER_PRIVATE_KEY` if different for `watch.js`) are funded with test ETH on both Zircuit and Sepolia testnets for gas fees.

4.  **Compile Smart Contracts:**
    ```bash
    npx hardhat compile
    ```

5.  **Deploy HTLC Contract:**
    *   Update `hardhat.config.js` with your RPC URLs and private keys if not already done via `.env`.
    *   Deploy `HTLC.sol` to both Zircuit Testnet and Sepolia Testnet.
        ```bash
        npx hardhat run scripts/deploy.js --network Zircuit_Garfield_Testnet 
        npx hardhat run scripts/deploy.js --network sepolia
        ```
        *(You'll need to create a `deploy.js` script if you don't have one. A simple one is shown below.)*
    *   After deployment, update `ZIRCUIT_HTLC` and `SEPOLIA_HTLC` in your `.env` file with the deployed contract addresses. Also, update these addresses in `frontend/app.js` in the `HTLC_ADDR_PRESETS` object.


## Usage and Demonstration Flow

**Prerequisites:**
*   MetaMask installed and configured with Zircuit Testnet and Sepolia Testnet.
*   Accounts funded on both testnets.
*   HTLC contract deployed on both testnets, and addresses updated in `.env` and `frontend/app.js`.

**Scenario: Alice (on Zircuit) wants to swap ETH with Bob (on Sepolia).**

1.  **Run the Frontend:**
    ```bash
    npx serve frontend 
    ```
    Open `http://localhost:3000` (or the port `serve` indicates) in your browser.

2.  **Alice Initiates Swap on Zircuit:**
    *   Connect MetaMask to **Zircuit Garfield Testnet**.
    *   On the frontend:
        *   Ensure "I am responding" checkbox is **unchecked**.
        *   Enter Bob's Zircuit address as "Receiver Address".
        *   Enter the amount of ETH Alice wants to lock.
        *   Set a timelock duration (e.g., 7200 seconds for 2 hours).
        *   Click "Create ETH Swap" and confirm in MetaMask.
    *   Note down the displayed `Swap ID (Alice)`, `Preimage (Alice's Secret)`, and `HashLock (Alice)`.
    *   Alice shares `Swap ID (Alice)` and `HashLock (Alice)` with Bob.

3.  **Bob Responds on Sepolia:**
    *   Connect MetaMask to **Sepolia Testnet**.
    *   On the frontend:
        *   Check the "I am responding" checkbox.
        *   Enter `HashLock (Alice)` (from Alice) into the "HashLock" field.
        *   Optionally, enter `Swap ID (Alice)` into the "Swap ID" field (to use the same ID, good for a simple relayer). Otherwise, a new ID will be generated for Bob's swap.
        *   Enter Alice's Sepolia address as "Receiver Address".
        *   Enter the amount of ETH Bob wants to lock.
        *   Set a timelock duration **shorter** than Alice's (e.g., 3600 seconds for 1 hour).
        *   Click "Create ETH Swap" and confirm in MetaMask.
    *   Bob notes his `Swap ID (Bob)` if a new one was generated.

4.  **Alice Claims from Bob's Swap on Sepolia (Reveals Preimage):**
    *   Connect MetaMask to **Sepolia Testnet**.
    *   On the frontend ("Interact with Existing Swap"):
        *   Enter `Swap ID (Bob)` (or `Swap ID (Alice)` if they used the same).
        *   Enter `Preimage (Alice's Secret)`.
        *   Click "Claim Funds" and confirm in MetaMask.
    *   Alice receives Bob's ETH on Sepolia. The `Preimage (Alice's Secret)` is now public on the Sepolia chain.

5.  **Relayer (or Bob) Claims from Alice's Swap on Zircuit:**
    *   **Using the Backend Relayer (`watch.js`):**
        *   Modify `watch.js` to listen to Sepolia for `Withdrawn` events and relay to Zircuit. Ensure it's configured with a funded relayer wallet.
        *   Run `node scripts/watch.js`.
        *   The relayer should detect the `Withdrawn` event on Sepolia, extract the `Preimage (Alice's Secret)`, and automatically call `withdraw` on Zircuit for `Swap ID (Alice)`.
    *   **Manual Claim by Bob (if no relayer or for testing):**
        *   Connect MetaMask to **Zircuit Garfield Testnet**.
        *   On the frontend ("Interact with Existing Swap"):
            *   Enter `Swap ID (Alice)`.
            *   Enter the now-public `Preimage (Alice's Secret)`.
            *   Click "Claim Funds" and confirm in MetaMask.
    *   Bob (or the receiver specified in Alice's initial swap) receives Alice's ETH on Zircuit.

**The atomic swap is now complete!**

## Future Work / Potential Improvements

*   **Robust Relayer Service:** Develop `watch.js` into a persistent, robust backend service that:
    *   Dynamically discovers new HTLCs by listening to `Locked` events on both chains.
    *   Manages multiple concurrent swaps.
    *   Implements a more sophisticated matching logic (e.g., using `hashLock` if `swapId`s differ).
    *   Handles errors, retries, and gas management more effectively.
    *   Provides a status API or dashboard.
*   **ERC20 Support:** Extend the smart contract and frontend to support atomic swaps of ERC20 tokens. This would involve `approve` and `transferFrom` logic.
*   **Enhanced UI/UX:**
    *   Clearer visual distinction between initiator and responder roles.
    *   Displaying details of active/past swaps.
    *   Better error feedback.
*   **Off-chain Communication Layer:** For a real-world application, a secure off-chain way for Alice and Bob to exchange initial parameters (like `hashLock`, `swapId`, addresses, and terms of the swap) would be needed, rather than manual copy-pasting.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
