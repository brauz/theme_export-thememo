class GiftRegistry {
  constructor(customerId, timestamp, signature, shop, page, host) {
    this.selectors = {
      customerSubmitForm: "#giftRegistryCreate",
      giftRegistryCollection: "#gift-registry-collection",
      customerEditForm: "#giftRegistryEdit",
      wishlistHeader: ".swym-wishlist-detail-header",
      wishlistIdentifier: "[data-gift-registry-wishlist]",
      wishlistAddButton: "[data-add-all-to-registry]",
      menuButton: ".registry-menu-header",
      bindViewSelector: "[data-tinybind-binder]",
      shareLinkContainer: "[data-share-link]",
      shareLinkPassContainer: "[data-share-link-pass]",
      shareLinkContainerMenu: "[data-registry-share-link]",
      shareLinkContainerPass: "[data-registry-share-link-pass]",
      shareLinkContainerWelcome: "[data-share-link-welcome]",
      shareEmailContainer: "[data-email-share]",
      emailsShareForm: "#shareByEmailForm",
      changePassForm: "#giftRegistryChangePass",
      countdownContainer: "[data-registry-countdown]",
      popupModal: ".gift-registry-modal",
      giftGiversContainer: "[data-gift-givers-view]",
      addToRegistryBtn: "[data-add-to-registry]",
      addToRegistryQuickPopBtn: "[data-add-to-registry-quickpopup",
      giftTracker: "[data-gift-tracker]",
      registryDeleteForm: "#giftRegistryCancel",
      dashboardPage: ".gift-registry-dashboard",
      goBackButtonCart: "[registry-go-back-cart]",
      previewEmailBtn: "[data-preview-email]",
      addToRegistryContainer: '.add-to-registry-wrapper'
    }

    this.state = {
      isLoading: true,
      customer: customerId,
      registry: {},
      registryStatus: "",
      publicRegistry: {},
      giftTracker: [],
      registryProducts: [],
      purchasedProducts: []
    }

    this.page = page;
    this.client = new RegistryClient({ id: customerId }, signature,  timestamp,  shop, host);
    this.publicClient = new RegistryPublicClient(host);
    this.helper = new Helper();
    this.popup = new RegistryPopup();
    this.bindView.bind(this);

    /** helpers */
    this.initMenuAccordion();
    this.initUploadFile();
    /** Main function */
    if (customerId) {
      this.initCustomerRegistry(customerId);

      /** Add items to registry */
      this.updateRegistryProducts();
      this.initAddItemToRegistry(customerId);
      this.initRemoveItemFromRegistry(customerId);

      document.addEventListener("trigger:AddToRegistry", (e) => {
        this.initAddItemToRegistry(customerId);
      })
    }

    /** public registry */
    this.initGiftViewers(); //GIFT GIVERS PAGE

    this.triggerChange();
  }

  triggerChange() {
    const interval = setInterval(function(){
      $('#state').trigger('change');
    }, 100);
    setTimeout(function(){clearInterval(interval)}, 1500);
  }

  async initCustomerRegistry(customerId) {
    try {
      /** if add to registry pages (pdp,collections etc) do not perform  with the exeption f dashboard page*/
      let $container = $(this.selectors.addToRegistryBtn);
      let $dashboard = $(this.selectors.dashboardPage);
      if ($container.length > 0 && $dashboard.length < 0) return;

      if (!this.client.customer.id) return;

      let json = null;
      try {
        const response = await this.fetchCustomerRegistry();
        json = await response.json();
      } catch(err) {
        console.log(err);
      }
      console.log('response', json);
      if (json == null || (json.data && json.data.length < 1)) {
        this.initRegistryCreateForm();
        return;
      };

      $('[data-create-registry-link]').hide();
      this.state.registry = json.data.slice(-1)[0];
      this.state.registryStatus = this.state.registry.attributes.status;
      if (this.state.registry.attributes.status == "cancelled") {
        this.initRegistryCreateForm();
        return;
      }

      this.initStorageSession(customerId);

      this.initAccountRedirect();
      this.initWelcomeMessage();
      this.initRegistryEditForm();
      this.initRegistryChangePassForm();
      this.initShareLink();
      this.initShareEmails();
      this.initWishlistAddToRegistry();
      this.initGiftTracker();
      this.initCancelRegistry();
      this.initCollectionView(json.included);
      this.bindView();
      this.state.isLoading = false;
    } catch(err) {
      console.error(err);
    }
  }

  async fetchCustomerRegistry () {
    return this.client.getCustomerRegistries();
  }

  initAccountRedirect() {
    $("[data-registry-nav]").attr("href", "/account?view=gift-registry-dashboard")
    $("[data-registry-create]").addClass('hidden');
    $("[data-registry-dashboard]").removeClass('hidden');
  }

  initStorageSession(customerId) {
    let data = sessionStorage.getItem(customerId);
    let registryId = this.state.registry.id;

    /** save registry Id */
    if (data == null && this.state.registry.id) {
      sessionStorage.setItem(customerId, registryId);
    } else if (data == null && !this.state.registry.id) {
      sessionStorage.setItem(customerId, 'noregistry');
    }

    this.client.getCustomerRegistry(this.state.registry.id)
    .then(response => response.json())
    .then(data => {
      if (data.errors) return;

      let storageItemsOverride = [];
      for (let item of data.included) {
        storageItemsOverride.push(item.attributes.variant_id);
      }
      overridesItemsSessionsStorage(customerId, storageItemsOverride)
    })
    .catch(err => console.log(err));
  }

  async getRegistryId(customerId) {
    if (!customerId) return null;

    if (sessionStorage.getItem(customerId) == null) {
      try {
        const response = await this.fetchCustomerRegistry();
        json = await response.json();
      } catch(err) {
        return;
      }

      this.state.registry = json.data.slice(-1)[0];
      this.state.registryStatus = this.state.registry.attributes.status;
      this.initStorageSession(customerId);

      return sessionStorage.getItem(customerId);
    }

    return sessionStorage.getItem(customerId);
  }

  /** exterior method used for scanner*/
  async addProductToRegistry(variantId) {
    let body = {
      "data": {
        "type": "registry_item",
        "attributes": {
            "registry_id": this.state.registry.id,
            "variant_id": variantId,
            "quantity": 1,
            "status": "available",
            "allow_fractional_purchase": false
        }
      }
    };

    this.client.addGiftRegistryItem(body)
    .then(response => response.json())
    .then(data => {
      alert(window.scanner.successScanMessage);
      let currentCount = parseInt($("#scanned-count").html());
      currentCount = currentCount+1;
      $("#scanned-count").html(currentCount.toString());
    })
    .catch(err => {
      console.log(err);
    });
  }

  async initCollectionView(itemData) {
    if(!this.state.registry) return
    const registryProducts =  this.state.registry.relationships.registry_items.data.map(itemRef => {
      const item = itemData.find(inc => inc.id === itemRef.id && inc.type === itemRef.type);
      return item ? {...item.attributes, id: itemRef.id} : {}
    })
    let productsIds = [];
    for (let product of registryProducts) {
      productsIds.push(product.product_id);
    }

    let graphQLQuery = `
    {
      products(first:250,query:"id:${productsIds.join(" OR ")}") {
        edges {
          node {
            id
            variants(first:10) {
              edges {
                node {
                  id
                  quantityAvailable
                  metafield(key: "no_delivery", namespace: "custom") {
                    id
                    key
                    value
                  }
                  availableForSale
                  storeAvailability(first:20) {
                    edges {
                      node {
                        available
                        pickUpTime
                        location {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;
    fetch(
      'https://the-memo-store.myshopify.com/api/2022-01/graphql.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/graphql',
          'X-Shopify-Storefront-Access-Token': 'd62833826bf6a71f84efb261d0d33e48',
        },
        body: graphQLQuery
      }
    ).then(response => response.json())
    .then(storeFrontData => {
      for (let storeFrontProductEdge of storeFrontData.data.products.edges) {
        let storeFrontProductNode = storeFrontProductEdge.node;
        for (let storeFrontVariantEdge of storeFrontProductNode.variants.edges) {
          let storeFrontVariantNode = storeFrontVariantEdge.node;
          let normalVariantId = parseInt(storeFrontVariantNode.id.replace(/^\D+/g, ''));
          let el = registryProducts.find(element => element.variant_id == normalVariantId);
          if (!el) {
            continue;
          }
          el['quantityAvailable'] = storeFrontVariantNode.quantityAvailable || 0;
          el['noDelivery'] = storeFrontVariantNode.metafield?.value;
          el['storeAvailability'] = storeFrontVariantNode.storeAvailability?.edges;
          if (el.allow_fractional_purchase == true) {
            let amount_paid = parseFloat(el.item_price) - parseFloat(el.amount_outstanding)
            let outstanding = parseFloat(el.variant_price) - amount_paid;
            el.amount_outstanding = outstanding.toString();
          }
        }
      }

      this.state.registryProducts = [...registryProducts]
      this.state.registryProducts = this.sortGiftGiversProducts(this.state.registryProducts);
      this.renderRegistryCollectionGrid(this.state.registryProducts);
    });

    this.state.registryProducts = this.sortGiftGiversProducts([...registryProducts]);
  }

  isOnlyPickupAvailableAtArmadale(item) {
    if (item.noDelivery !== true && item.noDelivery !== 'true') {
      return false;
    }

    if (!item.storeAvailability?.length) {
      return true;
    }

    if (item.storeAvailability?.length === 1) {
      if (!item.storeAvailability[0].node.available) {
        return true;
      }

      if (item.storeAvailability[0].node.location.name.toLowerCase() === 'armadale') {
        return true;
      }
    }

    return false;
  }

  registryItemStatus(item) {
    if (!item) return 'available';
    let status = 'available';
    let theCase = 0;

    if (item.status === 'purchased') {
      status = 'taken';
      theCase = 2;
    } else if (item.product_status !== 'draft' && (item.product_handle === 'gift-card' || item.product_tags?.includes('DROP-SHIP'))) {
      status = 'available';
      theCase = 1;
    } else if (item.product_status === 'draft' || item.product_status === 'archived' || item.quantityAvailable < 1) {
      status = 'unavailable';
      theCase = 3
    } else {
      if (item.product_status === 'available' || item.product_status === 'partially_purchased') {
        if (item.quantityAvailable < 1) {
          status = 'unavailable';
          theCase = 4;
        }
      }
    }

    if (status === 'available') {
      if (this.isOnlyPickupAvailableAtArmadale(item)) {
        theCase = 5;
        status = 'unavailable';
      }
    }

    return status;
  }

  buildGiftGiverItemButton(item) {
    if (!item) return '';
    const status = this.registryItemStatus(item);

    if (status === 'unavailable') {
      return `<button
          data-is-unavailable
          class="pd-button pd-button--disabled unavailable"
          disabled>TEMPORARILY UNAVAILABLE</button>`;
    }

    if (status === 'taken') {
      return `<button
          class="pd-button pd-button--disabled taken"
          disabled>Taken</button>`;
    }

    return `<button
              class="pd-button pd-button--happy-lemonlime add-to-cart"
              data-give-button>Give this gift</button>`
  }

  renderGiftGiverPagination(ELM_giftGiverContainer, itemsCount, itemsPerPage, currentPage = 1) {
    const pages = Math.ceil(itemsCount / itemsPerPage);
    
    for (let i = (currentPage - 1) * itemsPerPage; i < currentPage * itemsPerPage; i++) {
      ELM_giftGiverContainer.querySelector(`.gift-giver-item-wrapper[data-index="${ i }"]`)?.classList.remove('hidden');
    }

    if (currentPage >= pages) return ELM_giftGiverContainer.querySelector('[data-gift-giver-pagination-container]').innerHTML = '';

    const html = `<div class="pd-pagination">
      <div class="pd-pagination-inner">
        <div class="pd-pagination__status">${ itemsPerPage * currentPage } of ${ itemsCount } items</div>
        <div class="pd-pagination__progress-bar">
          <span class="pd-pagination__progress-bar-thumb" style="width: ${ itemsPerPage * currentPage / itemsCount * 100 }%;"></span>
        </div>
        <button data-view-more-registry-items class="pd-button pd-button--bold-coral">View more</button>
      </div>
    </div>`;

    ELM_giftGiverContainer.querySelector('[data-gift-giver-pagination-container]').innerHTML = html;

    ELM_giftGiverContainer.querySelector('[data-view-more-registry-items]').addEventListener('click', () => this.renderGiftGiverPagination(ELM_giftGiverContainer, itemsCount, itemsPerPage, currentPage + 1));
  }

  buildGiftGiverItemHtml(ELM_giftGiverGrid, item, count, itemsPerPage) {
    let itemHTML = ELM_giftGiverGrid.querySelector('template').innerHTML;
    itemHTML = itemHTML.replace(/{classnames}/g, count >= itemsPerPage ? 'hidden' : '');
    itemHTML = itemHTML.replace(/{item_index}/g, count);
    itemHTML = itemHTML.replace(/{variant_id}/g, item.attributes.variant_id);
    itemHTML = itemHTML.replace(/{product_handle}/g, item.attributes.product_handle);
    itemHTML = itemHTML.replace(/{quantity_available}/g, item.attributes.quantityAvailable);
    itemHTML = itemHTML.replace(/{is_drop_ship}/g, item.attributes.product_tags.search('DROP-SHIP') > -1 ? '<span data-is-drop-ship></span>' : '');
    itemHTML = itemHTML.replace(/{product_image_src}/g, item.attributes.product_image_src);
    itemHTML = itemHTML.replace(/{product_vendor}/g, item.attributes.vendor);
    itemHTML = itemHTML.replace(/{product_title}/g, item.attributes.product_title);
    itemHTML = itemHTML.replace(/{variant_price}/g, item.attributes.variant_price);
    itemHTML = itemHTML.replace(/{gift_registry_item_button}/g, this.buildGiftGiverItemButton(item.attributes));

    return itemHTML;
  }

  renderGiftGiverView(giftGiverData) {
    if (!giftGiverData) return;
    const ITEMS_PER_PAGE = 20;
    const data = giftGiverData.data;
    const ELM_giftGiverContainer = document.querySelector('[data-gift-givers-view]');
    if (ELM_giftGiverContainer) {
      let giftGiverHTML = ELM_giftGiverContainer.innerHTML;
      giftGiverHTML = giftGiverHTML.replace(/{registry_id}/g, data.id);
      giftGiverHTML = giftGiverHTML.replace(/{registry_name}/g, data.attributes.name);
      giftGiverHTML = giftGiverHTML.replace(/{registry_message}/g, data.attributes.registrant_message);
      giftGiverHTML = giftGiverHTML.replace(/{item_count}/g, giftGiverData.included.length + (giftGiverData.included.length > 1 ? ' items' : ' item'));
      giftGiverHTML = giftGiverHTML.replace(/{registrant_name}/g, data.attributes.first_name + ' ' + data.attributes.last_name);
      giftGiverHTML = giftGiverHTML.replace(/{registrant_email}/g, data.attributes.registrant_email);
      giftGiverHTML = giftGiverHTML.replace(/{registry_date}/g, data.attributes.bundle_delivery_date);
      giftGiverHTML = giftGiverHTML.replace(/{registry_status}/g, data.attributes.status);

      ELM_giftGiverContainer.innerHTML = giftGiverHTML;
      ELM_giftGiverContainer.querySelector('.loading-state')?.classList.add('hidden');
    }

    if (giftGiverData.included.length > ITEMS_PER_PAGE) {
      this.renderGiftGiverPagination(ELM_giftGiverContainer, giftGiverData.included.length, ITEMS_PER_PAGE, 1);
    }

    const ELM_giftGiverGrid = document.querySelector('[data-gift-giver-grid]');
    if (ELM_giftGiverGrid) {
      let count = 0;
      const unavailableItems = [];
      const takenItems = [];
      let gridHTML = giftGiverData.included?.map((item, idx) => {
        const itemStatus = this.registryItemStatus(item.attributes);
        if (itemStatus === 'taken') {
          takenItems.push(item);
          return '';
        }
        
        if (itemStatus === 'unavailable') {
          unavailableItems.push(item);
          return '';
        }
        
        const itemHTML = this.buildGiftGiverItemHtml(ELM_giftGiverGrid, item, count, ITEMS_PER_PAGE);
        count += 1;
        return itemHTML;
      }).join('');

      gridHTML += takenItems?.map(item => {
        const itemHTML = this.buildGiftGiverItemHtml(ELM_giftGiverGrid, item, count, ITEMS_PER_PAGE);
        count += 1;
        return itemHTML;
      }).join('');

      gridHTML += unavailableItems?.map(item => {
        const itemHTML = this.buildGiftGiverItemHtml(ELM_giftGiverGrid, item, count, ITEMS_PER_PAGE);
        count += 1;
        return itemHTML;
      }).join('');

      ELM_giftGiverGrid.querySelector('[data-gift-giver-grid-container]').innerHTML = gridHTML;

      document.querySelectorAll('[data-give-button]')?.forEach(ELM_button => ELM_button.addEventListener('click', e => {
        document.dispatchEvent(new CustomEvent('GiftRegistryMessageDrawer::Open', {
          detail: {
            buttonElm: e
          }
        }))
      }))
    }

    this.initSortRegistryItem();
  }

  openLightBoxNormal(variant, quantity) {
    let $container = $(this.selectors.popupModal);
    if (!($container.length > 0)) return;

    $container.removeClass('fractional');
    $container.removeAttr("data-fractional-amount");
    $('#giftAmount').val();

    this.openLightBox(variant, $container, quantity);
  }

  openLightBoxFractional(variant) {
    let $container = $(this.selectors.popupModal);
    if (!($container.length > 0)) return;

    $container.addClass('fractional');
    $container.attr("data-fractional-amount", variant);

    let $fractioncal = $(`[data-fractional-variant-id='${variant}']`);
    let outstanding = parseFloat($fractioncal.attr('data-fractional-amount_outstanding'));

    $container.find("#giftAmount").attr('max', outstanding);
    $container.find("[data-amount-oustanding]").html(outstanding.toFixed(2));

    this.openLightBox(variant, $container);
  }

  openLightBox(variant, $container, quantity = 1) {
    $("#qty-exceeded-msg").addClass("hide");

    $container.attr("data-variant-id", variant);
    $container.attr("data-variant-qty-max", quantity);
    $container.addClass("cc-popup--visible");

    $("body").addClass("cc-popup-no-scroll");
  }

  deleteFromRegistry(e) {
    const index = e.target.dataset.itemIndex;
    const id = this.state.registryProducts[index].id
    const body = {
      "data": {
        "type": "registry_item",
        "attributes": {
          "registry_item_id": id,
          "registry_id": this.state.registry.id
        }
      }
    }
    this.state.registryProducts.splice(index, 1);
    this.client.deleteItemFromRegistry(id, body)
      .then(res => {
        $(`.gift-registry-item[data-product-id="${ id }"]`).remove();
      })
  }

  editRegistryProductQtyPlus(e) {
    const index = e.target.dataset.itemIndex;
    const product = this.state.registryProducts[index];
    const $qtyContainer = $(`[name="quantity"][data-item-index="${index}"]`);
    let qty = parseInt($qtyContainer.val()) + 1;
    this.editRegistryProductQty(product, qty);
  }

  editRegistryProductQtyMin(e) {
    const index = e.target.dataset.itemIndex; 
    const product = this.state.registryProducts[index];
    const $qtyContainer = $(`[name="quantity"][data-item-index="${index}"]`);
    let qty = parseInt($qtyContainer.val()) - 1;

    if (qty == 0) {
      return;
    }

    this.editRegistryProductQty(product, qty);
  }

  editRegistryProductQty(product, qty) {
    const registryId = this.state.registry.id;

    let data = {
      "data": {
        "type": "registry_item",
         "attributes": {
            "id": product.id,
            "registry_item_id": product.id,
            "type": "registry_item",
            "registry_id": registryId,
            "quantity": qty
        }
      }
    }

    this.client.updateGiftRegistryItem(product.id, data)
    .then(response => response.json())
    .then(data => {
      if (data.errors) {
        return;
      }

      $(`.gift-registry-item[data-product-id="${ product.id }"] [name="quantity"]`).val(qty);
    })
  }

  addRegistryItemToCart(e) {
    const ELM_addToCartBtn = e.target;
    const ELM_registryItem = ELM_addToCartBtn.closest('.gift-registry-item');
    const ELM_errorMessage = ELM_registryItem.querySelector('[data-registry-item-error-message]');
    const ELM_cartNotification = document.querySelector('.pd-cart-notification');
    const data = ELM_registryItem.dataset;
    const fetchData = {
      items: [{
        id: data.variantId,
        quantity: ELM_registryItem.querySelector('[name="quantity"]').value,
        properties: {
          _registry: true
        }
      }]
    }

    const buttonText = ELM_addToCartBtn.innerHTML;
    ELM_addToCartBtn.innerHTML = 'Adding...';
    ELM_addToCartBtn.disabled = true;
    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fetchData)
    })
    .then(response => response.json())
    .then(response => {
      if (response.status) {
        ELM_errorMessage.innerHTML = 'Error: Out of stock!';
        ELM_addToCartBtn.innerHTML = buttonText;
        return;
      }

      ELM_cartNotification.open();
      ELM_errorMessage.innerHTML = '';
      ELM_addToCartBtn.innerHTML = 'Added!';
      setTimeout(() => ELM_addToCartBtn.innerHTML = buttonText, 2000);
    })
    .catch((error) => {
      console.error('Error:', error);
    })
    .finally(() => {
      ELM_addToCartBtn.disabled = false;
    });
  }

  editRegistryProduct(index) {
    const product = this.state.registryProducts[index];
    const fractional = !product.allow_fractional_purchase;
    const registryId = this.state.registry.id;

    let data = {
      "data": {
        "type": "registry_item",
         "attributes": {
            "id": product.id,
            "registry_item_id": product.id,
            "type": "registry_item",
            "registry_id": registryId,
            "allow_fractional_purchase": fractional
        }
      }
    }

    this.client.updateGiftRegistryItem(product.id, data)
    .then(response => response.json())
    .then(data => {
      if (data.errors) {
        return;
      }
      product.allow_fractional_purchase = fractional;
    })
  }

  initSortRegistryItem() {
    const ELM_sortSelect = document.querySelector('[data-sort-registry-items]');
    if (!ELM_sortSelect) return;

    ELM_sortSelect.addEventListener('change', e => {
      const sortValue = e.target.value;
      if (!sortValue) return;
      const sortField = ELM_sortSelect.querySelector(`option[value="${sortValue}"]`)?.dataset.field || '';
      if (!sortField) return;
      const compare = function( a, b) {
        let sortA = a.attributes[sortField];
        let sortB = b.attributes[sortField];
        if (sortField == 'item_price') {
          sortA = parseFloat(sortA);
          sortB = parseFloat(sortB);
        }
        if (sortA < sortB){
          return -1;
        }
        if (sortA > sortB){
          return 1;
        }
        return 0;
      }

      this.state.publicRegistry.included.sort(compare);
      if (sortValue == 'DESC') {
        this.state.publicRegistry.included.reverse();
      }

      this.renderGiftGiverView(this.state.publicRegistry);
    })
  }

  buildGiftRegistryItemButton(item) {
    if (!item) return '';
    const status = this.registryItemStatus(item);

    if (status === 'unavailable') {
      return `<button
          data-is-unavailable
          class="pd-button pd-button--disabled unavailable"
          disabled>TEMPORARILY UNAVAILABLE</button>`;
    }

    if (status === 'taken') {
      return `<button
          class="pd-button pd-button--happy-lemonlime taken"
          disabled style="opacity: 1">Purchased</button>`;
    }

    return `<button
              data-add-registry-item-to-cart
              class="pd-button pd-button--lively-blue add-to-cart"
              data-give-button>Buy it now <span class="tooltip">Please note that any purchases made prior to Your registry Delivery date will not be eligible for your 15% discount. Best to wait until you receive your discount code.</span></button>`
  }

  renderRegistryCollectionGrid(registryProducts) {
    if (!registryProducts || !registryProducts.length) return;

    const ELM_giftRegistryrGrid = document.querySelector('[data-registry-grid]');
    if (ELM_giftRegistryrGrid) {
      const gridHTML = registryProducts?.map((item, idx) => {
        let itemHTML = ELM_giftRegistryrGrid.querySelector('template').innerHTML;
        const itemStatus = this.registryItemStatus(item)
        let order = itemStatus !== 'available' ? '9999' : 'unset';
        if (itemStatus === 'taken') {
          order = '999';
        }

        itemHTML = itemHTML.replace(/{order}/g, order);
        itemHTML = itemHTML.replace(/{product_index}/g, idx);
        itemHTML = itemHTML.replace(/{product_id}/g, item.id);
        itemHTML = itemHTML.replace(/{variant_id}/g, item.variant_id);
        itemHTML = itemHTML.replace(/{product_handle}/g, item.product_handle);
        itemHTML = itemHTML.replace(/{quantity_available}/g, item.quantityAvailable);
        itemHTML = itemHTML.replace(/{is_drop_ship}/g, item.product_tags.search('DROP-SHIP') > -1 ? '<span data-is-drop-ship></span>' : '');
        itemHTML = itemHTML.replace(/{product_image_src}/g, item.product_image_src);
        itemHTML = itemHTML.replace(/{product_vendor}/g, item.vendor);
        itemHTML = itemHTML.replace(/{product_title}/g, item.product_title);
        itemHTML = itemHTML.replace(/{product_quantity}/g, item.quantity);
        itemHTML = itemHTML.replace(/{variant_price}/g, item.variant_price);
        itemHTML = itemHTML.replace(/{gift_registry_item_button}/g, this.buildGiftRegistryItemButton(item));
        itemHTML = itemHTML.replace(/{gift_registry_item_remove_button}/g, item.product_status === 'available' ? `<a data-item-index="${ idx }" class="gift-registry-item__remove-button">Remove</a>` : '');

        return itemHTML;
      }).join('');

      ELM_giftRegistryrGrid.querySelector('[data-registry-grid-container]').innerHTML = gridHTML;

      document.querySelectorAll('[data-quantity="down"]')?.forEach(ELM_button => ELM_button.addEventListener('click', e => this.editRegistryProductQtyMin(e)));

      document.querySelectorAll('[data-quantity="up"]')?.forEach(ELM_button => ELM_button.addEventListener('click', e => this.editRegistryProductQtyPlus(e)));

      document.querySelectorAll('[data-remove-registry-item-button]')?.forEach(ELM_button => ELM_button.addEventListener('click', e => this.deleteFromRegistry(e)));

      document.querySelectorAll('[data-add-registry-item-to-cart]')?.forEach(ELM_button => ELM_button.addEventListener('click', e => this.addRegistryItemToCart(e)))
    }
  }

  bindView() {
    let container = $(this.selectors.bindViewSelector);
    if (!container.length > 0) {
      return;
    }

    tinybind.bind(container, {
      data: this.state,
      methods: {
        deleteFromRegistry: this.deleteFromRegistry.bind(this),
        editRegistryProduct: this.editRegistryProduct.bind(this),
        editRegistryProductQtyMin: this.editRegistryProductQtyMin.bind(this),
        editRegistryProductQtyPlus: this.editRegistryProductQtyPlus.bind(this)
      }
    });
  }

  initShareLink() {
    /** verify we have a registry */
    if (this.state.registry.length == {}) return;
    /** link for menu */
    let $containerMenu = $(this.selectors.shareLinkContainerMenu);
    if ($containerMenu.length < 1) return;

    var callUrl = new URL(this.page);
    callUrl.searchParams.append('r', this.state.registry.id);
    let urlAsString = decodeURI(callUrl.toString());
    $($containerMenu).attr("href", urlAsString);
    $($containerMenu).html(urlAsString);
    $containerMenu.parent().css('display', '');

    let $containerMenuPass = $(this.selectors.shareLinkContainerPass);
    if ($containerMenuPass.length > 0) {
      $($containerMenuPass).html(this.state.registry.attributes.password);
    }

    let $containerWelcome = $(this.selectors.shareLinkContainerWelcome);
    if ($containerWelcome.length > 0) {
      callUrl.searchParams.append('p', this.state.registry.attributes.password);
      let guestViewUrl = decodeURI(callUrl.toString());
      $($containerWelcome).attr("href", guestViewUrl);
    }

    /** link for share page */
    let $container = $(this.selectors.shareLinkContainer);
    if ($container.length < 1) return;

    $container.html(urlAsString);
    let $containerPassword = $(this.selectors.shareLinkPassContainer);
    $containerPassword.html(this.state.registry.attributes.password);

    $container.on('click', event => {
      event.preventDefault();
      if (navigator.share) {
        navigator.share({
          title: 'Registry share',
          url: urlAsString
        }).then(() => {
          console.log('Thanks for sharing!');
        })
        .catch(console.error);
      } else {
        navigator.clipboard.writeText(urlAsString).then(function() {
          this.helper.appendCopiedMessage($container);
          console.log('Async: Copying to clipboard was successful!');
        }.bind(this), function(err) {
          console.error('Async: Could not copy text: ', err);
        });
      }
    });
  }

  initShareEmails() {
    let $shareEmailsForm = $(this.selectors.emailsShareForm);
    if (!($shareEmailsForm.length > 0)) return;

    let formSelectors = {
      emails: "#emails",
      content: "#emailText",
    };

    var self = this;
    $shareEmailsForm.submit(function(e) {

      e.preventDefault();

      let emails = $(formSelectors.emails).val();
      let content = $(formSelectors.content).val();
      if (!emails) return;

      emails = emails.split(",");
      let body = {
        "data": {
          "type": "registry_share",
          "attributes": {
            "email_addresses": emails,
            "share_message": content
          }
        }
      };

      const $submitBtn = $('[data-share-email-submit-button]');
      const submitBtnHtml = $submitBtn.html();

      $submitBtn.html(`<div class="loader">Loading...</div>`);
      self.client.shareRegistry(self.state.registry.id, body)
      .then(response => response.json())
      .then(data => {
        if (data.errors) {
          $('.loader-wrapper').html("Share via email");
          $('.registry-action-btn').after(`<div class="registry-error-msg is-abs">${data.errors[0].detail}!</div>`);
          setTimeout(() => {$(".registry-error-msg").remove()}, 2000);
          return;
        }

        $('.loader-wrapper').html("Share via email");
        
        $submitBtn.html('Email sent!')
        setTimeout(() => {$submitBtn.html(submitBtnHtml)}, 2000);

        $(formSelectors.emails).val("");
        $(formSelectors.content).val("");

      })
      .catch(err => console.log(err));
    });

    let $previewBtn = $(self.selectors.previewEmailBtn);
    if ($previewBtn.length > 0) {
      $previewBtn.on('click', function(e) {
        e.preventDefault();

        let content = $(formSelectors.content).val();
        $('.preview-email').addClass('open');
        $('#previewEmailMsg').html(content);
      })
    }
  }

  initWelcomeMessage() {
    let selectors = {
      header: ".welcome--header",
      message: ".welcome--message"
    };

    let $container = $('.registry-welcome');
    if (($container.length < 1) || this.state.registry.length == {}) {
      return;
    }

    let registryAttrs = this.state.registry.attributes;
    $(selectors.header).html(registryAttrs.name);
    $(selectors.message).html(registryAttrs.registrant_message);
  }

  initCountDown() {
    let $container = $(this.selectors.countdownContainer);
    if (!($container.length > 0)) return

    let daysToGo = this.helper.calculateDaysToGo("01/21/2022");
    let daysToGoMsg = ``;
    if (daysToGo == 1) {
      daysToGoMsg = `${daysToGo} Day to go!`;
    } else {
      daysToGoMsg = `${daysToGo} Days to go!`;
    }

    if (daysToGo > 0) {
      $container.html(daysToGoMsg);
    } else {
      $container.parent().remove
    }
  }

  initRegistryCreateForm() {
    const form = $(this.selectors.customerSubmitForm);
    if(!form.length) return;

    form.submit(function(e) {

      e.preventDefault();

      let body = this.getFormAttributes();
      this.client.createRegistry(body)
      .then(response => response.json())
      .then(data => {
        if (data.errors && data.errors.length > 0) {
          $('.registry-error-msg').remove();
          $('.registy-submit-btn').after(`<div class="registry-error-msg">${data.errors[0].detail}</div>`);
        } else {
          $('.registy-submit-btn').after(`<div class="registry-success-msg">Registry created!</div>`);
          setTimeout(() => {window.location.href = "/account?view=gift-registry-dashboard";}, 1000);
        }
      })
      .catch(data => console.log('error', data));
    }.bind(this));
  }

  initRegistryChangePassForm() {
    const form = $(this.selectors.changePassForm);
    if(!form.length) return;

    form.submit(function(e) {

      e.preventDefault();

      const pass1 = $('#newPass').val();
      const pass2 = $('#newPass2').val();

      $('.registry-msg').remove();
      if (pass1 != pass2) {
        $('[data-change-pass-btn]').after(`<div class="registry-msg registry-error-msg">Passwords doesn't match!</div>`);
        return;
      }

      const body = {
        "data": {
          "type": "registries",
          "attributes": {
              "password": pass1,
          }
        }
      };


      var self = this;
      this.client.updateRegistry($('#registryId').val(), body)
      .then(response => response.json())
      .then(data => {
        if (data.errors && data.errors.length > 0) {
          $('[data-change-pass-btn]').after(`<div class="registry-msg registry-error-msg">${data.errors[0].detail}</div>`);
        } else {
          $('[data-change-pass-btn]').after(`<div class="registry-msg registry-success-msg">Password updated!</div>`);
          setTimeout(() => {$('.registry-msg').remove();}, 2000);
          this.state.registry.attributes.password = data.data.attributes.password;
          self.initShareLink();
        }
      })
      .catch(data => console.log('error', data));
    }.bind(this));
  }

  initRegistryEditForm() {
    const form = $(this.selectors.customerEditForm);
    if(!form.length) return;

    form.submit(function(e) {

      e.preventDefault();

      let body = this.getFormAttributes();

      this.client.updateRegistry($('#registryId').val(), body)
      .then(response => response.json())
      .then(data => {
        if (data.errors && data.errors.length > 0) {
          $('.registry-error-msg').remove();
          $('.registy-submit-btn').after(`<div class="registry-msg registry-error-msg">${data.errors[0].detail}</div>`);
        } else {
          $('.registy-submit-btn').after(`<div class="registry-msg registry-success-msg">Registry updated!</div>`);
          setTimeout(() => {$('.registry-msg').remove();}, 2000);
        }
      })
      .catch(data => console.log('error', data));
    }.bind(this));
  }

  initGiftTracker() {
    let $container = $(this.selectors.giftTracker);
    if ($container.length < 1) return;
    this.state.isLoading = true;

    this.client.getGiftTracker(this.state.registry.id)
    .then(response => response.json())
    .then(data => {
      if (data.errors) throw `Can't fetch gift tracker`;

      let allProducts = data.included;
      let giftGivers = data.data;

      let giftTracker = [];
      for (let i = 0; i < giftGivers.length; i++) {
        let giverName = giftGivers[i].attributes.gift_giver_name;
        let giverMessage = giftGivers[i].attributes.gift_giver_message;
        let giverDate = new Date(giftGivers[i].attributes.created_at);
        var relatedProducts = giftGivers[i].relationships.order_registry_items.data;
        relatedProducts = relatedProducts.map(function(value) { return value['id']; });

        let giverProduct = allProducts.filter(product => relatedProducts.includes(product.id));
        if (giverProduct.length == 0 || !giverName) {
          continue;
        }

        let gifGiverObj = {
          name: giverName,
          message: giverMessage,
          products: giverProduct,
          date: giverDate.toLocaleDateString()
        }
        giftTracker.push(gifGiverObj);
      }
      
      this.state.isLoading = false;
      this.state.giftTracker = giftTracker;
    })
    .catch(err => console.log(err));
  }

  async updateRegistryProducts() {
    try {
      const response = await this.fetchCustomerRegistry();
      const json = await response.json();

      if (json.data && json.data.length > 0) {
        this.state.registry = json.data.slice(-1)[0];
        this.state.registryStatus = this.state.registry.attributes.status;
        this.initCollectionView(json.included);
      }
    } catch(err) {
      console.log(err);
      return;
    }
  }

  async initAddItemToRegistry(customerId) {
    var self = this;

    var registryId = await this.getRegistryId(customerId);
    waitForElementToDisplay(this.selectors.addToRegistryBtn, function(){
      if (customerId && registryId && registryId != 'noregistry') {
        $(this.selectors.addToRegistryBtn).show();
      }
    }.bind(this),1000,9000);

    waitForElementToDisplay(this.selectors.addToRegistryBtn, function(){
      $(this.selectors.addToRegistryBtn).each(function() {
        let variantId = $(this).attr("data-variant-id");
        if (isVariantInStorage(self.client.customer.id, variantId)) {
          $(this).closest(self.selectors.addToRegistryContainer).addClass("in-registry");
          $(this).find(".text").html("Added to registry");
          $(this).addClass('added');
        }
      })
    }.bind(this),1000,9000);

    waitForElementToDisplay(this.selectors.addToRegistryQuickPopBtn, function(){
      $(this.selectors.addToRegistryQuickPopBtn).each(function() {
        let variantsIds = $(this).attr("data-variants-ids");
        variantsIds = variantsIds.split(",");
        for (let variantId of variantsIds) {
          if (isVariantInStorage(self.client.customer.id, variantId)) {
            $(this).closest(self.selectors.addToRegistryContainer).addClass("in-registry");
          }
        }
      })
    }.bind(this),1000,9000);

    $(document).on("click", self.selectors.addToRegistryBtn, function(e) {
      e.preventDefault();

      let $container = $(this);
      if ($container.length < 1) return;
      if ($container.closest(self.selectors.addToRegistryContainer).hasClass('in-registry') || $container.hasClass('lock')) {
        return;
      }
      $container.addClass("lock");
      console.log("adding to registry");

      $("[data-gift-registry-message]").remove();

      let variantId = $container.attr("data-variant-id");
      let allow_fractional_purchase = false;
      let quantity = 1;

      if ($(".quantity-wrapper input").length > 0) {
        quantity = $(".quantity-wrapper input").val()
      }

      let body = {
          "data": {
              "type": "registry_item",
              "attributes": {
                  "registry_id": registryId,
                  "variant_id": variantId,
                  "quantity": quantity,
                  "allow_fractional_purchase": allow_fractional_purchase,
                  "status": "available"
              }
          }
      };

      self.client.addGiftRegistryItem(body)
      .then(response => response.json())
      .then(data => {
        if (data.error && data.error.length) {
          $(".registry-add").append("<div data-gift-registry-message>An error occured</div>");
        } else {
          addItemToSessionStorage(self.client.customer.id, variantId);
          $container.closest(self.selectors.addToRegistryContainer).addClass("in-registry");
          $container.find(".text").html("Added to registry");
          self.updateRegistryProducts();

          $('[data-add-to-registry-quickpopup]').each(function() {
            let variantsIds = $(this).attr('data-variants-ids');
            if (variantsIds.includes(variantId)) {
              $(this).closest(self.selectors.addToRegistryContainer).addClass('in-registry');
            }
          });
          console.log("added to registry");
        }
        $container.removeClass("lock");
      })
      .catch(err => {
        console.log(err);
        $container.addClass("lock");
      });
    })
  }

  async initRemoveItemFromRegistry(customerId) {
    var self = this;

    $(document).on("click", self.selectors.addToRegistryBtn, function(e) {
      e.preventDefault();

      console.log("removing from registry");

      let $container = $(this);
      if (!$container.closest(self.selectors.addToRegistryContainer).hasClass('in-registry')) {
        return;
      }

      $("[data-gift-registry-message]").remove();

      let variantId = $container.attr("data-variant-id");
      let registryItemId = null;
      for (let product of self.state.registryProducts) {
        if (product.variant_id == variantId) {
          registryItemId = product.id;
          break;
        }
      }

      if (!registryItemId) {
        return;
      }

      const body = {
        "data": {
          "type": "registry_item",
          "attributes": {
            "registry_item_id": registryItemId,
            "registry_id": self.state.registry.id
          }
        }
      }

      self.client.deleteItemFromRegistry(variantId, body)
      .then(data => {
          removeItemFromSessionStorage(self.client.customer.id, variantId);
          $container.closest(self.selectors.addToRegistryContainer).removeClass("in-registry");
          $container.find(".text").html("ADD TO REGISTRY");
          self.updateRegistryProducts();

          $('[data-add-to-registry-quickpopup]').each(function() {
            let variantsIds = $(this).attr('data-variants-ids');
            if (variantsIds.includes(variantId)) {
              $(this).closest(self.selectors.addToRegistryContainer).removeClass('in-registry');
            }
          });
      });
    })
  }

  initCancelRegistry() {
    var selectors = {
      checkbox: "#deactivate"
    };

    const form = $(this.selectors.registryDeleteForm);
    if(!form.length) return;

    var self = this;

    form.submit(function(e) {

      e.preventDefault();

      let $checkbox = $(selectors.checkbox);
      if ($checkbox.is(":checked")) {
        let wantDelete = confirm("Are you sure you want to deactivate account?");
        if (wantDelete) {
          let registryId = self.state.registry.id;
            self.client.cancelRegistry(registryId)
            .then(response => response.json())
            .then(data => {

              if (data.errors) {
                $('.registy-submit-btn').after(`<div class="registry-error-msg">Please remove items from registry before deactivating it</div>`);
              } else {
                sessionStorage.removeItem(self.state.customer);
                sessionStorage.removeItem(`${self.state.customer}-items`);
                self.state = {};
                window.location.href = "/account"
              }
            })
            .catch(err => console.log(err));
          // });
        }
      }
    });
  }

  getFormAttributes() {
    let state = $("#state").val();
    let stateName = $(`#state option[value='${state}']`).html();
    let body = {
        "data": {
            "type": "registries",
            "attributes": {
                "name": $("#registryName").val(),
                "password": $("#registryPassword").val(),
                "bundle_delivery_address": {
                    "address1": $("#address1").val(),
                    "address2": $("#address2").val(),
                    "city": $("#city").val(),
                    "province_code": state,
                    "province": stateName,
                    "zip": $("#postcode").val(),
                    "country_code": "AU",
                    "country": "Australia"
                },
                "bundle_delivery_date": $('[name="delivery_date"]').val(),
                "notify_registry_purchase":$("#notify").val(),
                "registrant_message": $("#registryMessage").val()

            }
        }
    };

    return body;
  }

  initUploadFile() {
    var input = $('#registry-image');
    if(!input.length) return;

    var label = $('#registry-image-label');
    var label_val = label.html();

    input.on('change', function (e) {
      var filename = e.target.value.split('\\').pop();

      if (filename) {
        label.html(filename);
      } else {
        label.html(label_val);
      }
    });
  }

  initWishlistAddToRegistry() {
    if (!$(this.selectors.wishlistIdentifier).length > 0) {
      return;
    }

    waitForElementToDisplay(this.selectors.wishlistHeader,function(){
      $(this.selectors.wishlistHeader).prepend(`<a href="#" data-add-all-to-registry> Add All To Registry</a>`);
    }.bind(this),1000,9000);

    $(document).on("click", this.selectors.wishlistAddButton , function(e){
      e.preventDefault();

      let promise = new Promise(function(resolve, reject) {
        window._swat.fetch( function(r) {
          if (r.length > 0) {
            resolve(r);
          } else {
            reject("Error");
          }
        });
      });

      promise.then(function (r) {
        let productsBulkData = { "data": []};
        for (let i = 0; i < r.length; i++) {
          let product = r[i];
          let productdata =  {
            "type": "registry_item",
            "attributes": {
              "registry_id": window.giftRegistry.registryId,
              "variant_id": product.empi,
              "quantity": 1,
              "allow_fractional_purchase": false,
              "status": "available"
            }
          }
          productsBulkData.data.push(productdata);
        }
        // let callUrl = this.createCallUrl(this.settings.callUrls.bulkCreate);

        this.makeAPICall("POST", callUrl, productsBulkData, function(){console.log("success")}, function(e){console.log(e)});
      }.bind(this))
      .catch(function(e){console.log(e)});
    }.bind(this));
  }

  initMenuAccordion() {
    $(this.selectors.menuButton).on("click", function() {
      $(this).parent().toggleClass("open");
    })
  }

  initGiftViewers() {
    const $container = $(this.selectors.giftGiversContainer);
    if ($container.length < 1) return;

    const urlParams = new URLSearchParams(window.location.search);
    let registry = urlParams.get('r');
    let password = urlParams.get('p');
    if (!registry || !password) {
      return
    }

    var self = this;

    this.publicClient.getPublicRegistry(registry, password)
    .then(response => response.json())
    .then(data => {
      if (data.errors && data.errors.length > 0) {
        window.location.href = "/pages/search-for-registry";
      }

      let productsIds = [];
      for (let productIncluded of data.included) {
        productsIds.push(productIncluded.attributes.product_id);
      }

      let graphQLQuery = `
      {
        products(first:250,query:"id:${productsIds.join(" OR ")}") {
          edges {
            node {
              id
              vendor
              variants(first:10) {
                edges {
                  node {
                    id
                    quantityAvailable
                    metafield(key: "no_delivery", namespace: "custom") {
                      id
                      key
                      value
                    }
                    availableForSale
                    storeAvailability(first:20) {
                      edges {
                        node {
                          available
                          pickUpTime
                          location {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`;
      fetch(
        'https://the-memo-store.myshopify.com/api/2022-01/graphql.json',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/graphql',
            'X-Shopify-Storefront-Access-Token': 'd62833826bf6a71f84efb261d0d33e48',
          },
          body: graphQLQuery
        }
      ).then(response => response.json())
      .then(storeFrontData => {
        for (let storeFrontProductEdge of storeFrontData.data.products.edges) {
          let storeFrontProductNode = storeFrontProductEdge.node;
          for (let storeFrontVariantEdge of storeFrontProductNode.variants.edges) {
            let storeFrontVariantNode = storeFrontVariantEdge.node;
            let normalVariantId = parseInt(storeFrontVariantNode.id.replace(/^\D+/g, ''));
            let el = data.included.find(element => element.attributes.variant_id == normalVariantId);
            if (!el) {
              continue;
            }
            el.attributes['quantityAvailable'] = storeFrontVariantNode.quantityAvailable;
            el.attributes['noDelivery'] = storeFrontVariantNode.metafield?.value;
            el.attributes['storeAvailability'] = storeFrontVariantNode.storeAvailability?.edges;
            el.attributes['vendor'] = storeFrontProductEdge.node.vendor;
            if (el.attributes.allow_fractional_purchase == true) {
              let amount_paid = parseFloat(el.attributes.item_price) - parseFloat(el.attributes.amount_outstanding)
              let outstanding = parseFloat(el.attributes.variant_price) - amount_paid;
              el.attributes.amount_outstanding = outstanding.toString();
            }
          }
        }

        this.state.publicRegistry = data;
        this.state.registryStatus = this.state.publicRegistry.data.attributes.status;
        this.state.publicRegistry.included = this.sortGiftGiversProducts(this.state.publicRegistry.included);

        self.renderGiftGiverView(data);
      });

      this.state.publicRegistry = data;
      this.state.registryStatus = this.state.publicRegistry.data.attributes.status;
    })
    .catch(data => console.log('giftGivers error', data));
  }

  sortGiftGiversProducts(products) {
    var availableObjects = [];
    var purchasedObjects = [];
    var unavailableObjects = [];

    products.forEach(product => {
      var productAttributes = product.attributes ? product.attributes : product;

      if (productAttributes.product_status != 'archived') {
        if ((productAttributes.quantityAvailable > 0 && productAttributes.status !== 'purchased') || productAttributes.product_handle === 'gift-card' || productAttributes.product_tags.includes('DROP-SHIP')) {
          availableObjects.push(product);
        } else if(productAttributes.status === 'purchased') {
          purchasedObjects.push(product);
        } else {
          unavailableObjects.push(product);
        }
      }
    });

    return [...availableObjects, ...purchasedObjects, ...unavailableObjects];
  }
}

