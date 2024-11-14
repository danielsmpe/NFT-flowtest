# Flow-Based NFT Marketplace DApp

DApp ini memungkinkan pengguna untuk membuat, menghapus, menjual, dan membeli NFT (Non-Fungible Token) di blockchain Flow.

## Features

- **Mint NFT**: Creates an NFT and adds it to the user's account.
- **Burn NFT**: Deletes an NFT.
- **Jual NFT**: Lists an NFT for sale on the marketplace.
- **Beli NFT**: Purchases an NFT listed on the marketplace.

  ![image](https://github.com/user-attachments/assets/9d418f24-97f9-457c-9b3d-f3a8b93654e4)


## Prerequisites

- Flow CLI (https://developers.flow.com/tools/flow-cli/install)
- npm

> NOTE: The application deployed on testnet is available in the testnet-version branch.


## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/danielsmpe/NFT-flowtest.git
   cd NFT-flowtest
   ```
2. **Install Dependencies**
   ```bash
   npm install
   ```
3. **In the first terminal window, run:**
   ```bash
   npm run dev
   This will start the web app at http://localhost:3000.
   ```
4. **In a second terminal window, run:**
   ```bash
   flow emulator start -v
   ```
5. **Deploy the Contract and Start the Wallet**
   ```bash
   flow project deploy
   flow dev-wallet
   ```

## Open the App

Buka http://localhost:3000 in your browser.

## Usage Instructions

### Log In

Click the "Log In" button on the app. A window with several Flow-dev accounts will appear. Select the first account to log in.

### Setup Account 

- Click the "Setup Vault Flow Token" button to set up the vault. This is necessary because each account must have a vault for Flow tokens and a collection to store NFTs.
- Click "Setup Listing Bucket" to set up the storefront storage. This step is required for users to list or purchase NFTs on the marketplace. 

### Mint NFTs

mint NFTs by running :

npm run mint 0xf8d6e0586b0a20c7

### View NFTs

Log in with account 0xf8d6e0586b0a20c7 and click "Get NFTs" in the app.

### Sell an NFT

- Select an NFT in your account set price and expiry
- Click "Add to Listing" to list it for sale on the marketplace.

### Buy an NFT
- Create and Setup New Account
- Browse the marketplace for listed NFTs.
- Select an NFT and click "Buy" to complete the purchase.
To buy a listed NFT, browse the marketplace, select an NFT, and click "Buy".

### Burn NFTs

npm run burn NFTid

> Notes : Make sure the Flow emulator and dev wallet are running before interacting with the app.

### Deploy To Tesnet

1. Generate a deployer address by typing 'flow keys generate --network=testnet' into a terminal

Make sure to save your public key and private key

2. Create deployer account by going to https://testnet-faucet.onflow.org/, pasting in your public key from above, and clicking CREATE ACCOUNT:
   
After it finishes, click COPY ADDRESS and make sure to save that address somewhere. You will need it!

3. Add new testnet account to your flow.json by modifying the following lines of code. Paste your address you copied above to where it says “YOUR GENERATED ADDRESS”, and paste your private key where it says “YOUR PRIVATE KEY”.

![{AF1AD8A8-7BD4-4703-A97D-6111947D3EE1}](https://github.com/user-attachments/assets/f4b43861-9eff-4684-9147-34d42ddf7429)


4. Deploy smart contract:

flow project deploy --network=testnet

5. Atur Variabel `.env` untuk Testnet
   
![{A01552E2-DD1B-418B-9D92-91C5E811DDAC}](https://github.com/user-attachments/assets/532b266b-d5c3-4daa-821d-95fbb0d6c7cf)


## Refrence

https://developers.flow.com/build/core-contracts/nft-storefront

https://cadence-lang.org/docs

https://academy.ecdao.org/en/quickstarts/1-non-fungible-token-next
