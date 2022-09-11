module.exports.parseUnderScoreStrToDashStr = (underscoreStr) => {
  return underscoreStr.replace(/_/g, '-')
}

module.exports.parseDashStrToUnderScoreStr = (dashStr) => {
  return dashStr.replace(/-/g, '_')
}