class GiftSearchPage {
  constructor(host, giftViewerPageUrl) {
    this.selectors = {
      registrySearchPageContainer: "#registry-search"
    }

    this.giftViewerPageUrl = giftViewerPageUrl;

    this.state = {
      loading: false,
      searchPerformed: false,
      searchPhrase: "",
      registryName: "",
      queryParams: {},
      link: "",
      password: "",
      hideInput: false,
      searchResults: [
      ]
    }

    this.client = new RegistryPublicClient(host);
    this.checkQueryParams();
    this.bindSearchPage();
  }

  goToRegistry(e) {
    e.preventDefault();
    const registryId = e.target.dataset.registryId;
    let name = "";
    for (let registry of this.state.searchResults) {
      if (registry.id == registryId) {
        name = registry.attributes.name;
        break;
      }
    }
    const link = `${this.giftViewerPageUrl}?&r=${registryId}`;
    window.location.href = `/pages/search-for-registry?link=${encodeURIComponent(link)}&r=${registryId}&n=${name}`;
  }

  checkQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    this.state.queryParams.link = urlParams.get('link');
    this.state.queryParams.password = urlParams.get('p');
    this.state.registryName = urlParams.get('n');
    this.state.link = urlParams.get('link');
    if (this.state.link && this.state.link != "") {
      this.state.hideInput = true;
    }
  }

  bindSearchPage() {
    const container = $(this.selectors.registrySearchPageContainer);
    if(!container.length) return;

    tinybind.bind(container, {
      data: this.state,
      methods: {
        onFullNameSearch: this.searchByFullName.bind(this),
        onDirectLinkSearch: this.searchByDirectLink.bind(this),
        onGoClick: this.loginToRegistry.bind(this),
        goToRegistry: this.goToRegistry.bind(this)
      }
    })

  }

  searchByFullName() {
    this.state.loading = true;
    this.client.searchWithName(this.state.searchPhrase)
    .then(res => res.json())
    .then(data => {
      this.state.searchResults = data.data
      this.state.searchPerformed = true;
      this.state.loading = false;
    }).catch(console.log)
    // this.state.searchPerformed = true;
  }

  searchByDirectLink() {
    this.state.searchPerformed = true;
  }

  loginToRegistry() {
    window.location.href = this.state.link + `&p=${encodeURIComponent(this.state.password)}`;
  }

}

