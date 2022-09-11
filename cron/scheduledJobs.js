const CronJob = require('node-cron')
const _redis = require('../utilities/redis')
const axios = require('axios')
const sanitizeHtml = require('sanitize-html')
const _wp = require('../utilities/wp')
const html_entities = require('html-entities')
const { parseDashStrToUnderScoreStr } = require('../utilities/utilities')
const { PRODUCT_CATEGORY_SVGS } = require('../utilities/media')
const { decode } = html_entities

const cron2mins = '*/2 * * * *'
const cron4mins = '*/4 * * * *'
const cron5mins = '*/5 * * * *'
const cron15mins = '*/15 * * * *'

const MLDScheduledCronJobs = () => {
  const scheduledFunction = CronJob.schedule(cron5mins, async () => {
    // const scheduledFunction = async () => {
    console.log(new Date().toLocaleTimeString(), 'start!')
    try {
      // ---- get all vendors
      const getVendors = await axios.get(
        `${_wp.URL}/wp-json/dokan/v1/stores?per_page=100`,
        {
          headers: _wp.HEADERS,
        }
      )

      // ---- remove disabled vendors

      const vendors = getVendors.data
        .map((v) => {
          if (v.enabled === false) return null
          else return v
        })
        .filter((v) => v !== null)

      // console.log(getVendors.data.length)
      // console.log(vendors.length)

      // ---- get all wc-api products

      let wcProducts = []
      let wcProdBreakLoop = false
      let wcProdPage = 1

      while (!wcProdBreakLoop) {
        console.log('wc api product page', wcProdPage)
        const wcApiProducts = await axios
          .get(
            `${_wp.URL}/wp-json/wc/v3/products?page=${wcProdPage}&per_page=100`,
            {
              headers: _wp.HEADERS,
            }
          )
          .then((res) => res?.data)
          .catch((err) => console.error(err))
        if (wcApiProducts.length === 0 || !wcApiProducts) {
          wcProdBreakLoop = true
        } else {
          wcProducts = wcProducts.concat(wcApiProducts)
          wcProdPage = wcProdPage + 1
        }
      }

      // ---- remove all products that aren't assigned to a vendor

      wcProducts = wcProducts
        .map((p) => {
          if (!vendors.find((v) => v.id === p.store.id)) return null
          else return p
        })
        .filter((v) => v !== null)

      // ---- get all store api products

      let storeProducts = []
      let storeProdBreakLoop = false
      let storeProdPage = 1

      while (!storeProdBreakLoop) {
        console.log('store api product page', storeProdPage)
        const storeApiProducts = await axios
          .get(
            `${_wp.URL}/wp-json/wc/store/v1/products?page=${storeProdPage}&per_page=100`,
            {
              headers: _wp.HEADERS,
            }
          )
          .then((res) => res?.data)
          .catch((err) => console.error(err))
        if (storeApiProducts.length === 0 || !storeApiProducts) {
          storeProdBreakLoop = true
        } else {
          storeProducts = storeProducts.concat(storeApiProducts)
          storeProdPage = storeProdPage + 1
        }
      }

      // if any products arent in wc api remove them

      storeProducts = storeProducts
        .map((p) => {
          if (!wcProducts.find((wcp) => wcp.id === p.id)) return null
          else return p
        })
        .filter((v) => v !== null)

      // ---- sanitize the html from products descriptions and attatch the correct vendor to the prod obj

      storeProducts.forEach((prod) => {
        prod.name = decode(prod.name)
        prod.categories.forEach((c) => {
          c.name = decode(c.name)
        })

        prod.short_description = sanitizeHtml(
          prod.short_description.replace(/(\r\n|\n|\r)/gm, ' '),
          {
            allowedTags: [],
          }
        )
        prod.description = sanitizeHtml(
          prod.description.replace(/(\r\n|\n|\r)/gm, ' '),
          { allowedTags: [] }
        )
        const wcApiThisProd = wcProducts.find((wcProd) => prod.id === wcProd.id)
        const vendorThisProd = vendors.find(
          (v) => v.id === wcApiThisProd.store.id
        )
        const thisProdStore = {
          ...wcApiThisProd.store,
          banner: vendorThisProd.banner,
          gravatar: vendorThisProd.gravatar,
        }
        prod.store = thisProdStore
        prod.meta_data = wcApiThisProd.meta_data
      })

      // ---- if the products vendor is disabled remove the product

      storeProducts = storeProducts
        .map((p) => {
          const prodsVendor = vendors.find((v) => v.id === p.store.id)
          // console.log(prodsVendor)
          if (!prodsVendor || prodsVendor.enabled === false) return null
          // add more product sanitization here
          else return p
        })
        .filter((p) => p !== null)

      // ---- get all tags

      let tags = []
      let tagsBreakLoop = false
      let tagsPage = 1

      while (!tagsBreakLoop) {
        console.log('tagsPage', tagsPage)
        const wcTags = await axios
          .get(
            `${_wp.URL}/wp-json/wc/store/v1/products/tags?page=${tagsPage}&per_page=100`
          )
          .then((res) => res?.data)
          .catch((err) => console.log(err?.response?.data))
        if (wcTags.length === 0 || !wcTags) {
          tagsBreakLoop = true
        } else {
          tags = tags.concat(wcTags)
          tagsPage = tagsPage + 1
        }
      }

      // ---- get all categories

      const categories = await axios.get(
        `${_wp.URL}/wp-json/wc/store/v1/products/categories`
      )
      //   console.log(categories)

      // ---- creating an obj for each category with products attached and setting to redis

      categories.data.forEach(async (category) => {
        category.svg = PRODUCT_CATEGORY_SVGS[
          parseDashStrToUnderScoreStr(category.slug)
        ]
          ? PRODUCT_CATEGORY_SVGS[parseDashStrToUnderScoreStr(category.slug)]
          : ''

        const catAndProdObj = {
          title: category.name,
          id: category.id,
          description: category.description,
          slug: category.slug,
          svg: category.svg,
          products: storeProducts.filter((prod) =>
            prod.categories.some((prodCat) => prodCat.id === category.id)
          ),
        }
        await _redis.set(category.slug, JSON.stringify(catAndProdObj))
      })

      // ---- adding all vendors products to the vendor

      vendors.forEach((vendor) => {
        if (!vendor.id) {
          console.log(vendor)
        }
        // const storeProductsWithVendors = storeProducts.filter((p) => p.store)
        const vendsProds = storeProducts.filter(
          (prod) => prod.store.id === vendor.id
        )

        const sanitizedVendsProds = vendsProds.map((p) => {
          const prodObj = { ...p }
          delete prodObj.store
          delete prodObj.permalink
          return prodObj
        })

        vendor.products = sanitizedVendsProds

        vendor.categories.forEach((c) => {
          c.name = decode(c.name)
        })
      })

      // ---- setting items to redis

      await _redis.set('vendors', JSON.stringify(vendors))
      await _redis.set('products', JSON.stringify(storeProducts))
      await _redis.set('categories', JSON.stringify(categories.data))
      await _redis.set('tags', JSON.stringify(tags))
      console.log(new Date().toLocaleTimeString(), 'finished!')
    } catch (error) {
      console.error(error)
    }
  })
  // }

  scheduledFunction.start()
  // scheduledFunction()
}

module.exports = MLDScheduledCronJobs
