import ExampleNFT from "../ExampleNFT.cdc"
import NonFungibleToken from "../utility/NonFungibleToken.cdc"

transaction(name: String, description: String, thumbnail: String, recipient: Address) {
  let RecipientCollection: &{NonFungibleToken.CollectionPublic}
  
  prepare(signer: auth(SaveValue,LoadValue,BorrowValue) &Account) {
    self.RecipientCollection = getAccount(recipient).capabilities.get(ExampleNFT.CollectionPublicPath)
                                .borrow<&{NonFungibleToken.CollectionPublic}>()
                                ?? panic("The recipient has not set up an ExampleNFT Collection yet.")
  }

  execute {
    ExampleNFT.mintNFT(recipient: self.RecipientCollection, name: name, description: description, thumbnail: thumbnail)
  }
}