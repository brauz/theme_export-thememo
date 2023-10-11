if (!customElements.get('load-more')) {
	class LoadMore extends HTMLElement {
		constructor() {
			super();
			this.ELM_loadMoreBtn = this.querySelector('[load-more-button]');
			this.ELM_progressBarWrapper = this.querySelector('[current-progress-bar-wrapper]');
			this.ELM_progressBar = this.querySelector('[current-progress-bar]');
			this.ELM_productCount = this.querySelector('[current-products-count]');
			this.ELM_productGrid = document.getElementById("product-grid");
			this.ELM_spinner = this.querySelector(".loading-overlay__spinner");
			this.ELM_loadMoreText = this.querySelector(".view-more-text");

			this.productPerPage = parseInt(this.getAttribute('products-per-page')) ?? 16;
			this.totalProducts = parseInt(this.getAttribute('all-products-count')) ?? 0;
			this.currentProducts = parseInt(this.ELM_productCount.innerHTML) ?? 0;
			this.currentPage = parseInt(this.getAttribute('current-page')) ?? 1;
			this.totalPages = parseInt(this.getAttribute('total-pages')) ?? 1;

			this.init.bind(this)();
		}

		init() {
			this.onUpdateProgressBar.bind(this)();

			this.ELM_loadMoreBtn.addEventListener("click", () => {
				this.onLoadMore();
			})
		}

		onLoadMore() {
			const currentPage = this.currentPage + 1;
			const searchParams = new URLSearchParams(window.location.search);
			searchParams.set('page', currentPage.toString());
			const searchArr = Array.from(searchParams).map(([key, value]) => `${key}=${value}`);

			const url = `${window.location.pathname}?section_id=${document.getElementById('product-grid').dataset.id}&${searchParams}`;

			this.ELM_spinner.classList.remove('d-none');
			this.ELM_loadMoreText.classList.add('d-none');
			fetch(url)
				.then(response => response.text())
				.then((responseText) => {
					const html = responseText;
					this.onRenderPage(searchArr.join("&"), html);
					this.onUpdateData();
				})
				.catch(() => {
					alert("Failed to fetch data. Please try again.")
				})
				.finally(() => {
					this.ELM_loadMoreText.classList.remove('d-none');
					this.ELM_spinner.classList.add('d-none')
				})
		}

		onRenderPage(searchParams, html) {
			this.onUpdateHashURL(searchParams);
			document.getElementById('product-grid').innerHTML += new DOMParser().parseFromString(html, 'text/html').getElementById('product-grid').innerHTML;
		}

		onUpdateData() {
			this.currentPage += 1;
			this.currentProducts = document.querySelectorAll('#product-grid > * ').length;
			this.setAttribute('current-page', this.currentPage.toString());
			this.ELM_productCount.innerHTML = this.currentProducts.toString();
			this.onUpdateProgressBar();
		}

		onUpdateHashURL(searchParams) {
			history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
		}

		onUpdateProgressBar() {
			const percent = (this.currentProducts / this.totalProducts) * 100;
			this.ELM_progressBar.style.width = `${percent}%`;

			if (this.currentPage >= this.totalPages) this.ELM_loadMoreBtn.classList.add("pd-button--disabled")
		}

	}

	customElements.define('load-more', LoadMore);
}