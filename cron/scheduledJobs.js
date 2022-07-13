const CronJob = require('node-cron')
const _wc = require('../utilities/wc')
const _redis = require('../utilities/redis')
const axios = require('axios')
const sanitizeHtml = require('sanitize-html')

const cron2mins = '*/2 * * * *'
const cron4mins = '*/4 * * * *'
const cron5mins = '*/5 * * * *'
const cron15mins = '*/15 * * * *'

const MLDScheduledCronJobs = () => {
  //   const scheduledFunction = CronJob.schedule(cron15mins, () => {
  //     console.log('hello')
  //   })
  const scheduledFunction = CronJob.schedule(cron5mins, async () => {
    console.log(new Date().toLocaleTimeString(), 'start!')
    try {
      let products = []
      let prodBreakLoop = false
      let prodPage = 1

      while (!prodBreakLoop) {
        console.log('product page', prodPage)
        const wcProducts = await axios
          .get(
            `${process.env.WC_URL}/wp-json/wc/store/v1/products?page=${prodPage}&per_page=100`
          )
          .then((res) => res?.data)
          .catch((err) => console.error(err))
        if (wcProducts.length === 0 || !wcProducts) {
          prodBreakLoop = true
        } else {
          products = products.concat(wcProducts)
          prodPage = prodPage + 1
        }
      }

      products.forEach((prod) => {
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
      })

      let tags = []
      let tagsBreakLoop = false
      let tagsPage = 1

      while (!tagsBreakLoop) {
        console.log('tagsPage', tagsPage)
        const wcTags = await _wc
          .get('products/tags', { per_page: 100, page: tagsPage })
          .then((res) => res?.data)
          .catch((err) => console.log(err?.response?.data))
        if (wcTags.length === 0 || !wcTags) {
          tagsBreakLoop = true
        } else {
          tags = tags.concat(wcTags)
          tagsPage = tagsPage + 1
        }
      }

      const categories = await _wc.get('products/categories', { per_page: 100 })
      //   console.log(categories)
      categories.data.forEach(async (category) => {
        const catAndProdObj = {
          title: category.name,
          id: category.id,
          description: category.description,
          products: products.filter((prod) =>
            prod.categories.some((prodCat) => prodCat.id === category.id)
          ),
        }
        await _redis.set(category.slug, JSON.stringify(catAndProdObj))
      })

      await _redis.set('products', JSON.stringify(products))
      await _redis.set('categories', JSON.stringify(categories.data))
      await _redis.set('tags', JSON.stringify(tags))
      console.log(new Date().toLocaleTimeString(), 'finished!')
    } catch (error) {
      console.error(error)
    }
  })

  scheduledFunction.start()
}

module.exports = MLDScheduledCronJobs
