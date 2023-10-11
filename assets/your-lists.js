class YourLists extends Lists {
  constructor() {
    super();

    this.listsDetailPlaceholder = this.querySelector('[data-lists-detail-placeholder]');

    this.composeListDetail = this.composeListDetail.bind(this);
    this.composeListProductCards = this.composeListProductCards.bind(this);
    this.renderListsDetail = this.renderListsDetail.bind(this);
    this.openListsDetail = this.openListsDetail.bind(this);
    this.initListeners = this.initListeners.bind(this);
    this.closeListBoxes = this.closeListBoxes.bind(this);
    this.openListBoxes = this.openListBoxes.bind(this);
    this.pdCartModal = document.querySelector('.pd-cart-notification .modal__toggle');

    this.updateLists();

    if (sessionStorage.getItem('openCart')) {
      this.pdCartModal.click();
      sessionStorage.removeItem('openCart');
    }
  }

  composeListProductCards(list) {
    const products = list.listcontents;
    let html = '';

    if (products && products.length) {
      const dataErrorMessage = this.dataset.addAllErrorMessage || '';
      const dataListProductsNote = this.dataset.listProductsNote || '';
      const errorMessage = `<div class="error-message hidden">
        <svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-error" viewBox="0 0 13 13">
          <circle cx="6.5" cy="6.50049" r="5.5" stroke="white" stroke-width="2"></circle>
          <circle cx="6.5" cy="6.5" r="5.5" fill="#EB001B" stroke="#EB001B" stroke-width="0.7"></circle>
          <path d="M5.87413 3.52832L5.97439 7.57216H7.02713L7.12739 3.52832H5.87413ZM6.50076 9.66091C6.88091 9.66091 7.18169 9.37267 7.18169 9.00504C7.18169 8.63742 6.88091 8.34917 6.50076 8.34917C6.12061 8.34917 5.81982 8.63742 5.81982 9.00504C5.81982 9.37267 6.12061 9.66091 6.50076 9.66091Z" fill="white"></path><path d="M5.87413 3.17832H5.51535L5.52424 3.537L5.6245 7.58083L5.63296 7.92216H5.97439H7.02713H7.36856L7.37702 7.58083L7.47728 3.537L7.48617 3.17832H7.12739H5.87413ZM6.50076 10.0109C7.06121 10.0109 7.5317 9.57872 7.5317 9.00504C7.5317 8.43137 7.06121 7.99918 6.50076 7.99918C5.94031 7.99918 5.46982 8.43137 5.46982 9.00504C5.46982 9.57872 5.94031 10.0109 6.50076 10.0109Z" fill="white" stroke="#EB001B" stroke-width="0.7"></path>
        </svg>
        <div>${ dataErrorMessage }</div>
      </div>`;
      html += `<div
        data-list-products-wrapper
        data-list-id="${ list.lid }"
        data-list-name="${ list.lname }"
        data-list-item-count="${ list.cnt }"
        class="list-products-wrapper">
      `;
      html += `<div class="list-products-header">
        <span class="list-products-note">${dataListProductsNote}</span>
        <button data-add-all-products data-list-id="${ list.lid }" class="list-products-button pd-button pd-button--lively-blue pd-button--outline">Add all to cart</button>
        ${ errorMessage }
      </div>`;
      html += '<div data-list-products class="list-products">';
      products.forEach(product => {
        html += `<div class="list-product-card">
          <div class="list-product-card-inner">
            <div class="list-product-card__image">
              <img src="${ product.iu }" alt="${ product.dt }" />
            </div>
            <p class="list-product-card__vendor">${ product.bt || '' }</p>
            <a class="list-product-card__title" href="${ product.du }">${ product.dt }</a>
            <p class="list-product-card__price">$${ product.pr.toFixed(2) }</p>
            <product-form class="product-form">
              <div class="product-form__error-message-wrapper" role="alert" hidden="">
                <svg aria-hidden="true" focusable="false" role="presentation" class="icon icon-error" viewBox="0 0 13 13">
                  <circle cx="6.5" cy="6.50049" r="5.5" stroke="white" stroke-width="2"></circle>
                  <circle cx="6.5" cy="6.5" r="5.5" fill="#EB001B" stroke="#EB001B" stroke-width="0.7"></circle>
                  <path d="M5.87413 3.52832L5.97439 7.57216H7.02713L7.12739 3.52832H5.87413ZM6.50076 9.66091C6.88091 9.66091 7.18169 9.37267 7.18169 9.00504C7.18169 8.63742 6.88091 8.34917 6.50076 8.34917C6.12061 8.34917 5.81982 8.63742 5.81982 9.00504C5.81982 9.37267 6.12061 9.66091 6.50076 9.66091Z" fill="white"></path><path d="M5.87413 3.17832H5.51535L5.52424 3.537L5.6245 7.58083L5.63296 7.92216H5.97439H7.02713H7.36856L7.37702 7.58083L7.47728 3.537L7.48617 3.17832H7.12739H5.87413ZM6.50076 10.0109C7.06121 10.0109 7.5317 9.57872 7.5317 9.00504C7.5317 8.43137 7.06121 7.99918 6.50076 7.99918C5.94031 7.99918 5.46982 8.43137 5.46982 9.00504C5.46982 9.57872 5.94031 10.0109 6.50076 10.0109Z" fill="white" stroke="#EB001B" stroke-width="0.7"></path>
                </svg>
                <span class="product-form__error-message"></span>
              </div>
              <form
                method="post"
                action="/cart/add"
                id="product-form_${ list.lid }_${ product.id }"
                accept-charset="UTF-8"
                enctype="multipart/form-data"
                enctype="multipart/form-data"
                data-type="add-to-cart-form"
              >
                <input type="hidden" name="form_type" value="product">
                <input type="hidden" name="utf8" value="✓">
                <input type="hidden" name="id" value="${ product.epi }">
                <input type="hidden" class="select-on-focus" name="quantity" value="1">
                <button id="cart-button" class="pd-button pd-button--lively-blue pd-button--full-width" type="submit" name="add">Add To Cart</button>
                <div class="loading-overlay__spinner hidden">
                  <svg aria-hidden="true" focusable="false" role="presentation" class="spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="path" fill="none" stroke-width="6" cx="33" cy="33" r="30"></circle></svg><input type="hidden" name="discount" value=" ">
                </div>
              </form>
            </product-form>
            <button
              data-remove-product-from-list
              data-lid="${ list.lid }"
              data-epi="${ product.epi }"
              data-empi="${ product.empi }"
              data-du="${ product.du }"
              class="list-product-card__button-remove"
            ></button>
          </div>
        </div>`
      })
      html += '</div>';
      html += `<div class="list-products-footer">
        <button
          data-add-all-products data-list-id="${ list.lid }" class="list-products-button list-products-button--bottom pd-button pd-button--lively-blue pd-button--outline">Add all to cart</button>
      </div>`;
      html += '</div>';
    }

    return html;
  }

  composeListDetail(lists) {
    if (!lists || !lists.length) return '';
    let listDropdownHtml = '';
    let productCards = '';

    lists?.forEach(list => {
      listDropdownHtml += `<li>
        <a
          ${ list.cnt ? 'data-view-list' : 'disabled'}
          data-list-id="${ list.lid }"
        >${ list.lname } (<span data-count data-list-id="${ list.lid }">${ list.cnt }</span>)</a>
      </li>`;

      productCards += this.composeListProductCards(list);
    })

    const html = `<div class="lists-detail">
      <div class="lists-detail-header">
        <div class="lists-detail-dropdown">
          <span data-dropdown-current-list class="lists-detail-dropdown__current">${ lists[0].lname } <span>(${ lists[0].cnt })</span></span>
          <ul data-lists-detail-dropdown class="hidden">
            ${ listDropdownHtml }
          </ul>
        </div>
      </div>
      ${ productCards }
    </div>`;

    return html;
  }

  composeListBoxContent(list) {
    const items = list.listcontents;
    let html = '';

    if (items && items.length) {
      const max = items.length > 3 ? 3 : items.length;
      html += `<div data-view-list data-list-id="${ list.lid }" class="list-box__items">`;

      for (let i = 0; i < max; i++) {
        const item = items[i];
        html += `<div class="list-box-item">
          <img src="${ item.iu }" alt="${ item.dt }" title="${ item.dt }" />
        </div>`
      }

      html += '</div>';
      html += `<a data-view-list data-list-id="${ list.lid }" class="pd-link list-box__button">View List</a>`;
    } else {
      const relevantUrl = this.predefinedLists[list.lname];
      html += '<p class="list-box__item-count">0 products</p>';
      html += '<div class="list-box__empty">This list is empty. Head to Lists to get started!</div>';
      if (relevantUrl) {
        html += `<a href="${ relevantUrl }" data-list-id="${ list.lid }" class="pd-link list-box__button">Browse ${ list.lname }</a>`;
      } else {
        html += `<a href="/" data-list-id="${ list.lid }" class="pd-link list-box__button">Shop now</a>`;
      }
    }

    return html;
  }

  renderLists(lists) {
    let html = '';

    lists?.forEach(list => {
      const amount = list.cnt && list.cnt > 1 ? list.cnt + ' products' : list.cnt + ' product';
      html += `<div class="list-box">
          <div class="list-box__inner">
            <h3 class="pd-heading-4 list-box__title">${ list.lname }</h3>
            ${list.cnt ? `<p class="list-box__item-count">${ amount }</p>`: ''}
            ${ this.composeListBoxContent.bind(this)(list) }
          </div>
        </div>`
    });

    this.listsPlaceholder.innerHTML = html;
    this.renderListsDetail(lists);
    this.disableLoading(this);
    this.initListeners();
    // this.checkList();
  }

  renderListsDetail(lists) {
    const html = this.composeListDetail(lists);
    this.listsDetailPlaceholder.innerHTML = html;
  }

  closeListBoxes() {
    this.listsPlaceholder.classList.add('hidden');
  }

  openListBoxes() {
    this.listsPlaceholder.classList.remove('hidden');
  }

  openListsDetail(lid) {
    this.listsDetailPlaceholder.classList.add('active');
    this.scrollIntoView(true);

    const targetListDetail = this.querySelector(`[data-list-products-wrapper][data-list-id="${ lid }"]`);
    const data = targetListDetail?.dataset;

    this.querySelectorAll('[data-list-products-wrapper]').forEach(listBlock => {
      listBlock.classList.remove('active');
    })
    targetListDetail.classList.add('active');
    this.querySelector('[data-dropdown-current-list]').innerHTML = `${ data.listName } <span>(<span data-list-id="${ lid }" data-count>${ data.listItemCount }</span>)<span>`;
    this.closeListBoxes();
  }

  initListeners() {
    this.querySelectorAll('[data-view-list]')?.forEach(button => {
      button.addEventListener('click', () => {
        this.openListsDetail(button.dataset.listId);
        this.querySelector('[data-lists-detail-dropdown]').classList.add('hidden');
      })
    })

    this.querySelector('[data-dropdown-current-list]')?.addEventListener('click', () => {
      this.querySelector('[data-lists-detail-dropdown]').classList.toggle('hidden');
    })

    this.querySelectorAll('[data-remove-product-from-list]')?.forEach(button => {
      button.addEventListener('click', () => {
        const self = this;
        const data = button.dataset;
        const listId = data.lid;
        const listItemMap = {
          epi: data.epi,
          empi: data.empi,
          du: data.du
        };

        function swymCallbackFn(swat) {
          swat.deleteFromList(listId, listItemMap, function(deletedListItem){
            // successfully deleted list item
            const listIndex = self.currentLists.findIndex(list => list.lid.toString() === listId.toString());
            const productIdx = self.currentLists[listIndex].listcontents.findIndex(item => item.epi.toString() === listItemMap.epi.toString());
            self.currentLists[listIndex].listcontents.splice(productIdx, 1);
            button.closest('.list-product-card').remove();
            const itemCountElms = self.querySelectorAll(`[data-count][data-list-id="${ listId }"]`);
            itemCountElms?.forEach(itemCountElm => {
              itemCountElm.innerHTML = Number(itemCountElm.innerText) - 1;
            })
          }, function(xhrObj) {
            // something went wrong
          });
        }
        if(!window.SwymCallbacks) {
          window.SwymCallbacks = [];
        }
        window.SwymCallbacks.push(swymCallbackFn);
      })
    })

    this.querySelectorAll('[data-add-all-products]')?.forEach(button => {
      button.addEventListener('click', () => this.addAllProducts.bind(this)(button));
    })
  }

  addAllProducts(button) {
    const listId = button.dataset.listId;
    const currentList = this.currentLists.find(list => list.lid === listId);
    if (!currentList || !currentList.listcontents || !currentList.listcontents.length) return;

    const items = currentList.listcontents.map(item => ({
      id: item.epi,
      quantity: 1
    }));

    const body = JSON.stringify({ items });

    fetch(`${routes.cart_add_url}`, {...fetchConfig(), ...{ body }})
      .then(response => {
        if (response.status === 200) {
          sessionStorage.setItem('openCart', 'yes');
          return location.reload();
        }

        if (response.status === 422) {
          const header = button.closest('[data-list-products-wrapper]').querySelector('.list-products-header');
          header.querySelector('.error-message')?.classList.remove('hidden');
          header.scrollIntoView(true);
        }
      })
  }
}

customElements.define('your-lists', YourLists);