require('dotenv').config()

const _wp = {
  URL: process.env.WC_URL,
  USERNAME: process.env.WP_USERNAME,
  PASSWORD: process.env.WP_PASSWORD,
  JWT: `Bearer ${process.env.WP_JWT}`,
  HEADERS: function () {
    return { Authorization: this.JWT }
  },
}

module.exports = _wp
