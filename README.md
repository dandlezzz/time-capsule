### WORK IN PROGRESS - DO NOT USE. yet.



# TIME CAPSULE
Don't be a paper-handed bitch. Are you a hodler or a sodler? Take the time capsule challenge. This program lets you lock your NFT or fungible tokens in escrow until a specified time. That's it. You lock the tokens up in Escrow and when the time comes you can get them back. Everyone can see your proof of hodl and you will be free of the temptation to sell. Lock your tokens up people. Don't let the day-to-day whims of the market interfere with the clarity of judgment you achieved after reading this document!


## Proof of Hodl
Using this protocol allows for the generation of a hodl-receipt! The hodl-receipt is a perma-link to a perma-site, thanks arweave, that shows the world what is locked away and for how long! Also, since your assets will be locked away for a long time, the receipt site offers you a guarantee that you will have an easy way to unlock your escrow account when the time comes.

## Tech Stuff
This code borrows heavily from the anchor-escrow program. It's quite simple. Two instructions, 
### initialize: 
  opens the escrow account, deposits the token_account, and sets the lock_until, a timestamp on the escrow.
### withdraw: 
  closes the escrow account, returns tokens if and only if the clock is passed the lock_until.
  
  
  


### TODO
- Verify that lock_until is sufficient in the future
- Change cancel instruction name to withdraw
- tests for withdraw
- Proof of Hodl site, boilerplate, arweave deployment.
- Functionality on PoH site.
