if (!customElements.get("recently-viewed-products")) {

  class RecentlyViewedProducts extends HTMLElement {
    constructor() {
      super();
      this.cardProductHTML = cardProductHTMLTemplate; //from theme.liquid
      this.fetchData();
    }

    modifieldProductData(rawProduct) {
      const product = rawProduct.data.product;
      const getId = (id) => id ? parseInt(id.split("/").pop()) : null;
      return {
        ...product,
        id: product.id ? getId(product.id) : null,
        images: product.images.edges.map(item => ({ ...item.node, id: getId(item.node.id) })),
        review: product.review?.value ? JSON.parse(product.review.value) : null,
        ratingCount: product.ratingCount?.value ? JSON.parse(product.ratingCount.value) : null,
        shortDescription: product.shortDescription?.value,
        variants: product.variants.edges.map(item => ({ ...item.node, id: getId(item.node.id) }))
      }
    }

    fetchData() {
      const arr = JSON.parse(localStorage.getItem("recentlyViewedProducts")) || [];
      if (!arr.length) {
        const parent = this.closest('.recently-viewed-products');
        parent.classList.add('d-none');
        parent.querySelector('recently-viewed-products__heading').remove();
        return;
      };
      const queryString = (handle) => `{
        product(handle: \"${handle}\") {
          id
          title
          handle
          description
          vendor
          tags
          images(first: 250) {
            edges {
              node {
                id
                altText
                url
                width
                height  
              }
            }
          }
          variants(first: 250) {
            edges {
              node {
                id
                title
                availableForSale
                compareAtPrice {
                  amount
                  currencyCode
                }
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
          review: metafield(namespace: "reviews", key: "rating") {
            value
          }
          ratingCount: metafield(namespace: "reviews", key: "rating_count") {
            value
          }
          shortDescription: metafield(namespace: "card", key: "short_description") {
            value
          }
        }
      }`
      Promise.all(
        arr.map(handle => {
          return fetch("/api/2023-07/graphql.json", {
            method: "POST",
            headers: {
              "content-type": "application/graphql",
              "x-shopify-storefront-access-token": "3ed37d998f7f99565cdb6ad2350781e2"
            },
            body: queryString(handle)
          }).then(res => res.json()).then(res => this.modifieldProductData(res))
        })
      ).then(resArr => {
        resArr.forEach(p => {
          const productItems = this.buildProductCard(p);
          const div = document.createElement('div');
          div.innerHTML = productItems;
          this.querySelector(".recently-viewed-products__list").innerHTML += div.innerHTML;
        })

      }).then(() => {
        this.addMultipleEvents();
      })
    }

    buildProductCard(product) {
      const price = this.buildPrice(product);
      const featuredImageUrlArr = product.images[0].url.split(".");
      let featuredImageUrl = featuredImageUrlArr.pop();
      featuredImageUrl = featuredImageUrlArr.join(".") + "_60x." + featuredImageUrl;

      return this.cardProductHTML
        .replace(/{itemId}/g, product.id)
        .replace(/{itemUrl}/g, `/products/${product.handle}`)
        .replace(/{itemTitle}/g, product.title)
        .replace(/{itemShortDescription}/g, product.short_description)
        .replace(/{itemImages}/g, this.buildProductImage(product))
        .replace(/{itemFeaturedImage}/g, featuredImageUrl)
        .replace(/{currentVariantId}/g, product.variants[0].id)
        .replace(/{currentVariantPrice}/g, product.variants[0].price)
        .replace(/{currentUrl}/g, location.href)
        .replace(/{itemVendor}/g, product.vendor)
        .replace(/{itemReview.value}/g, product.review?.value)
        .replace(/{itemReview.scaleMax}/g, product.review?.scale_max)
        .replace(/{itemReview.ratingCount}/g, this.buildRatingCount(product))
        .replace(/{itemPriceClass}/g, price.itemPriceClass)
        .replace(/{itemMoneyPrice}/g, price.itemMoneyPrice)
        .replace(/{itemCompareAtPrice}/g, price.itemCompareAtPrice)
        .replace(/{itemBadges}/g, this.buildProductBadges(product))
    }

    buildProductImage(product) {
      let html = `<img src="${product.images[0].url}" />`;
      if (Array.isArray(product.images) && product.images.length > 1) {
        html += `<img class="motion-reduce" src="${product.images[1].url}" />`
      }
      return html;
    }

    buildProductBadges(product) {
      const tags = product.tags || [];
      const badgeObj = {};
      let badge = "";
      let soldOutBadge = "";
      for (let i = 0; i < tags.length; i++) {
        if (tags[i].includes("label")) {
          let badgeArr = tags[i].split("|");
          for (let j = 0; j < badgeArr.length; j++) {
            const item = badgeArr[j];
            if (item.includes("label")) {
              badgeObj.label = item.split(":")[1];
            }
            if (item.includes("bg_colour") || item.includes("bg_color")) {
              badgeObj.bg_color = item.split(":")[1];
            }
            if (item.includes("text_colour") || item.includes("text_color")) {
              badgeObj.text_color = item.split(":")[1];
            }
          }
          badge += `
            <span class="pd-product-badge custom" style="background-color: ${badgeObj.bg_color};color: ${badgeObj.text_color}">
              ${badgeObj.label}
            </span>
          `
          break;
        }
      }

      if (!product.variants[0].availableForSale) {
        soldOutBadge =`
        <span class="pd-product-badge sold-out">
          Sold out
        </span>
        `
        if (this.getAttribute("hide-all-badges") === "true") {
          badge = soldOutBadge;
        } 

        if (this.getAttribute("hide-all-badges") === "false") {
          badge = soldOutBadge + badge;
        } 
      }

      return badge;
    }

    buildPrice(product) {
      let itemCompareAtPrice = "";
      let itemPriceClass = `${!product.variants[0].availableForSale ? "price--sold-out" : ""}`;

      let itemMoneyPrice = parseFloat(product.variants[0].price.amount).toFixed(2);
      itemMoneyPrice = product.variants[0].price.currencyCode ? "$" + itemMoneyPrice + " " + product.variants[0].price.currencyCode : itemMoneyPrice;

      if (product.variants[0].compareAtPrice?.amount) {
        itemCompareAtPrice = parseFloat(product.variants[0].compareAtPrice.amount).toFixed(2);
        itemCompareAtPrice = product.variants[0].compareAtPrice.currencyCode ? "$" + itemCompareAtPrice + " " + product.variants[0].compareAtPrice.currencyCode : itemCompareAtPrice;

        itemPriceClass += `${product.variants[0].compareAtPrice.amount > product.variants[0].price?.amount ? " price--on-sale" : ""}`;
      }

      return {
        itemPriceClass,
        itemMoneyPrice,
        itemCompareAtPrice
      }
    }

    buildRatingCount(product) {
      return product.ratingCount > 1 ? `${product.ratingCount} reviews` : `${product.ratingCount} review`;
    }

    addMultipleEvents() {
      this.querySelectorAll('[data-add-to-lists-button]')?.forEach(button => {

        button.addEventListener('click', e => {
          document.dispatchEvent(new CustomEvent('trigger::addToLists', {
            detail: {
              button
            }
          }));
        });
      })

      this.querySelectorAll('[data-add-to-registry]')?.forEach(button => {
        button.addEventListener('click', e => {
          document.dispatchEvent(new Event('trigger:AddToRegistry'));
        });
      })
    }

  }
  customElements.define("recently-viewed-products", RecentlyViewedProducts);
}