import Head from 'next/head'
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css'
import * as fcl from "@onflow/fcl";
import "../flow/config.js";

export default function Home() {
  const [user, setUser] = useState({ loggedIn: false });
  const [list, setList] = useState([]);
  const [show, setShow] = useState(false)
  const [recipient, setRecipient] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [listings, setListings] = useState([]);


  // This keeps track of the logged in 
  // user for you automatically.
  useEffect(() => {
    fcl.currentUser().subscribe(setUser);
    fetchMarketplaceListings();
  }, [])

  useEffect(() => {
    setList([]);
  }, [user])


  async function getNFTs() {

    const result = await fcl.query({
      cadence: `
      import ExampleNFT from 0xDeployer
      import MetadataViews from 0xStandard
    
      access(all) fun main(address: Address): [NFT] {
        let collection = getAccount(address)
          .capabilities.get<&ExampleNFT.Collection>(ExampleNFT.CollectionPublicPath)
          .borrow()
          ?? panic("Could not borrow a reference to the collection")
    
        let ids = collection.getIDs()
        let answer: [NFT] = []
    
        for id in ids {
        let nft = collection.borrowViewResolver(id: id)
        let view = nft?.resolveView(Type<MetadataViews.Display>())

        if let unwrappedView = view {
          if let displayView = unwrappedView {
            if let display = displayView as? MetadataViews.Display {
              log("Fetched Metadata for NFT ID: ".concat(id.toString()))
              log("Name: ".concat(display.name))
              log("Description: ".concat(display.description))
        
              answer.append(
                  NFT(
                      id: id, 
                      name: display.name, 
                      description: display.description, 
                      thumbnail: display.thumbnail
                  )
              )
          } else {
            log("Could not cast to MetadataViews.Display for NFT ID: ".concat(id.toString()))
          }
      }
  } else {
    log("View is nil for NFT ID: ".concat(id.toString()))
  }
}

        return answer
      }
    
      access(all) struct NFT {
        access(all) let id: UInt64
        access(all) let name: String 
        access(all) let description: String 
        access(all) let thumbnail: {MetadataViews.File}
        
        init(id: UInt64, name: String, description: String, thumbnail: {MetadataViews.File}) {
          self.id = id
          self.name = name 
          self.description = description
          self.thumbnail = thumbnail
        }
      }
      `,
      args: (arg, t) => [
        arg(user?.addr, t.Address)
      ]
    });
    
    

    setList(result);
    console.log(result)
    setShow(true);
  }

  async function buyNFT(listingResourceID, storefrontAddress) {
    console.log("Listing Resource ID to Buy:", listingResourceID);
    try {
        const transactionId = await fcl.mutate({
            cadence: `
            import ExampleNFT from 0xDeployer
            import MetadataViews from 0xStandard
            import ExampleToken from 0xStandard
            import NonFungibleToken from 0xStandard
            import NFTStorefront from 0xStandard
            import FungibleToken from 0xee82856bf20e2aa6

            transaction(listingResourceID: UInt64, storefrontAddress: Address) {

                let paymentVault: @{FungibleToken.Vault}
                let exampleNFTReceiver: &{NonFungibleToken.Receiver}
                let storefront: &{NFTStorefront.StorefrontPublic}
                let listing: &{NFTStorefront.ListingPublic}

                prepare(acct: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue) &Account) {
                    // Borrow the storefront capability from the seller's account
                    self.storefront = getAccount(storefrontAddress)
                        .capabilities.get<&{NFTStorefront.StorefrontPublic}>(NFTStorefront.StorefrontPublicPath)
                        .borrow()
                        ?? panic("Could not borrow StorefrontPublic from provided address")
                    
                    // Borrow the listing using the provided listingResourceID
                    self.listing = self.storefront.borrowListing(listingResourceID: listingResourceID)
                        ?? panic("No listing with that ID in Storefront")
                    
                    // Get the sale price of the listing
                    let price = self.listing.getDetails().salePrice

                    // Withdraw the required amount from the buyer's vault
                    let mainVault = acct.storage.borrow<auth(FungibleToken.Withdraw) &ExampleToken.Vault>(from: /storage/exampleTokenVault)
                        ?? panic("Cannot borrow ExampleToken vault from buyer's storage")
                    self.paymentVault <- mainVault.withdraw(amount: price)

                    // Get the NFT receiver capability for the buyer's collection
                    let collectionDataOpt = ExampleNFT.resolveContractView(
                        resourceType: Type<@ExampleNFT.NFT>(), 
                        viewType: Type<MetadataViews.NFTCollectionData>()
                    ) ?? panic("Missing collection data")

                    let collectionData = collectionDataOpt as! MetadataViews.NFTCollectionData
                    self.exampleNFTReceiver = acct.capabilities.get<&{NonFungibleToken.Receiver}>(collectionData.publicPath)
                        .borrow()
                        ?? panic("Cannot borrow NFT collection receiver from buyer's account")
                }

                execute {
                    // Purchase the NFT, transferring the payment and receiving the NFT in return
                    let item <- self.listing.purchase(
                        payment: <-self.paymentVault
                    )

                    // Deposit the purchased NFT into the buyer's collection
                    self.exampleNFTReceiver.deposit(token: <-item)

                    // Remove the listing from the storefront after purchase
                    self.storefront.cleanup(listingResourceID: listingResourceID)
                }
            }
            `,
            args: (arg, t) => [
                arg(listingResourceID, t.UInt64),
                arg(storefrontAddress, t.Address)
            ],
            proposer: fcl.authz,
            payer: fcl.authz,
            authorizations: [fcl.authz],
            limit: 999
        });

        console.log('Transaction Id:', transactionId);
    } catch (error) {
        console.error('Error buying NFT:', error);
    }
  }

  async function listForSale(nftID, price, name, description, thumbnail) {
    console.log(nftID, price, name, description, thumbnail);
    try {
        const transactionId = await fcl.mutate({
            cadence: `
            import ExampleNFT from 0xDeployer
            import MetadataViews from 0xStandard
            import ExampleToken from 0xStandard
            import NonFungibleToken from 0xStandard
            import NFTStorefront from 0xStandard
            import FungibleToken from 0xee82856bf20e2aa6

            transaction(
                saleItemID: UInt64,
                saleItemPrice: UFix64,
                name: String,
                description: String,
                thumbnail: String
            ) {
                let exampleTokenReceiver: Capability<&{FungibleToken.Receiver}>
                let exampleNFTProvider: Capability<auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}>
                let storefront: auth(NFTStorefront.CreateListing) &NFTStorefront.Storefront

                prepare(acct: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue) &Account) {
                    let collectionDataOpt = ExampleNFT.resolveContractView(resourceType: Type<@ExampleNFT.NFT>(), viewType: Type<MetadataViews.NFTCollectionData>())
                        ?? panic("Missing collection data")
                    let collectionData = collectionDataOpt as! MetadataViews.NFTCollectionData

                    // Get the ExampleToken receiver capability
                    self.exampleTokenReceiver = acct.capabilities.get<&{FungibleToken.Receiver}>(/public/exampleTokenReceiver)
                    assert(self.exampleTokenReceiver.check(), message: "Missing or mis-typed ExampleToken Receiver")

                    // Get the NFT provider capability
                    self.exampleNFTProvider = acct.capabilities.storage.issue<auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}>(
                            collectionData.storagePath
                        )
                    assert(self.exampleNFTProvider.check(), message: "Missing or mis-typed ExampleNFT provider")

                    // If the account doesn't already have a Storefront, create and link it
                    if acct.storage.borrow<&NFTStorefront.Storefront>(from: NFTStorefront.StorefrontStoragePath) == nil {
                        acct.storage.save(<-NFTStorefront.createStorefront(), to: NFTStorefront.StorefrontStoragePath)
                        // create a public capability for the .Storefront & publish
                        let storefrontPublicCap = acct.capabilities.storage.issue<&{NFTStorefront.StorefrontPublic}>(
                            NFTStorefront.StorefrontStoragePath
                        )
                        acct.capabilities.publish(storefrontPublicCap, at: NFTStorefront.StorefrontPublicPath)
                    }

                    // Borrow the storefront to create a listing
                    self.storefront = acct.storage.borrow<auth(NFTStorefront.CreateListing) &NFTStorefront.Storefront>(
                        from: NFTStorefront.StorefrontStoragePath
                    ) ?? panic("Missing or mis-typed NFTStorefront Storefront")
                }

                execute {
                    let saleCut = NFTStorefront.SaleCut(
                        receiver: self.exampleTokenReceiver,
                        amount: saleItemPrice
                    )
                    let listingResourceID = self.storefront.createListing(
                        nftProviderCapability: self.exampleNFTProvider,
                        nftType: Type<@ExampleNFT.NFT>(),
                        nftID: saleItemID,
                        salePaymentVaultType: Type<@ExampleToken.Vault>(),
                        saleCuts: [saleCut],
                        name: name,
                        description: description,
                        thumbnail: thumbnail
                    )
                        log("Listing Created with ID: \(listingResourceID)")
                }
            }
            `,
            
            args: (arg, t) => [
                arg(nftID, t.UInt64),
                arg(price, t.UFix64),
                arg(name, t.String),
                arg(description, t.String),
                arg(JSON.stringify(thumbnail), t.String)
            ],
            proposer: fcl.authz,
            payer: fcl.authz,
            authorizations: [fcl.authz],
            limit: 999
        });

        console.log('Transaction Id', transactionId);
    } catch (error) {
        console.error('Error listing NFT for sale:', error);
    }
  }

  async function fetchMarketplaceListings() {
    try {
      const result = await fcl.query({
        cadence: `
          import NFTStorefront from 0xDeployer
          import NonFungibleToken from 0xDeployer 

        access(all) fun main(): {Address: [{UInt64: NFTStorefront.ListingDetails}]} {
          // Define the addresses of accounts you want to check
          let accountAddresses: [Address] = [0xf8d6e0586b0a20c7] // Replace with actual addresses to check

          // Initialize a dictionary to store listing details by account
          let allListings: {Address: [{UInt64: NFTStorefront.ListingDetails}]} = {}

          for address in accountAddresses {
            let storefrontRef = getAccount(address)
              .capabilities.get<&{NFTStorefront.StorefrontPublic}>(NFTStorefront.StorefrontPublicPath)
              .borrow()

            if storefrontRef != nil {
            let listingIds = storefrontRef!.getListingIDs()
            var listings: [{UInt64: NFTStorefront.ListingDetails}] = []

            for listingId in listingIds {
                let listing = storefrontRef!.borrowListing(listingResourceID: listingId)
                log(listingIds)
                
                if listing != nil {
                    // Create a dictionary with listingId and its details
                    let listingData: {UInt64: NFTStorefront.ListingDetails} = {listingId: listing!.getDetails()}
                    listings.append(listingData)
                }
            }
            allListings[address] = listings
        }
      }
        return allListings
        }
        `,
        args: (arg, t) => [] 
      });

      setListings(result);
      console.log("Marketplace listings:", result);
    } catch (error) {
      console.error("Error fetching marketplace listings:", error);
    }
  }


  async function setupStorefront() {
    try {
      const transactionId = await fcl.mutate({
        cadence: `
        import NFTStorefront from 0xDeployer

        transaction {
        prepare(acct: auth(IssueStorageCapabilityController, PublishCapability, Storage) &Account) {

            // If the account doesn't already have a Storefront
            if acct.storage.borrow<&NFTStorefront.Storefront>(from: NFTStorefront.StorefrontStoragePath) == nil {

                // Create a new empty .Storefront
                let storefront <- NFTStorefront.createStorefront()
                
                // save it to the account
                acct.storage.save(<-storefront, to: NFTStorefront.StorefrontStoragePath)

                // create a public capability for the .Storefront & publish
                let storefrontPublicCap = acct.capabilities.storage.issue<&{NFTStorefront.StorefrontPublic}>(
                        NFTStorefront.StorefrontStoragePath
                    )
                acct.capabilities.publish(storefrontPublicCap, at: NFTStorefront.StorefrontPublicPath)
            }
        }
    }`,
        proposer: fcl.currentUser().authorization,
        payer: fcl.currentUser().authorization,
        authorizations: [fcl.currentUser().authorization],
        limit: 50,
      });
      console.log(`Transaction ID: ${transactionId}`);
  
      const txStatus = await fcl.tx(transactionId).onceSealed();
      console.log("Transaction status:", txStatus);
    } catch (error) {
      console.error("Error setting up storefront:", error);
    }
  }

  return (
    <div className='bg-[#011E30] flex flex-col min-h-screen'>
      <Head>
        <title>NFT</title>
        <meta name="description" content="Used by Emerald Academy" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className='container mx-auto flex-1 p-5'>
        <div className='mb-10 flex justify-between items-center pr-10 pt-2'>
          <h1 className={styles.sooth}>NFT</h1>
          <div className='flex space-x-4 items-center'>
            <h1 className='text-[#38E8C6]'>Address: </h1>
            <h1 className='border px-7 text-center text-[#38E8C6] text-sm py-1 rounded-xl border-[#38E8C6] w-56'>{user.loggedIn ? user.addr : "Please connect wallet -->"}</h1>
          </div>
          <div>{!user.loggedIn ? <button className='border rounded-xl border-[#38E8C6] px-5 text-sm text-[#38E8C6] py-1'
            onClick={fcl.authenticate}>Connect</button> : <button className='border rounded-xl border-[#38E8C6]
          px-5 text-sm text-[#38E8C6] py-1' onClick={fcl.unauthenticate}>Logout</button>}
          </div>
        </div>
        <hr className='border-[#38E8C6]' />
        
        <div className='flex  flex-col items-center justify-center'>
        <div className='text-white py-10'>
        <div className="flex items-center justify-center pb-5">
        <h1 className={styles.sooth}>NFT Marketplace</h1>
        </div>
        {Object.keys(listings).length > 0 ? (
          Object.keys(listings).map((addressKey, addressIndex) => (
            <div key={addressIndex} className='grid grid-cols-3 gap-20 px-5'>
              {listings[addressKey].map((listingData, index) => {
                const [listingKey] = Object.keys(listingData); // Extract the unique listing ID key
                const listing = listingData[listingKey];

                // Parse the thumbnail URL, if available
                const thumbnailUrl = listing.thumbnail ? JSON.parse(listing.thumbnail).url : '';

                return (
                  <div
                    key={index}
                    className="border shadow-lg bg-[#38E8C6] border-[#38E8C6] bg-opacity-40 bg-clip-padding rounded-lg backdrop-blur-sm p-4"
                  >
                    <div className='flex justify-center py-2'>
                      {thumbnailUrl && (
                        <img src={`https://gateway.pinata.cloud/ipfs/${thumbnailUrl}`} width={150} alt="NFT Thumbnail" />
                      )}
                    </div>
                    <p>Name: {listing.name || 'No Name Available'}</p>
                    <p>Description: {listing.description || 'No Description Available'}</p>
                    <p>Price: {listing.salePrice || 'No Price Available'}</p>
                    <div className='flex justify-center items-center'>
                      <button
                        onClick={() => buyNFT(listingKey, addressKey)}
                        className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]"
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <p>No data available.</p>
        )}
        </div>
          {!user.loggedIn ? "" : <div className='flex space-x-5'>
            <button onClick={getNFTs} className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]">Get My NFTs</button>
          </div>}
          <div className='pt-12'>
            {show == false ? <div className='flex flex-col justify-center items-center'>
              <h1 className='pt-5 font-semibold text-gray-600'>Nothing to see here...yet. mint or get NFTs</h1>
            </div> :
              <div className='grid grid-cols-3 gap-20 px-5'>
                {list.map((nft, index) => (
                  <div key={index} className="border shadow-lg bg-[#38E8C6] border-[#38E8C6] bg-opacity-40 bg-clip-padding rounded-lg backdrop-blur-sm p-4">
                    <div className='flex justify-between pb-2'>
                      <h1 className='font-bold text-[#38E8C6] font-xl'>{nft.name}</h1>
                      <p className='text-[#38E8C6] font-semibold'>{nft.id}</p>
                    </div>
                    <p className='text-gray-300 text-md'>{nft.description}</p>
                    <div className='flex justify-center py-2'>
                      <img src={`https://gateway.pinata.cloud/ipfs/${nft.thumbnail.url}`} width={150} />
                    </div>
                    <div className="flex flex-col pt-2">
                    <input
                      type="text"
                      placeholder="Enter Sale Price"
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="px-4 mb-1 py-1 focus:outline-none focus:border-[#38E8C6] focus:border-2 bg-green-100 border rounded-lg border-[#38E8C6]"
                    />
                    <button onClick={() => listForSale(nft.id, salePrice,nft.name,nft.description,nft.thumbnail)} className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]">
                      List For Sale
                    </button>
                  </div>
                  </div>
                ))}
              </div>}
          </div>
        </div>
      </main>
    </div>
  )
}
