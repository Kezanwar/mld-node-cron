require('dotenv').config()

const _wp = {
  URL: process.env.WC_URL,
  USERNAME: process.env.WP_USERNAME,
  PASSWORD: process.env.WP_PASSWORD,
  JWT: `Bearer ${process.env.WP_JWT}`,
  HEADERS: { Authorization: `Bearer ${process.env.WP_JWT}` },
}

module.exports = _wp
