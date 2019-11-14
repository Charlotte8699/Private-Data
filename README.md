## ***Our Scenario*** 

 Three organisations:
1. Car dealer A
2. Car dealer B
3. Regulator 

---

- Dealer A sells a car to dealer B, everything about this transaction goes on the public ledger apart from the price. The price is stored in their respective private data collections; verify functions will be used to prove this.
- A hash of the price is stored on the public ledger; this proves there was a price, but the value is hidden from those without access to the private data.
- The regulator will view the transaction on the public ledger to see the transaction information, as well as the hash of the price. Once asked, dealer A will give the price to the regulator who will then hash the value given to ensure it matches the hash on the ledger.
