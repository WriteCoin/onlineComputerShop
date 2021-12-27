const { Router } = require('express')
const { getRenderState } = require('../controller/general')
const { selectWithCond, insertIntoNew } = require('../db')
const state = require('../state')

const router = new Router()

router.get('/auth', async (req, res) => {
  // console.log('state before ', state)
  if (state.currentUser) return
  state.title = 'Войти'
  state.url = req.originalUrl
  state.setView('auth')
  // console.log('state after ', state)
  res.render('auth', getRenderState(state))
})

router.post('/auth', async (req, res) => {
  // console.log('state before ', state)
  if (state.currentUser) return
  const params = req.body
  console.log(params)
  const [user] = (
    await insertIntoNew('users', `user_name = '${params.name}'`, {
      user_name: params.name,
      user_password: params.password,
      isAdmin: params.isAdmin === 'on',
    })
  ).rows
  state.currentUser = user
  const bonus_query = await selectWithCond(
    'bonus_cards',
    'bonus_count',
    `user_id = ${state.currentUser.id}`
  )
  state.bonus_count =
    bonus_query.rowCount === 0 ? 0 : bonus_query.rows[0].bonus_count
  state.isLogNoAdmin = !params.isAdmin
  state.isLogAdmin = !state.isLogNoAdmin
  // console.log('state after ', state)
  res.redirect('/')
})

router.get('/log-out', async (req, res) => {
  // console.log('state before ', state)
  if (!state.currentUser) return
  state.currentUser = null
  state.isLogNoAdmin = false
  state.isLogAdmin = false
  // console.log('state after ', state)
  res.redirect('/')
})

module.exports = router
