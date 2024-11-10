import ExampleNFT from "../ExampleNFT.cdc"
import NonFungibleToken from "../utility/NonFungibleToken.cdc"

transaction(names: [String], descriptions: [String], thumbnails: [String], recipient: Address) {
  let RecipientCollection: &{NonFungibleToken.CollectionPublic}
  
  prepare(signer: auth(SaveValue,LoadValue,BorrowValue) &Account) {
    self.RecipientCollection = getAccount(recipient).capabilities.get(ExampleNFT.CollectionPublicPath)
                                .borrow<&{NonFungibleToken.CollectionPublic}>()
                                ?? panic("The recipient has not set up an ExampleNFT Collection yet.")
  }

  execute {
    var i = 0
    while i < names.length {
      ExampleNFT.mintNFT(recipient: self.RecipientCollection, name: names[i], description: descriptions[i], thumbnail: thumbnails[i])
      i = i + 1
    }
  }
}