function waitForElementToDisplay(selector, callback, checkFrequencyInMs, timeoutInMs) {
  var startTimeInMs = Date.now();
  (function loopSearch() {
    if (document.querySelector(selector) != null) {
      callback();
      return;
    }
    else {
      setTimeout(function () {
        if (timeoutInMs && Date.now() - startTimeInMs > timeoutInMs)
          return;
        loopSearch();
      }, checkFrequencyInMs);
    }
  })();
}

function addItemToSessionStorage(customerId, variantId) {
  let storageIds = sessionStorage.getItem(`${customerId}-items`);

  storageIds = storageIds.split(",");
  if (storageIds.includes(variantId)) return;

  storageIds.push(variantId);
  storageIds.join(",");
  sessionStorage.setItem(`${customerId}-items`, storageIds);
}

function removeItemFromSessionStorage(customerId, variantId) {
  let storageIds = sessionStorage.getItem(`${customerId}-items`);

  storageIds = storageIds.split(",");
  var index = storageIds.indexOf(variantId);
  if (index !== -1) {
    storageIds.splice(index, 1);
  }

  storageIds.join(",");
  sessionStorage.setItem(`${customerId}-items`, storageIds);
}

function overridesItemsSessionsStorage(customerId, storageItems) {
  storageItems = storageItems.join(",");
  sessionStorage.setItem(`${customerId}-items`, storageItems);
}

