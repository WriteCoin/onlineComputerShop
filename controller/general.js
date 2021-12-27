const state = require("../state")

const routeHandling = (forAdmin, forUser, func) => async (req, res) => {
  if (forAdmin) {
    if (state.isLogNoAdmin || !state.currentUser) return
  } else if (forUser) {
    if (!state.isLogNoAdmin || !state.currentUser) return
  } else {
    if (state.currentUser) return
  }
  state.url = req.originalUrl
  await func(req, res)
}

const getRenderState = (state, other) => {
  return {
    title: state.title,
    state,
    isView: state.isView,
    ...other
  }
}

const getParams = (reqBodyParams) => {
  const params = reqBodyParams
  params.id = Number(params.id)
  params.subcategory_id = Number(params.subcategory_id)
  params.price = Number(params.price)
  params.quantity_in_stock = Number(params.quantity_in_stock)
  params.additional_bonus_count = Number(params.additional_bonus_count)
  params.quantity = Number(params.quantity)
  params.bonus_count = Number(params.bonus_count) || params.bonus_count
  params.discount = Number(params.discount) || params.discount
  params.final_price = Number(params.final_price) || params.final_price
  return params
}

const getProductData = (params) => {
  return {
    id: params.id,
    product_name: params.product_name,
    product_desc: params.product_desc,
    image_path: params.image_path,
    subcategory_id: params.subcategory_id,
    price: params.price,
    quantity_in_stock: params.quantity_in_stock,
    additional_bonus_count: params.additional_bonus_count,
  }
}

const getCurrentDate = () => {
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
  const yyyy = today.getFullYear()

  return dd + '/' + mm + '/' + yyyy
}

module.exports = {
  routeHandling,
  getRenderState,
  getParams,
  getProductData,
  getCurrentDate
}