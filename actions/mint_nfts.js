const fcl = require("@onflow/fcl");
const { serverAuthorization } = require("./auth/authorization.js");
require("../flow/config.js");

async function mintNFTs(recipient) {
  const names = ["NFT Name 2"];
  const descriptions = ["Description of the NFT 2"];
  const thumbnails = ["QmYVKNWdm2961QtHz721tdA8dvBT116eT2DtATsX53Kt28"];
  
  const cuts = [0.05, 0.1];
  const royaltyDescriptions = ["Artist Royalty", "Platform Fee"];
  const royaltyBeneficiaries = [
    "0xf8d6e0586b0a20c7",
    "0x01cf0e2f2f715450"
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

          let minter: &ExampleNFT.NFTMinter
          let recipientCollectionRef: &{NonFungibleToken.Receiver}

          prepare(signer: auth(BorrowValue) &Account) {
            let collectionData = ExampleNFT.resolveContractView(resourceType: nil, viewType: Type<MetadataViews.NFTCollectionData>()) as! MetadataViews.NFTCollectionData?
                ?? panic("ViewResolver does not resolve NFTCollectionData view")

            self.minter = signer.storage.borrow<&ExampleNFT.NFTMinter>(from: ExampleNFT.MinterStoragePath)
                ?? panic("Account does not store an object at the specified path")

            self.recipientCollectionRef = getAccount(recipient).capabilities.borrow<&{NonFungibleToken.Receiver}>(
                collectionData.publicPath
            ) ?? panic("Could not get receiver reference to the NFT Collection")
          }

          pre {
            cuts.length == royaltyDescriptions.length && cuts.length == royaltyBeneficiaries.length: "Array length should be equal for royalty related details"
          }

          execute {
            let mintedNFT <- self.minter.mintNFT(
                name: name,
                description: description,
                thumbnail: thumbnail,
                royalties: []
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
