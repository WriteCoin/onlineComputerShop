const { Router } = require('express')
const state = require('../state')

const router = new Router()

router.get('/debug', async (req, res) => {
  console.log('state: ', state)
  // res.send(JSON.stringify(state))
  if (state.url === '/add') {
    
  }
  res.redirect(state.url)
})

module.exports = router