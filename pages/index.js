import Head from 'next/head'
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css'
import * as fcl from "@onflow/fcl";
import "../flow/config.js";

export default function Home() {
  const [user, setUser] = useState({ loggedIn: false });
  const [list, setList] = useState([]);
  const [show, setShow] = useState(false)
  const [listedNFTIDs, setListedNFTIDs] = useState([]);
  const [listings, setListings] = useState([]);
  const [salePrice, setSalePrice] = useState("");
  const [expiry, setExpiry] = useState("");

  const handleExpiryChange = (e) => {
    const selectedDate = new Date(e.target.value);
    const unixTimestamp = Math.floor(selectedDate.getTime() / 1000);
    setExpiry(unixTimestamp);
  };

  useEffect(() => {
    fcl.currentUser().subscribe(setUser);
    fetchMarketplaceListings();
  }, [])

  useEffect(() => {
    setList([]);
  }, [user])


  async function setupExampleTokenVault() {
    try {
      const transactionId = await fcl.mutate({
        cadence: `
          import ExampleToken from 0xDeployer
          import FungibleToken from 0xee82856bf20e2aa6

          transaction {
            prepare(acct: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue) &Account) {
                // Check if the vault already exists to avoid overwriting it
                if acct.storage.borrow<&ExampleToken.Vault>(from: /storage/exampleTokenVault) == nil {
                    // Create and store the ExampleToken vault
                    let vault <- ExampleToken.createEmptyVault(vaultType: Type<@ExampleToken.Vault>())
                    acct.storage.save(<-vault, to: /storage/exampleTokenVault)
                }
            }
        }
        `,
        proposer: fcl.currentUser().authorization,
        payer: fcl.currentUser().authorization,
        authorizations: [fcl.currentUser().authorization],
        limit: 999
      });

      console.log('Vault setup transaction ID:', transactionId);
    } catch (error) {
      console.error('Error setting up ExampleToken vault:', error);
    }
  }

  async function getListingDetails(account, listingResourceID) {
    try {
      const result = await fcl.query({
        cadence: `
          import NFTStorefrontV2 from 0xDeployer
  
          access(all) fun main(account: Address, listingResourceID: UInt64): NFTStorefrontV2.ListingDetails {
              let storefrontRef = getAccount(account).capabilities.borrow<&{NFTStorefrontV2.StorefrontPublic}>(
                      NFTStorefrontV2.StorefrontPublicPath
                  ) ?? panic("Could not borrow public storefront from address")
              let listing = storefrontRef.borrowListing(listingResourceID: listingResourceID)
                  ?? panic("No listing with that ID")
              
              return listing.getDetails()
          }
        `,
        args: (arg, t) => [arg(account, t.Address), arg(listingResourceID, t.UInt64)]
      });
      return result;
    } catch (error) {
      console.error('Error fetching listing details:', error);
    }
  }
  
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
      args: (arg, t) => [arg(user?.addr, t.Address)]
    });

    const listingResourceIDs = await fcl.query({
      cadence: `
      import NFTStorefrontV2 from 0xDeployer

      access(all) fun main(account: Address): [UInt64] {
          return getAccount(account).capabilities.borrow<&{NFTStorefrontV2.StorefrontPublic}>(
                  NFTStorefrontV2.StorefrontPublicPath
              )?.getListingIDs()
              ?? panic("Could not borrow public storefront from address")
      }
      `,
      args: (arg, t) => [arg(user?.addr, t.Address)],
    });

    const fetchedListedNFTIDs = await Promise.all(
      listingResourceIDs.map(async (listingResourceID) => {
        const listingDetails = await fcl.query({
          cadence: `
          import NFTStorefrontV2 from 0xDeployer

          access(all) fun main(account: Address, listingResourceID: UInt64): NFTStorefrontV2.ListingDetails {
              let storefrontRef = getAccount(account).capabilities.borrow<&{NFTStorefrontV2.StorefrontPublic}>(
                      NFTStorefrontV2.StorefrontPublicPath
                  ) ?? panic("Could not borrow public storefront from address")
              let listing = storefrontRef.borrowListing(listingResourceID: listingResourceID)
                  ?? panic("No listing with that ID")

              let listingDetails = listing.getDetails()
              return listingDetails
          }
          `,
          args: (arg, t) => [
            arg(user?.addr, t.Address),
            arg(listingResourceID, t.UInt64),
          ],
        });
        return listingDetails.nftID; // Ambil nftID dari setiap listing
      })
    );
    
    setList(result);
    setListedNFTIDs(fetchedListedNFTIDs);
    setShow(true);
  }

  async function buyNFT(listingResourceID, storefrontAddress) {
    console.log("Listing Resource ID to Buy:", listingResourceID);
    console.log("Listing Resource ID to Buy:", listingResourceID);
    const commissionRecipient = "0xf8d6e0586b0a20c7"

    try {
        const transactionId = await fcl.mutate({
            cadence: `
            import ExampleNFT from 0xStandard
            import MetadataViews from 0xStandard
            import ExampleToken from 0xStandard
            import NonFungibleToken from 0xStandard
            import NFTStorefrontV2 from 0xDeployer
            import FungibleToken from 0xee82856bf20e2aa6

           transaction(listingResourceID: UInt64, storefrontAddress: Address, commissionRecipient: Address?) {

          let paymentVault: @{FungibleToken.Vault}
          let exampleNFTReceiver: &{NonFungibleToken.Receiver}
          let storefront: &{NFTStorefrontV2.StorefrontPublic}
          let listing: &{NFTStorefrontV2.ListingPublic}
          var commissionRecipientCap: Capability<&{FungibleToken.Receiver}>?

          prepare(acct: auth(BorrowValue) &Account) {
              self.commissionRecipientCap = nil
              // Access the storefront public resource of the seller to purchase the listing.
              self.storefront = getAccount(storefrontAddress).capabilities.borrow<&{NFTStorefrontV2.StorefrontPublic}>(
                      NFTStorefrontV2.StorefrontPublicPath
                  ) ?? panic("Could not borrow Storefront from provided address")

              // Borrow the listing
              self.listing = self.storefront.borrowListing(listingResourceID: listingResourceID)
                  ?? panic("No Offer with that ID in Storefront")
              let price = self.listing.getDetails().salePrice

              // Access the vault of the buyer to pay the sale price of the listing.
              let mainVault = acct.storage.borrow<auth(FungibleToken.Withdraw) &ExampleToken.Vault>(from: /storage/exampleTokenVault)
                  ?? panic("Cannot borrow ExampleToken vault from acct storage")
              self.paymentVault <- mainVault.withdraw(amount: price)

              // Access the buyer's NFT collection to store the purchased NFT.
              let collectionData = ExampleNFT.resolveContractView(resourceType: nil, viewType: Type<MetadataViews.NFTCollectionData>()) as! MetadataViews.NFTCollectionData?
                  ?? panic("ViewResolver does not resolve NFTCollectionData view")
              self.exampleNFTReceiver = acct.capabilities.borrow<&{NonFungibleToken.Receiver}>(collectionData.publicPath)
                  ?? panic("Cannot borrow NFT collection receiver from account")

              // Fetch the commission amt.
              let commissionAmount = self.listing.getDetails().commissionAmount

              if commissionRecipient != nil && commissionAmount != 0.0 {
                  // Access the capability to receive the commission.
                  let _commissionRecipientCap = getAccount(commissionRecipient!).capabilities.get<&{FungibleToken.Receiver}>(
                          /public/exampleTokenReceiver
                      )
                  assert(_commissionRecipientCap.check(), message: "Commission Recipient doesn't have exampletoken receiving capability")
                  self.commissionRecipientCap = _commissionRecipientCap
              } else if commissionAmount == 0.0 {
                  self.commissionRecipientCap = nil
              } else {
                  panic("Commission recipient can not be empty when commission amount is non zero")
              }
          }

          execute {
              // Purchase the NFT
              let item <- self.listing.purchase(
                  payment: <-self.paymentVault,
                  commissionRecipient: self.commissionRecipientCap
              )
              // Deposit the NFT in the buyer's collection.
              self.exampleNFTReceiver.deposit(token: <-item)
          }
      }
            `,
            args: (arg, t) => [
              arg(listingResourceID, t.UInt64),
              arg(storefrontAddress, t.Address),
              arg(commissionRecipient, t.Optional(t.Address))
            ],
            proposer: fcl.authz,
            payer: fcl.authz,
            authorizations: [fcl.authz],
            limit: 999
        });

        console.log('Transaction Id:', transactionId);
        window.location.reload();
    } catch (error) {
        console.error('Error buying NFT:', error);
    }
  }

  async function listForSale(nftID, salePrice, customID, expiry) {
    const commissionAmount = 0.05
    const marketplacesAddress = ["0xf8d6e0586b0a20c7"]
    try {
      const transactionId = await fcl.mutate({
        cadence: `
          import ExampleToken from 0xDeployer
          import FungibleToken from 0xee82856bf20e2aa6
          import NonFungibleToken from 0xDeployer
          import ExampleNFT from 0xDeployer
          import MetadataViews from 0xDeployer
          import NFTStorefrontV2 from 0xDeployer
  
          transaction(
            saleItemID: UInt64,
            saleItemPrice: UFix64,
            customID: String?,
            commissionAmount: UFix64,
            expiry: UInt64,
            marketplacesAddress: [Address]
          ) {
            let tokenReceiver: Capability<&{FungibleToken.Receiver}>
            let exampleNFTProvider: Capability<auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}>
            let storefront: auth(NFTStorefrontV2.CreateListing) &NFTStorefrontV2.Storefront
            var saleCuts: [NFTStorefrontV2.SaleCut]
            var marketplacesCapability: [Capability<&{FungibleToken.Receiver}>]
  
             prepare(acct: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue) &Account) {
              self.saleCuts = []
              self.marketplacesCapability = []

              let collectionData = ExampleNFT.resolveContractView(resourceType: nil, viewType: Type<MetadataViews.NFTCollectionData>()) as! MetadataViews.NFTCollectionData?
                  ?? panic("ViewResolver does not resolve NFTCollectionData view")

              // Receiver for the sale cut.
              self.tokenReceiver = acct.capabilities.get<&{FungibleToken.Receiver}>(/public/exampleTokenReceiver)
              assert(self.tokenReceiver.borrow() != nil, message: "Missing or mis-typed ExampleToken receiver")

              self.exampleNFTProvider = acct.capabilities.storage.issue<auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}>(
                      collectionData.storagePath
                  )
              assert(self.exampleNFTProvider.check(), message: "Missing or mis-typed ExampleNFT provider")

              let collection = acct.capabilities.borrow<&{NonFungibleToken.Collection}>(
                      collectionData.publicPath
                  ) ?? panic("Could not borrow a reference to the signer's collection")

              var totalRoyaltyCut = 0.0
              let effectiveSaleItemPrice = saleItemPrice - commissionAmount
              let nft = collection.borrowNFT(saleItemID)!
              // Check whether the NFT implements the MetadataResolver or not.
              if nft.getViews().contains(Type<MetadataViews.Royalties>()) {
                  let royaltiesRef = nft.resolveView(Type<MetadataViews.Royalties>())?? panic("Unable to retrieve the royalties")
                  let royalties = (royaltiesRef as! MetadataViews.Royalties).getRoyalties()
                  for royalty in royalties {
                      // TODO - Verify the type of the vault and it should exists
                      self.saleCuts.append(
                          NFTStorefrontV2.SaleCut(
                              receiver: royalty.receiver,
                              amount: royalty.cut * effectiveSaleItemPrice
                          )
                      )
                      totalRoyaltyCut = totalRoyaltyCut + (royalty.cut * effectiveSaleItemPrice)
                  }
              }
              // Append the cut for the seller.
              self.saleCuts.append(
                  NFTStorefrontV2.SaleCut(
                      receiver: self.tokenReceiver,
                      amount: effectiveSaleItemPrice - totalRoyaltyCut
                  )
              )

              self.storefront = acct.storage.borrow<auth(NFTStorefrontV2.CreateListing) &NFTStorefrontV2.Storefront>(
                      from: NFTStorefrontV2.StorefrontStoragePath
                  ) ?? panic("Missing or mis-typed NFTStorefront Storefront")

              for marketplace in marketplacesAddress {
                  self.marketplacesCapability.append(
                      getAccount(marketplace).capabilities.get<&{FungibleToken.Receiver}>(/public/exampleTokenReceiver)
                  )
              }
          }

          execute {
              // Create listing
              self.storefront.createListing(
                  nftProviderCapability: self.exampleNFTProvider,
                  nftType: Type<@ExampleNFT.NFT>(),
                  nftID: saleItemID,
                  salePaymentVaultType: Type<@ExampleToken.Vault>(),
                  saleCuts: self.saleCuts,
                  marketplacesCapability: self.marketplacesCapability.length == 0 ? nil : self.marketplacesCapability,
                  customID: customID,
                  commissionAmount: commissionAmount,
                  expiry: expiry
              )
          }
      }
        `,
        
        args: (arg, t) => [
          arg(nftID, t.UInt64),
          arg(salePrice, t.UFix64),
          arg(customID, t.Optional(t.String)),
          arg(commissionAmount, t.UFix64),
          arg(expiry, t.UInt64),
          arg(marketplacesAddress, t.Array(t.Address))
        ],
        proposer: fcl.currentUser().authorization,
        payer: fcl.currentUser().authorization,
        authorizations: [fcl.currentUser().authorization],
        limit: 999
      });
  
      console.log('Transaction Id', transactionId);
  
      // Optionally reload the page or handle success
      window.location.reload();
    } catch (error) {
      console.error('Error listing NFT for sale:', error);
    }
  }

  async function fetchMarketplaceListings() {
    const listingAccounts = ["0xf8d6e0586b0a20c7"];
    const allListings = [];
  
    for (const account of listingAccounts) {
      const listingResourceIDs = await fcl.query({
        cadence: `
        import NFTStorefrontV2 from 0xDeployer
  
        access(all) fun main(account: Address): [UInt64] {
          return getAccount(account).capabilities.borrow<&{NFTStorefrontV2.StorefrontPublic}>(
            NFTStorefrontV2.StorefrontPublicPath
          )?.getListingIDs()
            ?? panic("Could not borrow public storefront from address")
        }
        `,
        args: (arg, t) => [arg(account, t.Address)],
      });
  
      // Step 2: For each listing ID, get listing details
      const accountListings = await Promise.all(
        listingResourceIDs.map(async (listingResourceID) => {
          const listingDetails = await fcl.query({
            cadence: `
            import NFTStorefrontV2 from 0xDeployer
  
            access(all) fun main(account: Address, listingResourceID: UInt64): NFTStorefrontV2.ListingDetails? {
              let storefrontRef = getAccount(account).capabilities.borrow<&{NFTStorefrontV2.StorefrontPublic}>(
                NFTStorefrontV2.StorefrontPublicPath
              ) ?? panic("Could not borrow public storefront from address")
              let listing = storefrontRef.borrowListing(listingResourceID: listingResourceID)
                ?? panic("No listing with that ID")
  
              // Only return details if the listing has not been purchased
              if listing.getDetails().purchased == false {
                return listing.getDetails()
              } else {
                return nil // Return nil for purchased listings
              }
            }
            `,
            args: (arg, t) => [
              arg(account, t.Address),
              arg(listingResourceID, t.UInt64),
            ],
          });
          // Only include listing details if they are not null (i.e., not purchased)
          return listingDetails ? { account, listingResourceID, ...listingDetails } : null;
        })
      );
  
      allListings.push(...accountListings.filter(Boolean));
    }
  
    // Process metadata fetching for the filtered listings
    const nftIDsByAccount = allListings.reduce((acc, { account, nftID }) => {
      if (!acc[account]) acc[account] = new Set();
      acc[account].add(nftID);
      return acc;
    }, {});
  
    const listedNFTs = [];
    for (const [account, nftIDs] of Object.entries(nftIDsByAccount)) {
      const nftMetadataList = await fcl.query({
        cadence: `
        import ExampleNFT from 0xDeployer
        import MetadataViews from 0xStandard
  
        access(all) fun main(address: Address): [NFT] {
          let collection = getAccount(address)
            .capabilities.get<&ExampleNFT.Collection>(ExampleNFT.CollectionPublicPath)
            .borrow()
            ?? panic("Could not borrow a reference to the collection")
  
          let ids = collection.getIDs()
          var answer: [NFT] = []
  
          for id in ids {
            let nft = collection.borrowViewResolver(id: id)
            let view = nft?.resolveView(Type<MetadataViews.Display>())
            
            if let unwrappedView = view {
              if let displayView = unwrappedView {
                if let display = displayView as? MetadataViews.Display {
                  answer.append(
                    NFT(
                      id: id, 
                      name: display.name, 
                      description: display.description, 
                      thumbnail: display.thumbnail
                    )
                  )
                }
              }
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
        args: (arg, t) => [arg(account, t.Address)],
      });
  
      console.log(`Fetched metadata for account ${account}:`, nftMetadataList);
  
      // Filter the retrieved metadata for listed nftIDs only
      const filteredMetadata = nftMetadataList.filter(nft => nftIDs.has(nft.id));
      listedNFTs.push(...filteredMetadata.map(nft => {
        const listing = allListings.find(listing => listing.nftID === nft.id && listing.account === account);
        return {
          account,
          nftID: nft.id,
          listingResourceID: listing ? listing.listingResourceID : null,
          name: nft.name,
          description: nft.description,
          thumbnail: nft.thumbnail.url,
        };
      }));
    }
  
    console.log("Final listed NFTs:", listedNFTs);
  
    setListings(listedNFTs);
  }
  
  async function setupStorefront() {
    try {
      const transactionId = await fcl.mutate({
        cadence: `
        import NFTStorefrontV2 from 0xDeployer
        import ExampleNFT from 0xDeployer

        transaction {
        prepare(acct: auth(IssueStorageCapabilityController, PublishCapability, Storage) &Account) {

            // If the account doesn't already have a Storefront
            if acct.storage.borrow<&NFTStorefrontV2.Storefront>(from: NFTStorefrontV2.StorefrontStoragePath) == nil {

                // Create a new empty Storefront
                let storefront <- NFTStorefrontV2.createStorefront() as! @NFTStorefrontV2.Storefront
                
                // save it to the account
                acct.storage.save(<-storefront, to: NFTStorefrontV2.StorefrontStoragePath)

                // create a public capability for the Storefront
                let storefrontPublicCap = acct.capabilities.storage.issue<&{NFTStorefrontV2.StorefrontPublic}>(
                        NFTStorefrontV2.StorefrontStoragePath
                    )
                acct.capabilities.publish(storefrontPublicCap, at: NFTStorefrontV2.StorefrontPublicPath)
            }
        }
    }
        `,
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
        
        <div className='flex flex-col items-center justify-center'>
        <div className='text-white py-10'>
        <div className="flex items-center justify-center pb-5">
        <h1 className={styles.sooth}>NFT Marketplace</h1>
        <div className="">
        <button onClick={setupExampleTokenVault} className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]"> setup vault flow token</button>
        </div>
        </div>
        {listings.length > 0 ? (
          <div className="grid grid-cols-3 gap-20 px-5">
            {listings.map((listing, index) => {
              const thumbnailUrl = listing.thumbnail ? `https://gateway.pinata.cloud/ipfs/${listing.thumbnail}` : '';

              return (
                <div
                  key={index}
                  className="border shadow-lg bg-[#38E8C6] border-[#38E8C6] bg-opacity-40 bg-clip-padding rounded-lg backdrop-blur-sm p-4"
                >
                  <div className="flex justify-center py-2">
                    {thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnailUrl} width={150} alt="NFT Thumbnail" />
                    )}
                  </div>
                  <p>Name: {listing.name || 'No Name Available'}</p>
                  <p>Description: {listing.description || 'No Description Available'}</p>
                  <p>Price: {listing.salePrice || 'No Price Available'}</p>
                  <p>Owner: {listing.account || 'anonymus'}</p>
                  <div className="flex justify-center items-center">
                    <button
                      onClick={() => buyNFT(listing.listingResourceID, listing.account)}
                      className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6] mt-2"
                    >
                      Buy
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No data available.</p>
        )}
        </div>
          {!user.loggedIn ? "" : <div className='flex space-x-5'>
            <button onClick={getNFTs} className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]">Get My NFTs</button>
            <button onClick={setupStorefront} className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]">Setup Listing Bucket</button>
          </div>}
          <div className='pt-12'>
          {show == false ? (
            <div className='flex flex-col justify-center items-center'>
              <h1 className='pt-5 font-semibold text-gray-600'>Nothing to see here...yet. Mint or get NFTs</h1>
            </div>
          ) : (
            <div className='grid grid-cols-3 gap-20 px-5'>
              {list
                .filter((nft) => !listedNFTIDs.includes(nft.id)) // Filter out already listed NFTs
                .map((nft, index) => (
                  <div
                    key={index}
                    className="border shadow-lg bg-[#38E8C6] border-[#38E8C6] bg-opacity-40 bg-clip-padding rounded-lg backdrop-blur-sm p-4"
                  >
                    <div className='flex justify-between pb-2'>
                      <h1 className='font-bold text-[#38E8C6] font-xl mr-4'>{nft.name}</h1>
                      <p className='text-[#38E8C6] font-semibold'>{nft.id}</p>
                    </div>
                    <p className='text-gray-300 text-md'>{nft.description}</p>
                    <div className='flex justify-center py-2'>
                      {/*eslint-disable-next-line @next/next/no-img-element*/}                      
                      <img
                        src={`https://gateway.pinata.cloud/ipfs/${nft.thumbnail.url}`}
                        width={150}
                        alt={`${nft.name} thumbnail`}
                      /> 
                    </div>
                    <div className="flex flex-col pt-2">
                      <input
                        type="text"
                        placeholder="Enter Sale Price(decimal)"
                        onChange={(e) => setSalePrice(e.target.value)}
                        className="px-4 mb-1 py-1 focus:outline-none focus:border-[#38E8C6] focus:border-2 bg-green-100 border rounded-lg border-[#38E8C6]"
                      />
                      <input
                        type="datetime-local"
                        onChange={handleExpiryChange}
                        className="px-4 mb-1 py-1 focus:outline-none focus:border-[#38E8C6] focus:border-2 bg-green-100 border rounded-lg border-[#38E8C6]"
                      />
                      <button
                        onClick={() =>
                          listForSale(
                            nft.id,                // saleItemID
                            salePrice,             // saleItemPrice
                            `listing-${Date.now()}`, // customID
                            expiry,                // expiry
                          )
                        }
                        className="border rounded-lg py-2 text-sm px-5 border-[#38E8C6] text-blue-900 font-bold bg-[#38E8C6]"
                      >
                        List For Sale
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  )
}
