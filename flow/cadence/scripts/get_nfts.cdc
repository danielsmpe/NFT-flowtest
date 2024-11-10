import ExampleNFT from "../ExampleNFT.cdc"
import MetadataViews from "../utility/MetadataViews.cdc"

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

access(all) fun main(address: Address): [NFT] {
  let collection = getAccount(address).capabilities.get&ExampleNFT.Collection>(ExampleNFT.CollectionPublicPath)
                    .borrow()
                    ?? panic("Could not borrow a reference to the collection")

  let ids = collection.getIDs()

  let answer: [NFT] = []

  for id in ids {
    // Get the basic display information for this NFT
    let nft = collection.borrowViewResolver(id: id)
    // Get the basic display information for this NFT
    let view = nft.resolveView(Type<MetadataViews.Display>())!
    let display = view as! MetadataViews.Display
    answer.append(
      NFT(
        id: id, 
        name: display.name, 
        description: display.description, 
        thumbnail: display.thumbnail
      )
    )
  }

  return answer
}