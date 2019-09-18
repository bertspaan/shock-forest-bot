const { Pool } = require('pg')

const pool = new Pool({
  // Connect with SSL enabled
  connectionString: process.env.DATABASE_URL + '?ssl=true'
})

const query = (text, values) => ({
  text,
  values
})

const runQuery = (text, values) => pool.query(text, values)

async function transaction (queries) {
  const client = await pool.connect()

  try {
    await query('BEGIN')
    const results = []
    for (const query of queries) {
      const queryResults = await client.query(query.text, query.values)
      results.push(queryResults)
    }
    await query('COMMIT')
    return results
  } catch (err) {
    await query('ROLLBACK')
    throw err
  }
}

module.exports = {
  query,
  runQuery,
  transaction
}
