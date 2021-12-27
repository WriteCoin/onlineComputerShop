const { queryDictionaries } = require('./controller/dictionary')
const { selectAll } = require('./db')
const state = require('./state')

const getDictData = async () => {
  return {
    categories: (await selectAll('categories')).rows,
    subcategories: (await selectAll('subcategories')).rows,
    measurement_units: (await selectAll('measurement_units')).rows,
    data_types: (await selectAll('data_types')).rows,
    property_types: (await selectAll('property_types')).rows,
  }
}

const queryComplete = async () => {
  await queryDictionaries()

  state.dictData = await getDictData()

  // console.log(state.dictData.measurement_units)

//   console.log(dictData)

  const deleteTables = async () => {
    const deleteTable = async (table) =>
      await pool.query(`delete from ${table};`)
    // await deleteTable('categories')
    // await deleteTable('subcategories')
    // await deleteTable('measurement_units')
    // await deleteTable('data_types')
    await deleteTable('property_types')
  }
  // await deleteTables()

  const printTable = async (table) => {
    const data = await selectAll(table)
    console.log(`${table}: `, data.rows)
  }

  const printTables = async () => {
    await printTable('users')
    // printTable('products')
    // printTable('purchases')
    // printTable('refunds')
    await printTable('bonus_cards')
    // await insertIntoNew('categories', "category_name = 'ПК'", { category_name: '"ПК"'})
    await printTable('categories')
    await printTable('subcategories')
    await printTable('measurement_units')
    // await printTable('data_types')
    // await printTable('property_types')
  }
  // printTable('measurement_units')
  printTable('users')
  // printTable('products')
  // printTables()
}

module.exports = {
  queryComplete,
  getDictData,
}
