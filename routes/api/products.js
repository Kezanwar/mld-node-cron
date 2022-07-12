const express = require('express')
const router = express.Router()
const _wc = require('../../utilities/wc')
const _redis = require('../../utilities/redis')
const axios = require('axios')

// route GET api/getProducts
// @desc gets all products from WC and stores them in redis
// @access public

router.get('/getProducts', async (req, res) => {
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
    res.status(200).send('success')
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

router.get('/getCategories', async (req, res) => {
  try {
    const response = await _wc.get('products/categories')
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

router.get('api/redis/getProdsByCat/:cat', async (req, res) => {
  try {
    const response = await _wc.get('products/categories')
    await _redis.set('categories', JSON.stringify(response.data))
    res.status(200).send('success')
  } catch (error) {
    console.log(error.response)
  }
})

// route GET api/products/single?id=****
// @desc get a specific product by ID
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

module.exports = router
