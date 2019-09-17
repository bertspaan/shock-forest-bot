function dateFromTimestamp (timestamp) {
  return new Date(timestamp * 1000)
}

module.exports = {
  dateFromTimestamp
}
