const { Router } = require('express')
const { controllers } = require('../controller/dictionary')
const { getRenderState, getParams, getProductData, getCurrentDate } = require('../controller/general')
const { getProducts } = require('../controller/product')
const {
  selectAll,
  selectById,
  updateById,
  insertInto,
  insertIntoNew,
  selectWithCond,
  pool,
} = require('../db')
const state = require('../state')

const router = new Router()

router.post('/buy', async (req, res) => {
  if (!state.isLogNoAdmin || !state.currentUser) return

  state.title = 'Купить товар'
  state.url = req.originalUrl
  state.setView('buy')

  const params = getParams(req.body)
  const productData = getProductData(params)

  const defaultProducts = [productData]
  const quantity = params.quantity
  const queryBonusCard = await selectWithCond(
    'bonus_cards',
    '*',
    `user_id = ${state.currentUser.id}`
  )
  const bonus_count =
    queryBonusCard.rowCount === 0 ? 0 : queryBonusCard.rows[0].bonus_count
  const discount =
    bonus_count >= params.price / 2 ? params.price / 2 : bonus_count
  const final_price = quantity * params.price - discount

  const data = await getProducts(defaultProducts, {
    isLogNoAdmin: state.isLogNoAdmin,
    quantity,
    bonus_count,
    discount,
    final_price,
    addBonusCard: queryBonusCard.rowCount === 0,
  })

  res.render('buy', getRenderState(state, data))
})

router.post('/buy-product', async (req, res) => {
  if (!state.isLogNoAdmin || !state.currentUser) return

  const params = getParams(req.body)
  const productData = getProductData(params)

  const defaultProducts = [productData]
  const quantity = params.quantity
  const queryBonusCard = await selectWithCond(
    'bonus_cards',
    '*',
    `user_id = ${state.currentUser.id}`
  )
  const bonus_count =
    queryBonusCard.rowCount === 0 ? 0 : queryBonusCard.rows[0].bonus_count
  const discount =
    bonus_count >= params.price / 2 ? params.price / 2 : bonus_count
  const final_price = quantity * params.price - discount
  const balance = state.getBalance()
  let isPaid = false
  let notFunds = false
  if (balance >= final_price) {
    state.setBalance(balance - final_price)
    state.bonus_count += params.additional_bonus_count
    state.bonus_count -= discount
    await updateById('products', params.id, {
      quantity_in_stock: params.quantity_in_stock - 1,
    })
    await insertInto('purchases', {
      user_id: state.currentUser.id,
      product_id: params.id,
      date_of_purchase: getCurrentDate(),
      price: final_price,
      quantity,
    })
    if (queryBonusCard.rowCount === 0) {
      await controllers.bonusCards.insertNew([
        [state.currentUser.user_name, params.additional_bonus_count],
      ])
    } else {
      const id = queryBonusCard.rows[0].id
      await updateById('bonus_cards', id, {
        bonus_count: state.bonus_count,
      })
    }
    isPaid = true
  } else {
    notFunds = true
  }
  const other =
    bonus_count !== params.bonus_count ||
    discount !== params.discount ||
    final_price !== params.final_price
      ? {
          bonus_count,
          discount,
          final_price,
          isNewCash: true,
          isPaid,
          notFunds,
        }
      : {
          bonus_count: params.bonus_count,
          discount: params.discount,
          final_price: params.final_price,
          isPaid,
          notFunds,
        }

  other.isLogNoAdmin = state.isLogNoAdmin
  other.addBonusCard = queryBonusCard.rowCount === 0

  const data = await getProducts(defaultProducts, other)

  // const url = isPaid && req.originalUrl
  res.render(state.url.substr(1), getRenderState(state, data))

  // if (url) {
  //   res.redirect(url)
  // }
})

router.get('/purchases', async (req, res) => {
  if (!state.isLogNoAdmin || !state.currentUser) return

  state.title = 'История покупок'
  state.url = req.originalUrl
  state.setView('purchases')

  const query = `SELECT *, purchases.price as "final_price", purchases.id as "purchase_id", products.id as "id", products.price as "price"
  FROM products
    INNER JOIN purchases
    ON products.id = purchases.product_id
  WHERE purchases.user_id = ${state.currentUser.id}
  `
  const defaultProducts = (await pool.query(query)).rows
  // console.log(defaultProducts)

  // const defaultPurchases = (await selectAll('purchases')).rows
  const data = await getProducts(defaultProducts, {
    isLogNoAdmin: state.isLogNoAdmin,
    // isRefund: (await selectWithCond('refunds', '*', 'purchase_id = '))
  })

  const productsData = Array.from(data.productsData)
  data.productsData = []
  for (const product of productsData) {
    data.productsData.push({
      ...product,
      isRefund: (await selectWithCond('refunds', '*', `purchase_id = ${product.purchase_id}`)).rowCount > 0
    })
  }

  // console.log(data.productsData)

  state.isVideo = data.productsData.length > 0 && state.viewCount.purchases === 1

  res.render('purchases', getRenderState(state, data))
})

router.post('/refund', async (req, res) => {
  if (!state.isLogNoAdmin || !state.currentUser) return

  state.title = 'Вернуть товар'
  state.url = req.originalUrl
  state.setView('refund')

  const params = getParams(req.body)
  const productData = getProductData(params)
  const defaultProducts = [productData]

  const data = await getProducts(defaultProducts, {
    isLogNoAdmin: state.isLogNoAdmin,
    quantity: params.quantity,
    final_price: params.final_price,
    purchase_id: Number(params.purchase_id)
  })

  res.render('refund', getRenderState(state, data))
})

router.post('/refund-product', async (req, res) => {
  if (!state.isLogNoAdmin || !state.currentUser) return

  const params = getParams(req.body)

  state.setBalance(state.getBalance() + params.final_price)
  await insertInto('refunds', {
    purchase_id: params.purchase_id,
    quantity: params.quantity,
    date_of_refund: getCurrentDate(),
    reason_for_refund: params.reason_for_refund
  })

  res.redirect('/')
})

router.get('/refunds', async (req, res) => {
  if (!state.isLogNoAdmin || !state.currentUser) return

  state.title = 'Возвраты'
  state.url = req.originalUrl
  state.setView('refunds')

  const query = `SELECT *, purchases.price as "final_price", products.id as "id", purchases.id as "purchase_id", refunds.id as "refund_id"
  FROM products
    INNER JOIN purchases
    ON products.id = purchases.product_id
    INNER JOIN refunds
    ON purchases.id = refunds.purchase_id
  WHERE purchases.user_id = ${state.currentUser.id}
  `
  const defaultProducts = (await pool.query(query)).rows

  const data = await getProducts(defaultProducts, {
    isLogNoAdmin: state.isLogNoAdmin,
  })

  res.render('refunds', getRenderState(state, data))
})

module.exports = router
