if (!customElements.get('pickup-availability')) {
  customElements.define('pickup-availability', class PickupAvailability extends HTMLElement {
    constructor() {
      super();

      if(!this.hasAttribute('available')) return;

      this.errorHtml = this.querySelector('template').content.firstElementChild.cloneNode(true);
      this.fetchAvailability(parseInt(this.dataset.variantId));
      this.onClickRefreshList = this.onClickRefreshList.bind(this);
    }

    fetchAvailability(variantId) {
      let rootUrl = this.dataset.rootUrl;
      if (!rootUrl.endsWith("/")) {
        rootUrl = rootUrl + "/";
      }
      const variantSectionUrl = `${rootUrl}variants/${variantId}/?section_id=pickup-availability`;

      fetch(variantSectionUrl)
        .then(response => response.text())
        .then(text => {
          const sectionInnerHTML = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('.shopify-section');
          this.renderPreview(sectionInnerHTML);
        })
        .catch(e => {
          const button = this.querySelector('button');
          if (button) button.removeEventListener('click', this.onClickRefreshList);
          this.renderError();
        });
    }

    onClickRefreshList(evt) {
      this.fetchAvailability(this.dataset.variantId);
    }

    renderError() {
      this.innerHTML = '';
      this.appendChild(this.errorHtml);

      this.querySelector('button').addEventListener('click', this.onClickRefreshList);
    }

    renderPreview(sectionInnerHTML) {
      const drawer = document.querySelector('pickup-availability-drawer');
      if (drawer) drawer.remove();
      if (!sectionInnerHTML.querySelector('pickup-availability-preview')) return;

      this.innerHTML = sectionInnerHTML.querySelector('pickup-availability-preview').outerHTML;
      this.setAttribute('available', '');

      this.shippingDesc = sectionInnerHTML.querySelector('#shipping-description');
      if (this.shippingDesc) {
        this.shippingDesc.innerHTML = this.dataset.shippingDescHtml || '';
      }

      this.clickCollectMsg = sectionInnerHTML.querySelector('#click-collect-msg');
      if(this.clickCollectMsg) {
        this.clickCollectMsg.innerHTML = this.dataset.clickCollectMsg || '';
      }

      this.clickCollectTime = sectionInnerHTML.querySelector('#click-collection-time');
      if(this.clickCollectTime) {
        this.clickCollectTime.innerHTML = this.buildClickCollectTime(this.dataset.clickCollectTime);
      }

      document.body.appendChild(sectionInnerHTML.querySelector('pickup-availability-drawer'));

      const button = this.querySelector('button');
      if (button) button.addEventListener('click', (evt) => {
        document.querySelector('pickup-availability-drawer').show(evt.target);
      });
    }

    buildClickCollectTime(stringHtml) {
      if(!stringHtml) return '';
      let html = "";
      const arr = stringHtml.split(',');
      if(!arr) return '';
      arr.map(elm => {
        const item = elm.split('--');
        html += `<li><span>${item[0]}</span><span>${item[1]}</span></li>`
      });
      return html;
    }
  });
}

if (!customElements.get('pickup-availability-drawer')) {
  customElements.define('pickup-availability-drawer', class PickupAvailabilityDrawer extends HTMLElement {
    constructor() {
      super();

      this.onBodyClick = this.handleBodyClick.bind(this);

      this.querySelector('button').addEventListener('click', () => {
        this.hide();
      });

      this.querySelector('[data-close-drawer]').addEventListener('click', () => {
        this.hide();
      });

      this.addEventListener('keyup', (event) => {
        if(event.code.toUpperCase() === 'ESCAPE') this.hide();
      });
    }

    handleBodyClick(evt) {
      const target = evt.target;
      if (target != this && !target.closest('pickup-availability-drawer') && target.id != 'ShowPickupAvailabilityDrawer') {
        this.hide();
      }
    }

    hide() {
      this.removeAttribute('open');
      this.classList.remove('active');
      document.body.removeEventListener('click', this.onBodyClick);
      document.body.classList.remove('overflow-hidden');
      removeTrapFocus(this.focusElement);
    }

    show(focusElement) {
      this.focusElement = focusElement;
      this.setAttribute('open', '');
      this.classList.add('active');
      document.body.addEventListener('click', this.onBodyClick);
      document.body.classList.add('overflow-hidden');
      trapFocus(this);
    }
  });
}
