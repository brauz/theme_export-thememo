class ListsModal extends Lists {
  constructor() {
    super();

    const yourLists = document.querySelector('your-lists');
    if (!yourLists) {
      this.updateLists();
    }
  }
}

customElements.define('lists-modal', ListsModal);
