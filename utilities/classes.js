class Product {
  constructor(product) {
    const {
      id,
      name,
      description,
      short_description,
      images,
      has_options,
      on_sale,
      prices,
      tags,
      type,
      store,
      variations,
      is_in_stock,
      categories,
      is_purchasable,
      is_on_backorder,
    } = product

    this.id = id
    this.name = name
    this.description = description
    this.short_description = short_description
    this.has_options = has_options
    this.images = images
    this.on_sale = on_sale
    this.prices = prices
    this.tags = tags
    this.type = type
    this.variations = variations
    this.store = store
    this.is_in_stock = is_in_stock
    this.categories = categories
  }
}

module.exports = {
  Product,
}
