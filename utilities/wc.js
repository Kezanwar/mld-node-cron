const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default
require('dotenv').config()

const _wc = new WooCommerceRestApi({
  url: process.env.WC_URL,
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: 'wc/v3',
})

module.exports = _wc
