# Flow NFT Web App

This project is a simple web application that allows users to mint, view, list for sale, and buy NFTs on the Flow blockchain. The app uses Flow's local emulator and development wallet for testing.

## Features

- **Mint NFTs**: Create NFTs and assign them to a user account.
- **View NFTs**: See the NFTs associated with a user account.
- **Sell NFTs**: List NFTs for sale in the marketplace.
- **Buy NFTs**: Purchase listed NFTs from the marketplace.

## Prerequisites

Ensure the following are installed on your system:

- Flow CLI
- npm

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

Visit http://localhost:3000 in your browser.

## Usage Instructions

# Log In

Click the "Log In" button on the app. A window with several Flow-dev accounts will appear. Select the first account to log in.

# Mint NFTs

After logging in, mint NFTs by running:

npm run mint 0xf8d6e0586b0a20c7

# Burn NFTs

npm burn mint <NFT id>

# View NFTs

Log in with account 0xf8d6e0586b0a20c7 and click "Get NFTs" in the app.

# Sell an NFT

Select an NFT and click "Add to Listing" to list it for sale.

# Buy an NFT

To buy a listed NFT, browse the marketplace, select an NFT, and click "Buy".

Notes
Make sure the Flow emulator and dev wallet are running before interacting with the app.
