const fcl = require("@onflow/fcl");
const { serverAuthorization } = require("./auth/authorization.js");
require("../flow/config.js");

async function mintNFTs(recipient) {
  const names = ["Governance"];
  const descriptions = [
    "This is the logo of the Education Guild",
  ];
  const thumbnails = [
    "QmYVKNWdm2961QtHz721tdA8dvBT116eT2DtATsX53Kt28",
  ];
  
  const cuts = [0.5];
  const royaltyDescriptions = ["Education Royalty"];
  const royaltyBeneficiaries = [
    "0xf8d6e0586b0a20c7"
  ];

  try {
    const transactionId = await fcl.mutate({
      cadence: `
        import NonFungibleToken from 0xDeployer
        import ExampleNFT from 0xStandard
        import MetadataViews from 0xStandard
        import FungibleToken from 0xStandard

        transaction(
        recipient: Address,
        name: String,
        description: String,
        thumbnail: String,
        cuts: [UFix64],
        royaltyDescriptions: [String],
        royaltyBeneficiaries: [Address]
    ) {

        /// local variable for storing the minter reference
        let minter: &ExampleNFT.NFTMinter

        /// Reference to the receiver's collection
        let recipientCollectionRef: &{NonFungibleToken.Receiver}

        prepare(signer: auth(BorrowValue) &Account) {

            let collectionData = ExampleNFT.resolveContractView(resourceType: nil, viewType: Type<MetadataViews.NFTCollectionData>()) as! MetadataViews.NFTCollectionData?
                ?? panic("ViewResolver does not resolve NFTCollectionData view")

            // borrow a reference to the NFTMinter resource in storage
            self.minter = signer.storage.borrow<&ExampleNFT.NFTMinter>(from: ExampleNFT.MinterStoragePath)
                ?? panic("Account does not store an object at the specified path")

            // Borrow the recipient's public NFT collection reference
            self.recipientCollectionRef = getAccount(recipient).capabilities.borrow<&{NonFungibleToken.Receiver}>(
                    collectionData.publicPath
                ) ?? panic("Could not get receiver reference to the NFT Collection")
        }

        pre {
            cuts.length == royaltyDescriptions.length && cuts.length == royaltyBeneficiaries.length: "Array length should be equal for royalty related details"
        }

        execute {

            // Mint the NFT and deposit it to the recipient's collection
            let mintedNFT <- self.minter.mintNFT(
                name: name,
                description: description,
                thumbnail: thumbnail,
                royalties: [] //royalties
            )
            self.recipientCollectionRef.deposit(token: <-mintedNFT)
        }

    }
      `,
      args: (arg, t) => [
        arg(recipient, t.Address),
        arg(names[0], t.String),
        arg(descriptions[0], t.String),
        arg(thumbnails[0], t.String),
        arg(cuts, t.Array(t.UFix64)),
        arg(royaltyDescriptions, t.Array(t.String)),
        arg(royaltyBeneficiaries.map(addr => fcl.withPrefix(addr)), t.Array(t.Address))
      ],
      proposer: serverAuthorization,
      payer: serverAuthorization,
      authorizations: [serverAuthorization],
      limit: 999
    });

    console.log('Transaction Id', transactionId);
  } catch (e) {
    console.log(e);
  }
}

mintNFTs(process.argv.slice(2)[0]);
