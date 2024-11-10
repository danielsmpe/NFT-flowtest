import "NonFungibleToken"
import "MetadataViews"
import "ExampleNFT"

access(all) contract NFTMarketplace {

    access(all) let CollectionStoragePath: StoragePath

    access(all) struct Listing {
        access(all) let nftID: UInt64
        access(all) let seller: Address
        access(all) let price: UFix64
        access(all) let name: String
        access(all) let description: String
        access(all) let thumbnail: String

        init(nftID: UInt64, seller: Address, price: UFix64, name: String, description: String, thumbnail: String) {
            self.nftID = nftID
            self.seller = seller
            self.price = price
            self.name = name
            self.description = description
            self.thumbnail = thumbnail
        }
    }

    access(all) var listings: {UInt64: Listing}
    access(all) var nextListingID: UInt64

    init() {
        self.listings = {}
        self.nextListingID = 0
        self.CollectionStoragePath = /storage/NFTMarketplaceCollection
    }

    // Updated listForSale function
    access(all) fun listForSale(nftID: UInt64, price: UFix64, provider: &ExampleNFT.Collection) {
        let nftRef = provider.borrowNFT(nftID) 
            ?? panic("NFT not found in provider collection")

        let sellerAddress = provider.owner?.address 
            ?? panic("Could not get the seller address")

        // Retrieve display metadata
        let displayView = nftRef.resolveView(Type<MetadataViews.Display>()) 
            ?? panic("NFT does not implement MetadataViews.Display")
        
        let displayData = displayView as! MetadataViews.Display
        let name = displayData.name
        let description = displayData.description
        let thumbnail = displayData.thumbnail.uri() 

        // Create listing with additional metadata
        self.createListing(nftID: nftID, price: price, seller: sellerAddress, name: name, description: description, thumbnail: thumbnail)
    }

    // Updated createListing function to accept new fields
    access(all) fun createListing(nftID: UInt64, price: UFix64, seller: Address, name: String, description: String, thumbnail: String) {
        let listingID = self.nextListingID
        self.listings[listingID] = Listing(nftID: nftID, seller: seller, price: price, name: name, description: description, thumbnail: thumbnail)
        self.nextListingID = self.nextListingID + 1
    }

    // Function to get all listings in the marketplace
    access(all) fun getListings(): [{String: AnyStruct}] {
        var listingDetails: [{String: AnyStruct}] = []

        for listing in self.listings.values {
            listingDetails.append({
                "listingID": listing.nftID,
                "seller": listing.seller,
                "price": listing.price,
                "name": listing.name,
                "description": listing.description,
                "thumbnail": listing.thumbnail
            })
        }

        return listingDetails
    }
}
