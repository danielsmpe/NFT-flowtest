import "CapabilityFactory"
import "FungibleToken"

pub contract FTBalanceFactory {
    pub struct Factory: CapabilityFactory.Factory {
        pub fun getCapability(acct: &AuthAccount, path: CapabilityPath): Capability {
            return acct.getCapability<&{FungibleToken.Balance}>(path)
        }
    }
}