const express = require('express')
const router = express.Router()
const _wc = require('../utilities/wc')
const _redis = require('../utilities/redis')
const axios = require('axios')
const sanitizeHtml = require('sanitize-html')
// const e = require('express')

// route GET api/getProducts
// @desc gets all products from WC and stores them in redis
// @access public

router.get('/wc-api/getProducts', async (req, res) => {
  try {
    let allProducts = []
    let breakLoop = false
    let page = 1

    while (!breakLoop) {
      console.log(page)
      const products = await _wc
        .get('products', { per_page: 100, page: page })
        .then((res) => res?.data)
        .catch((err) => console.log(err?.response?.data))
      if (products.length === 0 || !products) {
        breakLoop = true
      } else {
        allProducts = allProducts.concat(products)
        page = page + 1
      }
    }

    // const response = await _wc.get('products', {
    //   per_page: 40,
    // })

    await _redis.set('products', JSON.stringify(allProducts))
    res.status(200).send(allProducts)
  } catch (error) {
    console.log(error.response.data)
  }
})

// route GET api/redis/products
// @desc get the current products from the redis store
// @access public

router.get('/redis/products', async (req, res) => {
  try {
    const products = await _redis.get('products')
    res.json(JSON.parse(products))
  } catch (error) {
    console.log(error.response)
  }
})

// route GET api/getCategories
// @desc gets categories from WC and stores them in redis
// @access public

router.get('/wc-api/getCategories', async (req, res) => {
  try {
    const response = await _wc.get('products/categories', { per_page: 100 })
    await _redis.set('categories', JSON.stringify(response.data))
    res.status(200).send('success')
  } catch (error) {
    console.log(error.response)
  }
})

// route GET api/redis/categories
// @desc get the current categories from the redis store
// @access public

router.get('/redis/categories', async (req, res) => {
  try {
    const categories = await _redis.get('categories')
    res.json(JSON.parse(categories))
  } catch (error) {
    console.log(error.response)
  }
})

// route GET api/getTags
// @desc gets tags from WC and stores them in redis
// @access public

router.get('/getTags', async (req, res) => {
  try {
    let allTags = []
    let breakLoop = false
    let page = 1

    while (!breakLoop) {
      console.log(page)
      const tags = await _wc
        .get('products/tags', { per_page: 100, page: page })
        .then((res) => res?.data)
        .catch((err) => console.log(err?.response?.data))
      if (tags.length === 0 || !tags) {
        breakLoop = true
      } else {
        allTags = allTags.concat(tags)
        page = page + 1
      }
    }
    await _redis.set('tags', JSON.stringify(allTags))
    res.status(200).send('success')
  } catch (error) {
    console.log(error.response)
  }
})

// route GET api/redis/categories
// @desc get the current tags from the redis store
// @access public

router.get('/redis/tags', async (req, res) => {
  try {
    const tags = await _redis.get('tags')
    res.json(JSON.parse(tags))
  } catch (error) {
    console.log(error.response)
  }
})

// route GET api/createProdsByCats
// @desc creates and stores a list of each category of products
// @access public

router.get('/redis/createProdsByCats', async (req, res) => {
  try {
    let products = await _redis.get('products')
    let categories = await _redis.get('categories')

    products = JSON.parse(products)
    categories = JSON.parse(categories)

    categories.forEach(async (category) => {
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

    res.status(200).send('success')
  } catch (error) {
    console.log(error.response)
  }
})

// route GET api/redis/getProdsByCat/:cat
// @desc gets categories from WC and stores them in redis
// @access public

router.get('/redis/getProdsByCat/:cat', async (req, res) => {
  console.log(req.params)
  try {
    const cat = req.params.cat
    const prodsByCat = await _redis.get(cat)
    res.status(200).send(prodsByCat ? JSON.parse(prodsByCat) : 'null')
  } catch (error) {
    console.log(error.response)
  }
})

// route GET api/single?id=****
// @desc get a specific product by ID from WC
// @access public

router.get('/single?', async (req, res) => {
  const { id } = req.query
  try {
    const response = await _wc.get(`products/${id}`)
    res.send(response.data)
  } catch (error) {
    if (error?.response?.data?.message === 'Invalid ID.') {
      res.json("error, product doesn't exist")
    }
  }
})

// route GET api/redis/single?id=****
// @desc get a specific product by ID from Redis Cache
// @access public

router.get('/redis/single?', async (req, res) => {
  const { id } = req.query
  try {
    let products = await _redis.get(`products`)
    products = JSON.parse(products)
    const prod = products.find((prod) => prod.id == id)
    res.status(200).send(prod)
  } catch (error) {
    if (error?.response?.data?.message === 'Invalid ID.') {
      res.json("error, product doesn't exist")
    }
  }
})

// route GET api/redis/single?id=****
// @desc get a specific product by ID from Redis Cache
// @access public

router.get('/redis/price/single?', async (req, res) => {
  const { id } = req.query
  try {
    let products = await _redis.get(`products`)
    products = JSON.parse(products)
    const prod = products.find((prod) => prod.id == id)
    const regexp = /[\d\.]+/
    const priceHTMLArr = prod.price_html.split('>')
    let priceArr = []
    priceHTMLArr.forEach((s) => priceArr.push(s.match(regexp)))
    res.status(200).send(priceArr.filter((el) => el !== null))
  } catch (error) {
    if (error?.response?.data?.message === 'Invalid ID.') {
      res.json("error, product doesn't exist")
    }
  }
})

// route GET /api/store-api/getProducts
// @desc gets all products from store-api rather than wc api
// @access public

router.get('/store-api/getProducts', async (req, res) => {
  try {
    let allProducts = []
    let breakLoop = false
    let page = 1

    while (!breakLoop) {
      console.log(page)
      const products = await axios
        .get(
          `${process.env.WC_URL}/wp-json/wc/store/v1/products?page=${page}&per_page=100`
        )
        .then((res) => res?.data)
        .catch((err) => console.error(err))
      if (products.length === 0 || !products) {
        breakLoop = true
      } else {
        allProducts = allProducts.concat(products)
        page = page + 1
      }
    }

    allProducts.forEach((prod) => {
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

    await _redis.set('products', JSON.stringify(allProducts))

    res.send(allProducts)
  } catch (error) {
    res.json(error.response)
  }
})

module.exports = router
