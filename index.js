require('dotenv').config()

const Slimbot = require('slimbot')
const slimbot = new Slimbot(process.env.TELEGRAM_BOT_TOKEN)

const db = require('./db')

const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())

slimbot.on('message', (message) => {
  // -355737426
  console.log('message')
  console.log(message)
})

slimbot.on('edited_message', (message) => {
  console.log('edited_message')
  console.log(message)
})

slimbot.on('callback_query', (query) => {
  console.log('query')
  console.log(query)
})

slimbot.on('inline_query', (inlineQuery) => {
  console.log('inlineQuery')
  console.log(inlineQuery)
})

// // Defining optional parameters
// let optionalParams = {
//   parse_mode: "Markdown",
//   disable_web_page_preview: true,
//   disable_notification: true,
//   reply_to_message_id: 1234,
//   reply_markup: JSON.stringify({
//     inline_keyboard: [[
//       { text: 'Today', callback_data: 'pick_today' },
//       { text: 'Pick a date', callback_data: 'pick_date' }
//     ]]
//   })
// }

app.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM messages')
  res.json({msg: 'Ja!', rows})
})

app.listen(process.env.PORT, () => {
  console.log(`Shock Forest Bot running on port ${process.env.PORT}`)
})

slimbot.startPolling()
