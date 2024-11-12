const fcl = require("@onflow/fcl");

fcl.config({
  "app.detail.title": "1-NON-FUNGIBLE-TOKEN",
  "app.detail.icon": "https://i.imgur.com/ux3lYB9.png", 
  "accessNode.api": process.env.NEXT_PUBLIC_ACCESS_NODE,
  "discovery.wallet": process.env.NEXT_PUBLIC_WALLET,
  "0xDeployer": process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  "0xStandard": process.env.NEXT_PUBLIC_STANDARD_ADDRESS,
  "0xFlowToken": process.env.NEXT_PUBLIC_FLOW_TOKEN_ADDRESS
})