const express = require('express')
const router = express.Router()
const _redis = require('../utilities/redis')
const axios = require('axios')
const sanitizeHtml = require('sanitize-html')
const _wp = require('../utilities/wp')
// const e = require('express')

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
          `${_wp.URL}/wp-json/wc/store/v1/products?page=${page}&per_page=100`
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
// route GET /api/wc-api/getProducts
// @desc gets all products from store-api rather than wc api
// @access public

router.get('/wc-api/getProducts', async (req, res) => {
  try {
    let allProducts = []
    let breakLoop = false
    let page = 1

    while (!breakLoop) {
      console.log(page)
      const products = await axios
        .get(`${_wp.URL}/wp-json/wc/v3/products?page=${page}&per_page=100`, {
          headers: _wp.HEADERS,
        })
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

    // await _redis.set('products', JSON.stringify(allProducts))

    res.send(allProducts)
  } catch (error) {
    res.json(error.response)
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

router.get('/store-api/getCategories', async (req, res) => {
  try {
    const response = await axios.get(
      `${_wp.URL}/wp-json/wc/store/v1/products/categories`
    )
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

router.get('/store-api/getTags', async (req, res) => {
  try {
    let allTags = []
    let breakLoop = false
    let page = 1

    while (!breakLoop) {
      console.log(page)
      const tags = await axios
        .get(
          `${_wp.URL}/wp-json/wc/store/v1/products/tags?page=${page}&per_page=100`
        )
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

router.get('/store-api/single?', async (req, res) => {
  const { id } = req.query
  try {
    const response = await axios.get(
      `${_wp.URL}/wp-json/wc/store/v1/products/${id}`
    )
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

// route GET api/getStores
// @desc gets all stores from Dokan
// @access public

router.get('/dokan-api/getStores', async (req, res) => {
  try {
    const response = await axios.get(
      `${_wp.URL}/wp-json/dokan/v1/stores?per_page=100`,
      {
        headers: _wp.HEADERS,
      }
    )
    await _redis.set('vendors', JSON.stringify(response.data))
    res.status(200).send(response.data)
  } catch (error) {
    console.log(error)
  }
})

// route GET api/redis/getStores
// @desc gets all stores from Dokan
// @access public

router.get('/redis/getVendors', async (req, res) => {
  try {
    const vendors = await _redis.get('vendors')
    res.status(200).send(JSON.parse(vendors))
  } catch (error) {
    console.log(error)
  }
})

// route GET api/getStore/:id
// @desc gets a single store from Dokan by id
// @access public

router.get('/dokan-api/getStore/:id', async (req, res) => {
  try {
    const id = req.params.id
    const reponse = await axios.get(
      `${_wp.URL}/wp-json/dokan/v1/stores/${id}`,
      {
        headers: _wp.HEADERS,
      }
      // { per_page: 100 }
    )
    // await _redis.set('categories', JSON.stringify(response.data))
    res.status(200).send(reponse.data)
  } catch (error) {
    console.log(error)
  }
})

// route GET api/redis/getVendorByid
// @desc gets all stores from Dokan
// @access public

router.get('/redis/getVendorById/:id', async (req, res) => {
  try {
    let vendors = await _redis.get('vendors')
    const id = req.params.id
    vendors = JSON.parse(vendors)
    const vendor = vendors.find((v) => id === v.id)
    res.status(200).send(vendor)
  } catch (error) {
    console.log(error)
  }
})

// route GET wp-api/getUsers
// @desc gets all users from wp api
// @access public

router.get('/wp-api/getUsers', async (req, res) => {
  try {
    const reponse = await axios.get(
      `${_wp.URL}/wp-json/wp/v2/users?per_page=100`,
      {
        headers: _wp.HEADERS,
      }
    )
    // await _redis.set('users', JSON.stringify(response.data))
    res.status(200).send(reponse.data)
  } catch (error) {
    console.log(error.response)
  }
})

// route GET wc-api/getCustomers
// @desc gets all orders from wc-api
// @access public

router.get('/wc-api/getCustomers', async (req, res) => {
  try {
    const reponse = await axios.get(`${_wp.URL}/wp-json/wc/v3/customers`, {
      headers: _wp.HEADERS,
    })
    // await _redis.set('users', JSON.stringify(response.data))
    res.status(200).send(reponse.data)
  } catch (error) {
    console.log(error.response)
  }
})

// route GET wc-api/getOrders
// @desc gets all orders from wc-api
// @access public

router.get('/wc-api/getOrders', async (req, res) => {
  try {
    const reponse = await axios.get(`${_wp.URL}/wp-json/wc/v3/orders`, {
      headers: _wp.HEADERS,
    })
    // await _redis.set('users', JSON.stringify(response.data))
    res.status(200).send(reponse.data)
  } catch (error) {
    console.log(error.response)
  }
})

// route GET jwt-auth/getAdminToken
// @desc gets all orders from wc-api
// @access public

router.get('/jwt-auth/getAdminToken', async (req, res) => {
  try {
    const reponse = await axios.post(`${_wp.URL}/wp-json/jwt-auth/v1/token`, {
      username: process.env.WP_USERNAME,
      password: process.env.WP_PASSWORD,
    })
    // await _redis.set('users', JSON.stringify(response.data))
    res.status(200).send(JSON.stringify(reponse.data))
  } catch (error) {
    console.log(error)
  }
})

module.exports = router
