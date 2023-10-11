class GiftRegistryMessageDrawer extends HTMLElement {
  constructor() {
    super();
    this.variantId = '';
    this.ELM_quantityInput = this.querySelector('[data-variant-qty]');
    this.quantity = 1;

    document.addEventListener('GiftRegistryMessageDrawer::Open', e => {
      this.open();
      const ELM_button = e.detail.buttonElm.target;
      this.updateData(ELM_button);
    });
    this.querySelector('[data-close-button]').addEventListener('click', this.close.bind(this));
    this.querySelector('[data-popup-add-to-cart]').addEventListener('click', this.addToCart.bind(this));
    this.querySelector('[data-quantity-pop="down"]').addEventListener('click', this.decreaseQuantity.bind(this));
    this.querySelector('[data-quantity-pop="up"]').addEventListener('click', this.increaseQuantity.bind(this));
  }

  increaseQuantity(e) {
    e.preventDefault();
    this.quantity += 1;
    this.ELM_quantityInput.value = this.quantity;
  }

  decreaseQuantity(e) {
    e.preventDefault();
    this.quantity -= 1;
    this.ELM_quantityInput.value = this.quantity;
  }

  updateData(buttonElm) {
    const ELM_registryItem = buttonElm.closest('.gift-giver-item');
    if (this.variantId !== ELM_registryItem.dataset.variantId) {
      this.variantId = ELM_registryItem.dataset.variantId;
      this.ELM_quantityInput.value = 1;
      this.quantity = 1;
    }
  }

  addToCart(e) {
    const self = this;
    const ELM_addToCartBtn = e.target;
    const ELM_errorMessage = this.querySelector('[data-registry-item-error-message]');
    const ELM_cartNotification = document.querySelector('.pd-cart-notification');
    const itemQuantity = this.quantity;
    const registryStatus = 'late_period';
    const giftGiverFirstName = this.querySelector('[name="giftGiverName"]').value || '';
    const giftGiverLastName = this.querySelector('[name="giftGiverLastName"]').value || '';
    const giftGiverName = giftGiverFirstName + ' ' + giftGiverLastName;
    const giverMessage = this.querySelector('[name="customMessge"]').value || '';
    const registryId = document.querySelector('[name="public_registry_id"]').value || '';
    const registrantName = document.querySelector('[name="public_registry_name"]').value || '';
    const registrantEmail = document.querySelector('[name="public_registry_email"]').value || '';
    const registryDate = document.querySelector('[name="public_registry_date"]').value || '';
    const urlParams = new URLSearchParams(window.location.search);
    const registryPassword = urlParams.get('p');

    const fetchData = {
      'items': [{
        'id': this.variantId,
        'quantity': itemQuantity,
        'properties': {
          '_registry': true,
          '_registry_status': registryStatus
        }
      }],
      "attributes": {
        "_giver_message": giverMessage,
        "_giver_name": giftGiverName,
        "_registry_uuid": registryId,
        "_registry_password": registryPassword,
        "_registry_status": registryStatus,
        "_registrant_name": registrantName,
        "_registrant_email": registrantEmail,
        "_registry_date": registryDate,
        "_giver_name_first": giftGiverFirstName,
        "_giver_name_last": giftGiverLastName
      }
    };

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
      self.close();
    });
  }

  onBodyClick(event) {
    if (this.contains(event.target) && !this.querySelector('.gift-registry-msg-drawer__dialog').contains(event.target)) this.close();
  }

  open() {
    this.classList.add('displayed');
    this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);
    document.body.addEventListener('click', this.onBodyClickEvent);
  }

  close() {
    this.classList.remove('displayed');
    document.body.removeEventListener('click', this.onBodyClickEvent);
  }
}

customElements.define('gift-registry-msg-drawer', GiftRegistryMessageDrawer);
