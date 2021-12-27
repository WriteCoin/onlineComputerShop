// const pg = require('pg')
// const conString =
//   'postgres://astrac:astrap99@192.168.56.102:5432/computerOnlineShop'

// const client = new pg.Client(conString)
// client.connect()

// console.log(client.query)

// module.exports = client

const Pool = require('pg').Pool

const config = {
  user: 'astrac',
  password: 'astrap99',
  host: '192.168.56.102',
  port: 5432,
  database: 'computerOnlineShop',
}

const pool = new Pool(config)

const insertInto = async (table, data) => {
  let str = `INSERT INTO ${table} (`
  const keys = Object.keys(data)
  let i = 0
  for (const key of keys) {
    str = `${str}${key}`
    str = keys.length - 1 !== i ? `${str}, ` : str
    i++
  }
  str = `${str}) values (`
  i = 0
  for (const value of Object.values(data)) {
    str = typeof value === 'string' ? `${str}'${value}'` : `${str}${value}`
    str = keys.length - 1 !== i ? `${str}, ` : str
    i++
  }
  str = `${str}) RETURNING *`
  console.log(str)
  return await pool.query(str)
}

// const insertInto = (table, keys, values, returning) => {
//   let qeury_str = `INSERT INTO ${table} (${keys}) VALUES${values} RETURNING ${!returning ? '*' : returning}`
//   return qeury_str
// }

const select = async (table, keys, cond) => {
  let str = `SELECT ${keys} FROM ${table}`
  str = !cond ? str : `${str} WHERE ${cond}`
  return await pool.query(str)
}

const selectAll = async (table) => await pool.query(`SELECT * FROM ${table}`)

const selectWithCond = async (table, keys, cond) => {
  let str = keys === '*' ? `SELECT ${keys} ` : `SELECT (${keys}) `
  str = `${str}FROM ${table} WHERE ${cond}`
  // console.log('Select with cond: ', str)
  return await pool.query(str)
}

const insertIntoNew = async (table, cond, data) => {
  const oldData = await selectWithCond(table, '*', cond)
  if (oldData.rowCount === 0) {
    return await insertInto(table, data)
  }
  return oldData
}

const selectById = async (table, id) =>
  await pool.query(`SELECT * FROM ${table} WHERE id = ${id}`)

const updateById = async (table, id, data) => {
  let str = `UPDATE ${table} SET `
  const keys = Object.keys(data)
  let i = 0
  for (let [key, value] of Object.entries(data)) {
    value = typeof value === 'string' ? `'${value}'` : value
    str = `${str}${key} = ${value}`
    str = (keys.length - 1 !== i++) ? `${str}, ` : str
  }
  str = `${str} WHERE id = ${id} RETURNING *`
  console.log(str)
  return await pool.query(str)
}

const deleteById = async (table, id) => {
  const str = `DELETE FROM ${table} WHERE id = ${id}`
  return await pool.query(str)
}

module.exports = {
  pool,
  insertInto,
  select,
  selectAll,
  selectWithCond,
  insertIntoNew,
  selectById,
  updateById,
  deleteById,
}
