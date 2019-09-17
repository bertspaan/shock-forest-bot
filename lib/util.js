function timestampFromMessage (message) {
  return new Date((message.edit_date || message.date) * 1000)
}

module.exports = {
  timestampFromMessage
}
