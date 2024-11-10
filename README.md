# Flow NFT Web App

This project is a simple web application that allows users to mint, view, list for sale, and buy NFTs on the Flow blockchain. The app uses Flow's local emulator and development wallet for testing.

## Features

- **Mint NFTs**: Create NFTs and assign them to a user account.
- **View NFTs**: See the NFTs associated with a user account.
- **Sell NFTs**: List NFTs for sale in the marketplace.
- **Buy NFTs**: Purchase listed NFTs from the marketplace.

## Prerequisites

Ensure the following are installed on your system:

- Node.js
- Flow CLI
- npm

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd 1-non-fungible-token
   Install Dependencies
   ```

bash
Copy code
npm install
Start the Frontend

In the first terminal window, run:

bash
Copy code
npm run dev
This will start the web app at http://localhost:3000.

Start the Local Emulator

In a second terminal window, run:

bash
Copy code
cd 1-non-fungible-token
flow emulator start -v
Deploy the Contract and Start the Wallet

In a third terminal window, run:

bash
Copy code
cd 1-non-fungible-token
flow project deploy
flow dev-wallet
To redeploy after making changes to the contract, run:

bash
Copy code
flow project deploy --update
Open the App

Visit http://localhost:3000 in your browser.

Usage Instructions
Log In

Click the "Log In" button on the app. A window with several Flow test accounts will appear. Select the first account to log in.

Mint NFTs

After logging in, mint NFTs by running:

bash
Copy code
npm run mint 0xf8d6e0586b0a20c7
View NFTs

Log in with account 0xf8d6e0586b0a20c7 and click "Get NFTs" in the app.

Sell an NFT

Select an NFT and click "Add to Listing" to list it for sale.

Buy an NFT

To buy a listed NFT, browse the marketplace, select an NFT, and click "Buy".

Notes
Make sure the Flow emulator and dev wallet are running before interacting with the app. Use the -v flag on the emulator for detailed transaction logs.
