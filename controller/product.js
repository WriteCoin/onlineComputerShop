const { selectWithCond, selectAll } = require('../db')
const { getDictData } = require('../node_querys')
const state = require('../state')

const getDictDataFromProducts = async (productsData) => {
  const categories = []
  const subCategories = []
  const dictData = await getDictData()
  productsData.forEach((productData) => {
    dictData.categories.forEach((categoryData) => {
      if (productData.category_id === categoryData.id) {
        categories.push(categoryData)
      }
    })
    dictData.subcategories.forEach((subCategoryData) => {
      if (productData.subcategory_id === subCategoryData.id) {
        subCategories.push(subCategoryData)
      }
    })
  })
  return {
    categories: categories,
    subcategories: subCategories,
  }
}

const getPropertiesFromProducts = async (productsData) => {
  const properties = []
  const propertyTypes = []
  const measurementUnits = []
  const dataTypes = []
  const getResult = () => {
    return {
      properties: properties,
      property_types: propertyTypes,
      measurement_units: measurementUnits,
      data_types: dataTypes,
    }
  }
  if (productsData) {
    return getResult()
  }
  for (const product of productsData) {
    properties.push(
      (await selectWithCond('properties', '*', `product_id = ${product.id}`))
        .rows[0]
    )
  }
  for (const property of properties) {
    const query = await selectWithCond(
      'property_types',
      '*',
      `id = ${property.property_type_id}`
    )
    propertyTypes.push(query.rows[0])
  }
  for (const propertyType of propertyTypes) {
    let query = await selectWithCond(
      'measurement_units',
      '*',
      `id = ${propertyType.measurement_unit_id}`
    )
    measurementUnits.push(query.rows[0])
    query = await selectWithCond(
      'data_types',
      '*',
      `id = ${propertyType.data_type_id}`
    )
    dataTypes.push(query.rows[0])
  }
  return getResult()
}

const getByKey = (dict, key, foreignKey) =>
  dict.filter((data) => data[key] === foreignKey)

const getProductData = (reqBodyParams) => {
  const params = reqBodyParams
  const dictData = state.dictData
  const subcategory = getByKey(
    dictData.subcategories,
    'subcategory_name',
    params.subcategory_name
  )[0]
  const category = getByKey(
    dictData.categories,
    'id',
    subcategory.category_id
  )[0]
  const property_types = getByKey(
    dictData.property_types,
    'subcategory_id',
    subcategory.id
  )
  const upd_property_types = property_types.map((property_type) => {
    return {
      ...property_type,
      subcategory,
      category,
      measurement_unit: getByKey(
        dictData.measurement_units,
        'id',
        property_type.measurement_unit_id
      )[0],
      data_type: getByKey(
        dictData.data_types,
        'id',
        property_type.data_type_id
      )[0],
    }
  })
  const newProduct = {
    ...params,
    upd_property_types,
  }
  return newProduct
}

const getProduct = (reqBodyParams) => {
  const params = reqBodyParams
  return [
    params.product_name,
    params.product_desc,
    params.image_path,
    params.subcategory_name,
    params.price,
    params.quantity_in_stock,
    params.additional_bonus_count,
  ]
}

const buildProductsData = async (products) => {
  const dictData = state.dictData
  const properties = (await selectAll('properties')).rows
  const property_types = (await selectAll('property_types')).rows

  const newProducts = products.map((product) => {
    const subcategory_id = product.subcategory_id
    let subcategory = dictData.subcategories[subcategory_id - 1]
    subcategory =
      subcategory_id > 0
        ? {
            ...subcategory,
            category:
              subcategory.category_id > 0
                ? dictData.categories[subcategory.category_id - 1]
                : {
                    id: 0,
                    category_name: '',
                  },
          }
        : {
            subcategory_name: '',
            category_id: 0,
            category: {
              id: 0,
              category_name: '',
            },
          }
    const propertyTypesForProduct = property_types.filter(
      (property_type) => property_type.subcategory_id === subcategory_id
    )
    const propertiesForProduct = properties.filter(
      (property) => property.product_id === product.id
    )
    const isNewProduct = !(product.id > 0)
    let isNewProperties = isNewProduct || product.isNewProperties === 'false'
    if (!isNewProduct && isNewProperties) {
      const property_type0 =
        property_types[propertiesForProduct[0].property_type_id - 1]
      // console.log(property_type0.subcategory_id, subcategory_id)
      isNewProperties = !(property_type0.subcategory_id === subcategory_id)
    }
    const getPropertyType = (property_type) => {
      const subcategory =
        dictData.subcategories[property_type.subcategory_id - 1]
      return {
        ...property_type,
        measurement_unit:
          dictData.measurement_units[property_type.measurement_unit_id - 1],
        data_type: dictData.data_types[property_type.data_type_id - 1],
        subcategory: {
          ...subcategory,
          category: dictData.categories[subcategory.category_id - 1],
        },
      }
    }
    return {
      ...product,
      subcategory,
      properties: isNewProperties
        ? propertyTypesForProduct.map((property_type) => {
            return {
              id: 0,
              property_type_id: property_type.id,
              product_id: 0,
              property_value: '',
              property_type: getPropertyType(property_type),
            }
          })
        : properties
            .filter((property) => property.product_id === product.id)
            .map((property) => {
              const property_type =
                dictData.property_types[property.property_type_id - 1]
              return {
                ...property,
                property_type: getPropertyType(property_type),
              }
            }),
      isView: state.isView,
      isNewProperties,
    }
  })

  return newProducts
}

const getProducts = async (defaultProducts, other) => {
  let products
  const queryProducts = state.queryProducts

  if (queryProducts) {
    products = !queryProducts.rows ? queryProducts : queryProducts.rows
  } else {
    products = defaultProducts
  }

  let productsData = await buildProductsData(products)

  const subcategories = (await selectAll('subcategories')).rows

  productsData = productsData.map((product) => {
    return {
      ...product,
      subcategories: !(subcategories.length > 0)
        ? []
        : subcategories.map((subcategory) => {
            return {
              ...subcategory,
              product,
            }
          }),
      ...other,
    }
  })

  if (queryProducts) {
    state.queryProducts = null
  }

  return {
    productsData,
    queryProducts,
  }
}

const getProperties = (reqBodyParams) => {}

const getBonusLimits = (productsData) => {}

module.exports = {
  getDictDataFromProducts,
  getPropertiesFromProducts,
  getBonusLimits,
  getByKey,
  getProductData,
  getProduct,
  buildProductsData,
  getProducts,
  getProperties,
  getBonusLimits,
}
