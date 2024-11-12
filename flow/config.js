const fcl = require("@onflow/fcl");

fcl.config({
  "app.detail.title": "NFT",
  "app.detail.icon": "https://i.imgur.com/ux3lYB9.png", 
  "accessNode.api": process.env.NEXT_PUBLIC_ACCESS_NODE,
  "discovery.wallet": process.env.NEXT_PUBLIC_WALLET,
  "discovery.authn.include": ["0x82ec283f88a62e65",0x9d2e44203cb13051],
  "0xDeployer": process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  "0xStandard": process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  "0xFlowToken": process.env.NEXT_PUBLIC_FLOW_TOKEN_ADDRESS,
  "0xNft": process.env.NEXT_PUBLIC_NFT_ADDRESS,
  "0xFt": process.env.NEXT_PUBLIC_FT_ADDRESS,
  "0xStorefront": process.env.NEXT_PUBLIC_STOREFRONT_ADDRESS
})