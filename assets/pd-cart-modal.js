class PdCartModal extends HTMLElement {
  constructor() {
    super();
    this.detailsContainer = this.querySelector('details');
    this.summaryToggle = this.querySelector('summary');

    this.detailsContainer.addEventListener(
      'keyup',
      (event) => event.code.toUpperCase() === 'ESCAPE' && this.close()
    );
    this.summaryToggle.addEventListener(
      'click',
      this.onSummaryClick.bind(this)
    );
    this.querySelectorAll('button[type="button"]').forEach(ele => ele.addEventListener(
      'click',
      this.close.bind(this)
    ));
    this.open.bind(this)
    this.close.bind(this)

    this.summaryToggle.setAttribute('role', 'button');
  }

  isOpen() {
    return this.detailsContainer.hasAttribute('open');
  }

  onSummaryClick(event) {
    event.preventDefault();
    this.detailsContainer.hasAttribute('open')
      ? this.close()
      : this.open(event);
  }

  onBodyClick(event) {
    if (!this.contains(event.target) || event.target.classList.contains('modal-overlay')) this.close(false);
  }

  open(event) {
    this.onBodyClickEvent =
      this.onBodyClickEvent || this.onBodyClick.bind(this);
    this.detailsContainer.setAttribute('open', true);
    document.body.addEventListener('click', this.onBodyClickEvent);
    document.querySelector('html').classList.add('overflow-hidden');

    $.get(`/cart?view=items-modal`).then((resp) => {
      this.detailsContainer.querySelector('.pd-cart__content').innerHTML = resp;
    });
    $.get(`/cart?view=api-gwp`).then((resp) => {
      try {
        const gwpObj = JSON.parse(resp);
        if (gwpObj.shouldAddGiftToCart) {
          jQuery.post('/cart/add.js', {
            quantity: 1,
            id: gwpObj.giftVariantId
          }, (e) => {
            console.log('automatically add gift ', 'ok');
          })
        }
      } catch (error) {
        console.log('automatically add gift ', error);
      }
    });
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null);
    this.detailsContainer.removeAttribute('open');
    document.body.removeEventListener('click', this.onBodyClickEvent);
    document.querySelector('html').classList.remove('overflow-hidden');
  }
}

customElements.define('pd-cart-modal', PdCartModal);
