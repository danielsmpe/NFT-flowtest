const fcl = require("@onflow/fcl");
const { serverAuthorization } = require("./auth/authorization.js");
require("../flow/config.js");

async function burnNFT(nftID) {
  try {
    const transactionId = await fcl.mutate({
      cadence: `
      import ExampleNFT from 0xDeployer
      import NonFungibleToken from 0xNft
      import MetadataViews from 0xNft
      import Burner from 0xNft
      
      transaction(id: UInt64) {

      /// Reference that will be used for the owner's collection
      let collectionRef: auth(NonFungibleToken.Withdraw) &ExampleNFT.Collection

      prepare(signer: auth(BorrowValue) &Account) {
          let collectionData = ExampleNFT.resolveContractView(resourceType: nil, viewType: Type<MetadataViews.NFTCollectionData>()) as! MetadataViews.NFTCollectionData?
              ?? panic("Could not resolve NFTCollectionData view. The ExampleNFT contract needs to implement the NFTCollectionData Metadata view in order to execute this transaction")
              
          // borrow a reference to the owner's collection
          self.collectionRef = signer.storage.borrow<auth(NonFungibleToken.Withdraw) &ExampleNFT.Collection>(
                  from: collectionData.storagePath
              ) ?? panic("The signer does not store an ExampleNFT.Collection object at the path "
                          .concat(collectionData.storagePath.toString())
                          .concat(". The signer must initialize their account with this collection first!"))

      }

      execute {
          let nft <- self.collectionRef.withdraw(withdrawID: id)

          Burner.burn(<-nft)
      }

      post {
          !self.collectionRef.getIDs().contains(id): "The NFT with the specified ID should have been deleted."
      }
  }
      `,
      args: (arg, t) => [
        arg(Number(nftID), t.UInt64)
      ],
      proposer: serverAuthorization,
      payer: serverAuthorization,
      authorizations: [serverAuthorization],
      limit: 999
    });

    console.log('Transaction Id', transactionId);
  } catch (e) {
    console.error("Error executing burnNFT:", e);
  }
}

// Parse the single NFT ID from command-line arguments and execute burnNFT
const nftID = process.argv[2];
burnNFT(nftID);
