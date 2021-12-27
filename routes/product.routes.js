const { Router, query } = require('express')
const { controllers } = require('../controller/dictionary')
const { getRenderState, getParams } = require('../controller/general')
const {
  getDictDataFromProducts,
  getPropertiesFromProducts,
  buildProductsData,
  getProduct,
  getProducts,
  getProductData,
} = require('../controller/product')
const {
  selectAll,
  selectWithCond,
  updateById,
  selectById,
  deleteById,
  pool,
} = require('../db')
const state = require('../state')

const router = new Router()

router.get('/', async (req, res) => {
  state.title = 'Компьютерный интернет-магазин'
  state.url = req.originalUrl
  state.setView('index')

  const defaultProducts = (await selectAll('products')).rows
  const data = await getProducts(defaultProducts, {
    isLogNoAdmin: state.isLogNoAdmin,
  })

  res.render('index', getRenderState(state, data))
})

router.post('/filter', async (req, res) => {
  const params = getParams(req.body)
  params.price_min = Number(params.price_min)
  params.price_max = Number(params.price_max)
  params.additional_bonus_count_min = Number(params.additional_bonus_count_min)
  params.additional_bonus_count_max = Number(params.additional_bonus_count_max)
  // console.log(params)

  const isProductName = params.product_name !== ''
  const isSubcategory = params.subcategory_name !== 'Любая'
  const isPrice = params.price_max >= params.price_min && params.price_max !== 0
  const isAdditionalBonusCount =
    params.additional_bonus_count_max >= params.additional_bonus_count_min &&
    params.additional_bonus_count_max !== 0

  const condProductName = isProductName
    ? `(products.product_name = '${params.product_name}')`
    : '(true)'

  let condSubcategory = '(true)'
  if (isSubcategory) {
    const subcategory_id = await controllers.subcategories.getIdByName(
      params.subcategory_name
    )
    condSubcategory = `(products.subcategory_id = ${subcategory_id})`
  }

  let condPrice = isPrice
    ? `(products.price >= ${params.price_min} and products.price <= ${params.price_max})`
    : '(true)'

  let condAdditionalBonusCount = isAdditionalBonusCount
    ? `(products.additional_bonus_count >= ${params.additional_bonus_count_min} and products.additional_bonus_count <= ${params.additional_bonus_count_max})`
    : '(true)'

  const getCond = (conds) => {
    let result = ''
    for (let i = 0; i < conds.length; i++) {
      if (conds[i] === '') {
        conds[i] = '(true)'
      }
      result = `${result}${conds[i]}`
      result = i !== conds.length - 1 ? `${result} and ` : result
    }
    return result
  }

  const conds = [
    condProductName,
    condSubcategory,
    condPrice,
    condAdditionalBonusCount,
  ]
  const cond = getCond(conds)

  // cond = `${condProductName} and ${condSubcategory} and ${condPrice} and ${condAdditionalBonusCount}`
  // console.log(cond)

  let query = ''
  if (state.url === '/purchases') {
    query = `SELECT *, purchases.price as "final_price", purchases.id as "purchase_id", products.id as "id", products.price as "price"
      FROM products
      INNER JOIN purchases
      ON products.id = purchases.product_id
      WHERE purchases.user_id = ${state.currentUser.id}
    `
    let condPurchaseDate = params.date_of_purchase !== ''
    // ? `(date_of_purchase >= ${params.additional_bonus_count_min} and products.additional_bonus_count <= ${params.additional_bonus_count_max})`
    ? `(date_of_purchase = ${params.date_of_purchase})`
    : '(true)'

    conds.push(condPurchaseDate)

  } else if (state.url === '/refunds') {
    query = `SELECT *, purchases.price as "final_price", products.id as "id", purchases.id as "purchase_id", refunds.id as "refund_id"
      FROM products
      INNER JOIN purchases
      ON products.id = purchases.product_id
      INNER JOIN refunds
      ON purchases.id = refunds.purchase_id
      WHERE purchases.user_id = ${state.currentUser.id}
    `
  }
  query = query !== '' ? `${query} and ${cond}` : query

  state.queryProducts =
    query !== ''
      ? await pool.query(query)
      : cond === ''
      ? await selectAll('products')
      : await selectWithCond('products', '*', `${cond}`)
  // console.log(state.url)
  res.redirect(state.url)
})

router.get('/categories', async (req, res) => {
  state.title = 'Категории'
  state.url = req.originalUrl
  state.setView('categories')

  res.render('categories', state)
})

router.get('/edit', async (req, res) => {
  if (state.isLogNoAdmin || !state.currentUser) return

  state.title = 'Редактировать товары'
  state.url = req.originalUrl
  state.setView('edit')

  const defaultProducts = (await selectAll('products')).rows
  const data = await getProducts(defaultProducts, {
    Number: {
      MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
      MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
      MIN_VALUE: Number.MIN_VALUE,
      MAX_VALUE: Number.MAX_VALUE,
    },
    constants: state.constants,
  })

  // data.productsData.forEach(product => {
  //   console.log(product.properties)
  // })

  res.render('edit', getRenderState(state, data))
})

