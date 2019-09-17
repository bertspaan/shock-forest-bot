const axios = require('axios')

const s3 = require('./s3')

const botToken = process.env.TELEGRAM_BOT_TOKEN

async function getFileStream (fileId) {
  const apiUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  try {
    const apiResponse = await axios.get(apiUrl)
    const path = apiResponse.data.result.file_path

    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${path}`

    console.log(`Ready to download file from ${fileUrl}`)

    const fileResponse = await axios({
      method: 'get',
      url: fileUrl,
      responseType: 'stream'
    })

    return fileResponse.data
  } catch (err) {
    console.error(`Error downloading ${apiUrl}`)
    throw err
  }
}

async function store (message) {
  if (message.audio) {

  }

  if (message.photo) {
    const fileId = message.photo[message.photo.length - 1].file_id
    const stream = await getFileStream(fileId)

    await s3.upload('test.jpg', stream, 'image/jpeg')

    // "photo": [
    //   {
    //     "width": 240,
    //     "height": 320,
    //     "file_id": "AgADBAADcbExGyLVAAFQvHqPYvMEBLD7XagbAAQBAAMCAANtAANxOwIAARYE",
    //     "file_size": 6747
    //   },
    //   {
    //     "width": 600,
    //     "height": 800,
    //     "file_id": "AgADBAADcbExGyLVAAFQvHqPYvMEBLD7XagbAAQBAAMCAAN4AANyOwIAARYE",
    //     "file_size": 26853
    //   },
    //   {
    //     "width": 960,
    //     "height": 1280,
    //     "file_id": "AgADBAADcbExGyLVAAFQvHqPYvMEBLD7XagbAAQBAAMCAAN5AANzOwIAARYE",
    //     "file_size": 46268
    //   }
    // ],
  }

  if (message.document) {
    // "document": {
    //   "file_id": "BQADBAADFQcAAiLVAAFQbCA5MoDTTY8WBA",
    //   "file_name": "schema (6)",
    //   "file_size": 4885,
    //   "mime_type": "application/octet-stream"
    // },

    // "document": {
    //   "thumb": {
    //     "width": 240,
    //     "height": 320,
    //     "file_id": "AAQEAAMWBwACItUAAVBFa0S17fleUIMUnxsABAEAB20AA_EaAAIWBA",
    //     "file_size": 6004
    //   },
    //   "file_id": "BQADBAADFgcAAiLVAAFQRWtEte35XlAWBA",
    //   "file_name": "file_0.jpg",
    //   "file_size": 40385,
    //   "mime_type": "image/jpeg"
    // },
  }

  if (message.voice) {
    // "voice": {
    //   "file_id": "AwADBAADFwcAAiLVAAFQshid13-1KvMWBA",
    //   "duration": 3,
    //   "file_size": 11560,
    //   "mime_type": "audio/ogg"
    // },
  }

  // if (message.video) {

  // }

  // animation
  // video_note
  // contact
  // location
}

module.exports = {
  store
}
