var $ = Checkout.$;

class GiftRegistryCheckout {
  constructor(host, uuid, pass) {
    this.config = {
      url: host,
      uuid: uuid,
      pass: pass
    }
  }

  request(method, endpoint, body) {
    const { url } = this.config
    var callUrl = new URL(url + endpoint);
    return fetch(callUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  }

  getPublicRegistry(registryId, password) {
    password = encodeURI(password);
    return this.request("GET", `/registries/${registryId}?password=${encodeURIComponent(password)}`);
  }

  async checkCheckoutProductsAreInGR() {
    this.getPublicRegistry(this.config.uuid, this.config.pass)
    .then(response => response.json())
    .then(data => {
      let included = data.included;
      for (let item of included) {
        let $product = $(`[data-variant-id="${item.attributes.variant_id}"]`);
        if ($product.length > 0) {
          $product.attr('data-is-in-gift-registry', "");
        }
      }
      let itemsNotInGR = $('.product:not([data-is-in-gift-registry])');
      if (itemsNotInGR.length > 0) {
        setInterval(function(){
          $("#continue_button").attr('disabled',"");
          $("#continue_button").addClass('disabled');
          $("[data-shipping-methods]").html("<div class='gr-block-msg'>Can't proceed to next step. Please remove items in cart.</div>");
        }, 200);
        for (let itemNotInGR of itemsNotInGR) {
          let $itemNotInGR = $(itemNotInGR);
          $itemNotInGR.find('.product__description').append("<span style='color: red;'>This item is not listed in the Gift Registry so is unable to be purchased. Please remove.</span");
        }
      }
    })
    .catch(err => {console.log(err)})
  }
}
