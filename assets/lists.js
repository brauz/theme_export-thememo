class Lists extends HTMLElement {
  constructor() {
    super();

    this.predefinedLists = this.handlePredefinedLists.bind(this)() || {};
    this.defaultLists = Object.keys(this.predefinedLists);
    this.currentLists = [];
    this.currentProduct = null;
    this.checkedLists = [];

    this.dialog = this.querySelector('[data-modal-dialog]');
    this.listsPlaceholder = this.querySelector('[data-lists-placeholder]');
    this.productPlaceholder = this.querySelector('[data-product-placeholder]');
    this.addToListsBtn = this.querySelector('[data-add-to-list-button]');
    this.createListFormToggleBtns = this.querySelectorAll('[data-toggle-create-list-form]');
    this.createListForm = this.querySelector('.create-list-form');
    this.footer = this.querySelector('.lists-modal__footer');
    this.createListBtn = this.querySelector('[data-create-list]');
    this.closeModalBtn = this.querySelector('[data-close-modal-button]');
    this.modalBtns = this.querySelector('.pd-modal__buttons');

    this.createLists = this.createLists.bind(this);
    this.removeAllLists = this.removeAllLists.bind(this);
    this.renderLists = this.renderLists.bind(this);
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this.checkList = this.checkList.bind(this);
    this.updateLists = this.updateLists.bind(this);
    this.uncheckAllCheckboxes = this.uncheckAllCheckboxes.bind(this);
    this.enableLoading = this.enableLoading.bind(this);
    this.disableLoading = this.disableLoading.bind(this);
    this.updateIconsStatus = this.updateIconsStatus.bind(this);

    document.querySelectorAll('[data-add-to-lists-button]')?.forEach(button => {
      button.addEventListener('click', () => this.open(button));
    })

    document.addEventListener('trigger::addToLists', e => {
      const button = e.detail?.button;
      if (!button) return;
      this.open(button);
    })

    document.addEventListener('click', (e) => {
      if (this.dialog && this.contains(e.target) && !this.dialog.contains(e.target)) {
        this.close();
      }
    })

    this.closeModalBtn?.addEventListener('click', this.close);

    this.createListFormToggleBtns?.forEach(button => {
      button.addEventListener('click', this.toggleCreateListForm.bind(this));
    })

    this.createListBtn?.addEventListener('click', this.createList.bind(this));

    this.addToListsBtn?.addEventListener('click', () => {
      const self = this;
      const listItemMap = self.currentProduct;
      const listIds = self.checkedLists;

      function swymCallbackFn(swat) {
        self.enableLoading(self);
        swat.addProductToLists(listItemMap, listIds, function(resp){
          self.checkedLists = [];
          self.uncheckAllCheckboxes();
          self.updateLists();
          self.close();
          document.dispatchEvent(new CustomEvent('lists::productAdded', {
            detail: {
              ...resp,
              numberOfLists: listIds.length,
              listsPageUrl: self.dataset.listsPageUrl
            }
          }))
        }, function(xhrObject) {
          // something went wrong
        });
      }
      if(!window.SwymCallbacks) {
        window.SwymCallbacks = [];
      }
      window.SwymCallbacks.push(swymCallbackFn);
    })
  }

  handlePredefinedLists() {
    let data = this.dataset.predefinedLists?.split('|');
    if (!data) return {};

    const result = {};
    data.forEach(item => {
      if (item) {
        const splittedItem = item.split(':');
        result[splittedItem[0]] = splittedItem[1] || '';
      }
    })

    return result;
  }

  toggleCreateListForm() {
    this.createListForm?.classList.toggle('hidden');
    this.footer?.classList.toggle('hidden');
    this.createListForm?.querySelector('input[name="newList"]').focus();

    this.modalBtns?.classList.toggle('hidden');
  }

  createList() {
    const listName = this.createListForm.querySelector('input[name="newList"]').value;
    if (!listName) return;
    const self = this;
    const newListDef = {
      lname: listName
    };

    function swymCallbackFn(swat) {
      self.enableLoading(self);
      swat.createList(newListDef, function(newListObj){
        self.updateLists();
        self.toggleCreateListForm.bind(self)();
      }, function(xhrObject) {
        // something went wrong
      });
    }
    if(!window.SwymCallbacks) {
      window.SwymCallbacks = [];
    }
    window.SwymCallbacks.push(swymCallbackFn);
  }

  updateLists() {
    var self = this;
    async function swymCallbackFn(swat) {
      swat.fetchLists({
        callbackFn: async (lists) => {
          self.currentLists = lists;
          const listsToCreate = [];
          self.defaultLists.forEach(lname => {
            if (!lists.find(l => l.lname === lname)) {
              listsToCreate.push({ lname });
            }
          });

          // return self.removeAllLists(swat);

          if (listsToCreate.length) {
            return self.createLists(swat, listsToCreate);
          }

          self.renderLists(self.currentLists);
          self.updateIconsStatus();
        }
      });
    }
    if(!window.SwymCallbacks) {
    window.SwymCallbacks = [];
    }
    window.SwymCallbacks.push(swymCallbackFn);
  }

  updateIconsStatus() {
    const icons = document.querySelectorAll('[data-add-to-lists-button]');
    const yourListsIcons = document.querySelectorAll('[data-your-lists-button]');

    if (this.isListsHasItems.bind(this)()) {
      yourListsIcons?.forEach(icon => icon.classList.add('has-items'));
    } else {
      yourListsIcons?.forEach(icon => icon.classList.remove('has-items'));
    }

    icons?.forEach(icon => {
      const variantId = icon.dataset.epi;
      if (this.isVariantAddedInLists.bind(this)(variantId)) {
        icon.classList.add('added');
      } else {
        icon.classList.remove('added');
      }
    })
  }

  isListsHasItems() {
    let hasItems = false;

    for (let i = 0; i < this.currentLists.length; i++) {
      const listProducts = this.currentLists[i].listcontents;
      if (listProducts && listProducts.length) {
        hasItems = true;
        break;
      }
    }

    return hasItems;
  }

  isVariantAddedInLists(variantId) {
    let isAdded = false;

    for (let i = 0; i < this.currentLists.length; i++) {
      const products = this.currentLists[i].listcontents;
      if (products) {
        for (let j = 0; j < products.length; j++) {
          const product = products[j];
          if (product.epi.toString() === variantId) {
            isAdded = true;
            break;
          }
        }
      }
    }

    return isAdded;
  }

  uncheckAllCheckboxes() {
    const listCheckboxes = this.querySelectorAll('.list-checkbox input[type="checkbox"]');
    listCheckboxes.forEach(checkbox => checkbox.checked = false);
  }

  checkAnyChecked() {
    let isAnyChecked = false;
    const listCheckboxes = this.querySelectorAll('.list-checkbox input[type="checkbox"]');
    listCheckboxes.forEach(checkbox => {
      if (checkbox.checked == true) {
        isAnyChecked = true;
      }
    });
    return isAnyChecked;
  }

  checkList() {
    const listCheckboxes = this.querySelectorAll('.list-checkbox input[type="checkbox"]');
    listCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const lid = checkbox.getAttribute('name');
        if (checkbox.checked) {
          this.checkedLists.push(lid);
        } else {
          const index = this.checkedLists.findIndex(item => item === lid);
          this.checkedLists.splice(index, 1);
        }

        const isAnyChecked = this.checkAnyChecked();
        if(isAnyChecked) {
          this.addToListsBtn?.removeAttribute('disabled');
        } else {
          this.addToListsBtn?.setAttribute('disabled', 'disabled');
        }
      })
    })
  }

  removeAllLists(swat) {
    this.currentLists.forEach(list => {
      swat.deleteList(list.lid, function(deletedListObj){
        // successfully deleted list
        console.log("Deleted list with listid", deletedListObj.lid);
      }, function(xhrObject) {
        // something went wrong
      });
    })
  }

  createLists(swat, listNames) {
    const listsPromises = listNames.map(newListDef => new Promise((resolve, reject) => {
      swat.createList(newListDef, newListObj => {
        resolve(newListObj);
      }, function(xhrObject) {
        // something went wrong
      })
    }))

    Promise.all(listsPromises).then(newLists => {
      this.currentLists = [...this.currentLists, ...newLists];
      this.renderLists(this.currentLists);
    })
  }

  renderAddingProduct(target) {
    const data = target.dataset;
    const productTitle = data.productTitle;
    const productImage = data.productImage;
    this.currentProduct = {
      epi: data.epi,
      empi: data.empi,
      du: data.du
    }

    const html = `
      <div class="lists-adding-product__image">
        <img src="${ productImage }" alt="${ productTitle }" />
      </div>
      <h4 class="lists-adding-product__title">${ productTitle }</h4>`;

    this.productPlaceholder.innerHTML = html;
  }

  renderLists(lists) {
    let html = '';
    const penIcon = this.dataset.penIcon;

    lists?.forEach(list => {
      const amount = list.cnt && list.cnt > 1 ? list.cnt : (list.cnt || 0);
      html += `<div class="list-checkbox">
          <input type="checkbox" id="${ list.lid }" name="${ list.lid }" data-list-name="${ list.lname }" />
          <label for="${ list.lid }">
            <span class="check-icon"></span>
            <span>${ penIcon } ${ list.lname } (${ amount })</span>
          </label>
        </div>`
    });

    this.listsPlaceholder.innerHTML = html;
    this.checkList();
    this.disableLoading(this);
  }

  open(target) {
    this.renderAddingProduct.bind(this)(target);
    this.classList.add('active');
  }

  close() {
    this.classList.remove('active');
  }

  enableLoading(container) {
    container.querySelector('.loading-state').classList.remove('hidden');
  }

  disableLoading(container) {
    container.querySelector('.loading-state').classList.add('hidden');
  }
}
