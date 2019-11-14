const hashtagMapping = {
  '#labour': '#labor',
  '#sonic_meditation': '#sonic_meditations',
  '#tracksuits': '#tracksuit',
  '#umbrella': '#umbrellas',
  '#monuments': '#monument',
  '#forest': '#shockforest',
  '#industralization': '#industrialization',
  '#weapons': '#weapon',
  '#colons': '#colonialism',
  '#water': '#waves',
  '#infilm': '#film'
}

function formatHashtag (hashtag) {
  hashtag = hashtagMapping[hashtag] || hashtag
  return hashtag.toLowerCase().replace('_', '')
}

module.exports = {
  hashtag: formatHashtag,
  hashtagMapping
}
