const getState = () => {
  return {
    currentUser: null,
    isLogNoAdmin: false,
    isLogAdmin: false,
    constants: {
      MAX_PRICE: 500000,
      MAX_QUANTITY_IN_STOCK: 100,
    },
    isView: {},
    viewCount: {},
    setView(viewName) {
      for (const viewKey of Object.keys(this.isView)) {
        this.isView[viewKey] = null
      }
      this.isView[viewName] = true
      this.viewCount[viewName] = !this.viewCount[viewName] ? 1 : this.viewCount[viewName] + 1
    },
    isDebug: false,
    balance: Number.MAX_VALUE,
    getBalance() {
      return this.currentUser.balance || this.balance
    },
    setBalance(count) {
      if (!this.currentUser.balance) {
        this.balance = count
      } else {
        this.currentUser.balance = count
      }
    }
  }
}

module.exports = getState() || state
