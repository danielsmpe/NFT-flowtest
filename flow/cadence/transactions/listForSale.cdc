import NFTMarketplace from 0xMarketplace
import ExampleNFT from 0xDeployer
import NonFungibleToken from 0xStandard

transaction(nftID: UInt64, price: UFix64) {
    let sellerCollection: &{NonFungibleToken.CollectionPublic}

    prepare(seller: AuthAccount) {
        self.sellerCollection = seller.borrow<&{NonFungibleToken.CollectionPublic}>(
            from: ExampleNFT.CollectionPublicPath
        ) ?? panic("Could not borrow seller's collection")

        let nft <- self.sellerCollection.withdraw(withdrawID: nftID)
        NFTMarketplace.createListing(nftID: nftID, price: price, seller: seller.address)
        destroy nft
    }

    execute {
        log("NFT listed for sale")
    }
}