function getItemsFromSessionStorage(customerId) {
  let storageItems = sessionStorage.getItem(`${customerId}-items`);

  if (!storageItems) return [];

  return storageItems.split(",");
}


function isVariantInStorage(customerId, variantId) {
  let storageIds = sessionStorage.getItem(`${customerId}-items`);
  if (!storageIds || storageIds == "") {
    return false;
  }

  storageIds = storageIds.split(",");
  if (storageIds.includes(variantId)) return true;
}


class RegistryClient {

  constructor(customer, signature, timestamp, shop, host) {
    this.customer = customer
    this.config = {
      url: host,
      timestamp,
      signature,
      shop
    }
  }

  request(method, endpoint, body) {
    const { url, timestamp, signature, shop } = this.config
    var callUrl = new URL(url + endpoint);
    callUrl.searchParams.append('shop', shop);
    callUrl.searchParams.append('timestamp', timestamp);
    callUrl.searchParams.append('signature', signature);

    return fetch(callUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
  }

  getCustomerRegistries() {
    return this.request("GET", `/customers/${this.customer.id}/registries`); // will be used in future;
  }

  getCustomerRegistry(registryId, callback) {
    return this.request("GET", `/customers/${this.customer.id}/registries/${registryId}`);
  }

  deleteItemFromRegistry(itemId, body, callback) {
    return this.request("DELETE", `/customers/${this.customer.id}/registry_items/${itemId}`, body);
  }

  cancelRegistry(registryId) {
    return this.request("POST", `/customers/${this.customer.id}/registries/${registryId}/cancel`);
  }

  createRegistry(body) {
    return this.request("POST", `/customers/${this.customer.id}/registries`, body);
  }

  updateRegistry(registryId, body) {
    return this.request("PATCH", `/customers/${this.customer.id}/registries/${registryId}`, body);
  }

  addGiftRegistryItem(body) {
    return this.request("POST", `/customers/${this.customer.id}/registry_items`, body);
  }

  updateGiftRegistryItem(itemId, body) {
    return this.request("PATCH", `/customers/${this.customer.id}/registry_items/${itemId}`, body);
  }

  getGiftTracker(registryId) {
    return this.request("GET", `/customers/${this.customer.id}/registries/${registryId}/gift_tracker`);
  }

  shareRegistry(registryId, body) {
    return this.request("POST", `/customers/${this.customer.id}/registries/${registryId}/share`, body);
  }
}

class RegistryPublicClient {