router.post('/edit', async (req, res) => {
  if (state.isLogNoAdmin || !state.currentUser) return

  const params = req.body

  // console.log(params.isNewProperties)

  // const subcategory_id = Number(params.subcategory_id)
  const subcategory_id = await controllers.subcategories.getIdByName(
    params.subcategory_name
  )
  const productData = {
    product_name: params.product_name,
    product_desc: params.product_desc,
    image_path: params.image_path,
    subcategory_id,
    price: params.price,
    quantity_in_stock: params.quantity_in_stock,
    additional_bonus_count: params.additional_bonus_count,
  }

  const queryOldProduct = await selectWithCond(
    'products',
    '*',
    `id = ${params.id}`
  )
  const oldProduct = queryOldProduct.rows[0]

  if (
    oldProduct.subcategory_id !== subcategory_id &&
    params.isNewProperties === 'false'
  ) {
    const queryProducts = [
      {
        ...oldProduct,
        ...productData,
        isNewProperties: params.isNewProperties,
      },
    ]
    state.queryProducts = queryProducts
  } else {
    const oldProperties = (
      await selectWithCond('properties', '*', `product_id = ${params.id}`)
    ).rows

    if (params['button-product'] === 'Изменить товар') {
      const isProductUpdate =
        oldProduct.product_name === params.product_name &&
        oldProduct.product_desc === params.product_desc &&
        oldProduct.image_path === params.image_path &&
        oldProduct.price.toString() === params.price &&
        oldProduct.quantity_in_stock.toString() === params.quantity_in_stock &&
        oldProduct.additional_bonus_count.toString() ===
          params.additional_bonus_count
          ? false
          : true

      if (isProductUpdate) {
        await updateById('products', params.id, productData)
      }

      const property_types = state.dictData.property_types.filter(
        (property_type) => property_type.subcategory_id === subcategory_id
      )
      // console.log(property_types)
      let property_type_index = 0
      // console.log(oldProperties)
      for (const oldProperty of oldProperties) {
        // console.log('oldProperty: ', oldProperty)
        const property_type = property_types.filter(
          (property_type) => property_type.id === oldProperty.property_type_id
        )[0]
        // console.log('property_type: ', property_type)
        const isPropertyUpdate =
          !property_type ||
          oldProperty.property_value !== params[property_type.property_name]

        // console.log(isPropertyUpdate)

        if (isPropertyUpdate) {
          const property_type = property_types[property_type_index]
          if (!property_type) {
            await deleteById('properties', oldProperty.id)
          } else {
            // console.log('property_type: ', property_types[property_type_index])
            const propertyData = {
              property_type_id: property_type.id,
              product_id: oldProperty.product_id,
              property_value: params[property_type.property_name],
            }
            // console.log('propertyData: ', propertyData)
            await updateById('properties', oldProperty.id, propertyData)
          }
        }

        property_type_index++
      }
    } else if (params['button-product'] === 'Удалить товар') {
      for (const oldProperty of oldProperties) {
        await deleteById('properties', oldProperty.id)
      }

      await deleteById('products', params.id)
    }
  }

  res.redirect(state.url)
})

router.get('/add', async (req, res) => {
  if (state.isLogNoAdmin || !state.currentUser) return

  state.title = 'Добавить товар'
  state.url = req.originalUrl
  state.setView('add')

  const defaultProducts = [
    {
      id: 0,
      product_name: '',
      product_desc: '',
      image_path: '',
      subcategory_id: 0,
      subcategory_name: '',
      price: '',
      quantity_in_stock: '',
      additional_bonus_count: '',
    },
  ]
  const data = await getProducts(defaultProducts, {
    isProps: false,
    Number: {
      MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
      MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
      MIN_VALUE: Number.MIN_VALUE,
      MAX_VALUE: Number.MAX_VALUE,
    },
    constants: state.constants,
  })

  // data.productsData.forEach(product => {
  //   console.log(product)
  // })

  // console.log('state after ', state)
  res.render('add', getRenderState(state, data))
})

router.post('/add', async (req, res) => {
  if (state.isLogNoAdmin || !state.currentUser) return

  const params = req.body
  const defaultProducts = [
    {
      ...params,
      id: 0,
      subcategory_id: await controllers.subcategories.getIdByName(
        params.subcategory_name
      ),
    },
  ]
  const other = {
    Number: {
      MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
      MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
      MIN_VALUE: Number.MIN_VALUE,
      MAX_VALUE: Number.MAX_VALUE,
    },
    constants: state.constants,
  }
  const old_product_id = await controllers.products.getIdByName(
    params.product_name
  )
  if (!old_product_id) {
    const data = await getProducts(defaultProducts, {
      isProps: true,
      ...other,
    })
    state.title = 'Добавление характеристик товара'
    state.setView('add')
    res.render('add-props', getRenderState(state, data))
  } else {
    state.queryProducts = [
      {
        ...defaultProducts[0],
        isExists: true,
      },
    ]
    res.redirect(state.url)
  }
})

router.post('/add-props', async (req, res) => {
  if (state.isLogNoAdmin || !state.currentUser) return

  const params = req.body

  // console.log(params)

  const productData = getProduct(params)

  // console.log('product data: ', productData)

  await controllers.products.insertNew([productData])

  const subcategory_id = await controllers.subcategories.getIdByName(
    params.subcategory_name
  )
  const dictData = state.dictData
  const property_types = dictData.property_types.filter(
    (property_type) =>
      property_type.subcategory_id ===
      dictData.subcategories[subcategory_id - 1].id
  )

  // console.log(property_types)

  for (const property_type of property_types) {
    const property_name = property_type.property_name
    const property_data = [
      property_name,
      params.product_name,
      params[property_name],
    ]

    // console.log('property data: ', property_data)

    await controllers.properties.insertNew([property_data])
  }

  // res.redirect(state.url)
  res.redirect('/edit')

  // console.log('state after ', state)
})

module.exports = router
