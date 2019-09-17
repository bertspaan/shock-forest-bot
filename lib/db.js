const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const query = (text, params) => pool.query(text, params)

async function transaction (queries) {
  try {
    await query('BEGIN')
    const results = await Promise.all(queries)
    await query('COMMIT')
    return results
  } catch (err) {
    await query('ROLLBACK')
    throw err
  }
}

module.exports = {
  query,
  transaction
}