  constructor(host) {
    this.config = {
      url: host
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

  searchWithName(registrantName) {
    return this.request("GET", `/registries/search?registrant_name=${encodeURIComponent(registrantName)}`);
  }

  getPublicRegistry(registryId, password) {
    password = encodeURI(password);
    return this.request("GET", `/registries/${registryId}?password=${encodeURIComponent(password)}`);
  }
}

class Helper {

  appendCopiedMessage(container) {
    let elm = $('<div>Copied !</div>');
    container.append(elm);
    setTimeout(() => {
       elm.remove();
    }, 3000);
  }

  calculateDaysToGo(date) {
    let dateRegistry = new Date(date);
    let dateNow = new Date();
    let diff = dateRegistry.getTime() - dateNow.getTime();
    let diffDays = diff / (1000 * 3600 * 24);

    return parseInt(diffDays);
  }
}

class RegistryPopup {

  constructor() {
    this.selectors = {
      popup: '.gift-registry-modal',
      addToCart: "[data-popup-add-to-cart]",
      variantId: "data-variant-id",
      quantity: "[data-variant-qty]",
      quantityWrapper: ".popup-qty-wrapper",
      message: "with-message",
      customMsg: "#custom-message",
      giftGiverName: "#giftGiverName",
      giftGiverLastName: "#giftGiverLastName",
      giftAmount: "#giftAmount"
    }

    let $container = $(this.selectors.popup);
    if (!($container.length > 0)) return;

    this.initClosePopup($container);
    this.initAddToCartPopup();
    this.initValidateContribution();
    this.initCustomeMsg();
    this.initQtySelector();
  }

  initQtySelector() {
    var self = this;
    $(document).on('click', this.selectors.quantityWrapper + ' [data-quantity-pop]', function () {
      var adj = $(this).data('quantity-pop') == 'up' ? 1 : -1;
      var $qty = $(this).closest('.quantity-wrapper').find('[name=quantity]');
      $qty.val(Math.max(1, parseInt($qty.val()) + adj));
      let max = $(self.selectors.popup).attr('data-variant-qty-max');
      max = parseInt(max);
      if ($qty.val() > max) {
        $qty.val(max);
      }
      return false;
    });
  }

  initValidateContribution() {
    $(document).on('input', ".fractional #giftAmount", function() {
      let val = parseFloat($(this).val());
      let min = 0.0;
      let max = parseFloat($(this).attr('max'));
      if (val > max) {
        $(this).val(max);
      }
      if (val < min) {
        $(this).val(0);
      }
    });
  }

  initCustomeMsg() {
    $(this.selectors.customMsg).on("click", function() {
      $(this).css("border-color", "#868686");
    })
  }

  initClosePopup($container) {
    $(this.selectors.popup + " .cc-popup-close").on("click", function() {
      $container.removeClass("cc-popup--visible");
      $("body").removeClass("cc-popup-no-scroll")
    })
  }

  closePopup() {
    $(this.selectors.popup).removeClass("cc-popup--visible");
    $("body").removeClass("cc-popup-no-scroll");
  }

  /** add to cart in gift givers view */
  initAddToCartPopup() {
    let self = this;
    $(this.selectors.addToCart).on("click", function(e) {
      e.preventDefault();
      let $button = $(this);
      $("#qty-exceeded-msg").addClass("hide");
      if ($button.hasClass("locked")) return; //if button is locked prevent double clicks

      $button.addClass("locked"); // lock until ajax call finished
      let variantId = $(self.selectors.popup).attr(self.selectors.variantId);
      let quantity = $(self.selectors.quantity).val();
      let maxQty = $(self.selectors.popup).attr('data-variant-qty-max');
      if (!variantId) {
        return;
      }

      /** validate giver name */
      $(self.selectors.giftGiverName).css("border-color", "rgb(134, 134, 134)");
      let giverName = $(self.selectors.giftGiverName).val();
      if (giverName == "") {
        $(self.selectors.giftGiverName).css("border-color", "red");
      }
      $(self.selectors.giftGiverLastName).css("border-color", "rgb(134, 134, 134)");
      let giverNameLast = $(self.selectors.giftGiverLastName).val();
      if (giverNameLast == "") {
        $(self.selectors.giftGiverLastName).css("border-color", "red");
      }
      if (giverNameLast == "" || giverName == "") {
        $button.removeClass("locked");
        return;
      }

      /** validate giver message */
      let message = "";
      if ($(this).data(self.selectors.message)) {
        message = $(self.selectors.customMsg).val();
        if (message == "") {
          $(self.selectors.customMsg).css("border-color", "red");
          $button.removeClass("locked");
          return;
        }
      }

      // additionally we must check that when customer add GR product to cart it's not over the limit of items in Registry
      if('CartJS' in window) {
        CartJS.getCart({
          "success": function(data, textStatus, jqXHR) {
            let cartItems = CartJS.cart.items;
            let itemsCount = cartItems.length;
            for (let i = 0; i < itemsCount; i++) {
              let item = cartItems[i];
              if (item.variant_id == variantId) {
                if (item.quantity >= maxQty) {
                  $("#qty-exceeded-msg").removeClass("hide");
                  $button.removeClass("locked");
                  return;
                }
              }
            }
            self.addToCart(variantId, message, quantity, $button);
          },
        });
      } else {
        self.addToCart(variantId, message, quantity, $button);
      }
    })

  }

  addToCart(variantId, message, quantity = 1, $button) {
    let selectors = {
      giftGiverName: "#giftGiverName",
      giftGiverLastName: "#giftGiverLastName",
      giftFraction: "#giftAmount",
      giftQuantiry: "[data-variant-qty]",
      publicRegistry: "#publicRegistryId",
      publicRegistryStatus: "#publicRegistyStatus",
      publicRegistryRegistrantName: "#publicRegistryRegistrantName",
      publicRegistryRegistrantEmail: "#publicRegistryRegistrantEmail",
      publicRegistryDate: "#publicRegistryDate"
    }
    const self = this;

    let registryId = $(selectors.publicRegistry).val();
    let registryRegistranName =  $(selectors.publicRegistryRegistrantName).val();
    let registryRegistranEmail =  $(selectors.publicRegistryRegistrantEmail).val();
    let registryDate =  $(selectors.publicRegistryDate).val();
    let giverName = $(selectors.giftGiverName).val();
    let giverLastName = $(selectors.giftGiverLastName).val();
    let status = "late_period";
    let giverMsg = message;
    let giver = `${giverName} ${giverLastName}`;
    const ajaxCart = document.querySelector('ajax-cart');

    const urlParams = new URLSearchParams(window.location.search);
    var password = urlParams.get('p');

    let formData = {
      'items': [{
        'id': variantId,
        'quantity': quantity,
        'properties': {
          '_registry': true,
          '_registry_status': status
        }
      }],
      "sections": ajaxCart.getSectionsToRender().map((section) => section.id),
      "sections_url": window.location.pathname,
      "attributes": {
        "_giver_message": giverMsg,
        "_giver_name": giver,
        "_registry_uuid": registryId,
        "_registry_password": password,
        "_registry_status": status,
        "_registrant_name": registryRegistranName,
        "_registrant_email": registryRegistranEmail,
        "_registry_date": registryDate,
        "_giver_name_first": giverName,
        "_giver_name_last": giverLastName
      }
    };

    let fraction = $(selectors.giftFraction).val();
    if (fraction && fraction != "") {
      formData.items[0]['properties']['_fractional_purchase_amount'] = fraction;
    }

    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => {
      if (typeof BoostOTP !== 'undefined') {
        BoostOTP?.AjaxCart?.prototype.getCart();
      }
      self.closePopup();
      self.openCart();
      $(selectors.giftFraction).val(null);
      $(selectors.giftQuantiry).val(1);
      $button.removeClass("locked");
      CartJS.getCart();
      return response.json();
    })
    .then(res => {
      ajaxCart.renderContents(res);
    })
    .catch((error) => {
      console.error('Error:', error);
      $button.removeClass("locked");
      $(selectors.giftFraction).val(null);
      CartJS.getCart()
    });
  }

  openCart() {
    if (typeof BoostOTP !== 'undefined') {
      BoostOTP?.AjaxCart?.prototype.getCart(true);
    }

    $.ajax({
      url:	"/cart.js",
      type:	'GET',
      dataType: 'json'
    })
    .done(function(data) {
      var style = document.createElement('style');
      let stylesCss = ``;
      for (let item of data.items ) {
        if (item.properties['_registry']) {
          stylesCss += `
            .boost-pfs-minicart-item.boost-pfs-minicart-item-${item.id} .boost-pfs-minicart-item-quantity-wrapper{
              display: none;
            }
            .boost-pfs-minicart-item.boost-pfs-minicart-item-${item.id} .boost-pfs-minicart-item-line {
              display: none;
           }
          `;
        }
        if (item.properties['_fractional_purchase_amount']) {
          let interv = setInterval($(`.boost-pfs-minicart-item.boost-pfs-minicart-item-${item.id} .boost-pfs-minicart-item-price .money`).html(`$${item.properties['_fractional_purchase_amount']}`), 100);
          setTimeout(clearInterval(interv), 3000);
        }
      }
      style.innerHTML = stylesCss;
      document.head.appendChild(style);
    });

  }
}