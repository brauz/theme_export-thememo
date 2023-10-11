(function () {
    const breakpoint_desktop = 990;
    const isMobile = document.documentElement.offsetWidth < breakpoint_desktop;

    const ELE_close_up_button = document.createElement('a');
    ELE_close_up_button.setAttribute('href', '#');
    ELE_close_up_button.classList.add('pd-search-results-popup__btn-close');
    ELE_close_up_button.classList.add('full-unstyled-link');
    ELE_close_up_button.classList.add('list-link');
    ELE_close_up_button.innerHTML = `
        <svg class="icon icon--x-mark " xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <g id="heroicons-mini/x-mark">
            <path id="Union" d="M6.28033 5.21967C5.98744 4.92678 5.51256 4.92678 5.21967 5.21967C4.92678 5.51256 4.92678 5.98744 5.21967 6.28033L8.93934 10L5.21967 13.7197C4.92678 14.0126 4.92678 14.4874 5.21967 14.7803C5.51256 15.0732 5.98744 15.0732 6.28033 14.7803L10 11.0607L13.7197 14.7803C14.0126 15.0732 14.4874 15.0732 14.7803 14.7803C15.0732 14.4874 15.0732 14.0126 14.7803 13.7197L11.0607 10L14.7803 6.28033C15.0732 5.98744 15.0732 5.51256 14.7803 5.21967C14.4874 4.92678 14.0126 4.92678 13.7197 5.21967L10 8.93934L6.28033 5.21967Z" fill="#0A2657"></path>
            </g>
        </svg>
    `;

    const ELE_top_header = document.querySelector('.pd-header__top');
    const ELE_main_header = document.querySelector(".pd-header");
    const ELE_popup = document.querySelector(".pd-search-results-popup");
    const ELE_popup_cancel = document.querySelector(".pd-search-results-popup .btn-cancel");
    const ELE_popup_view_all = document.querySelector(".pd-search-results-popup .btn-view-all");
    const ELE_header_search_form = document.querySelector(".search-form");
    const ELE_header_search_input = document.querySelector(".pd-header__top #search-form");
    const ELE_header_search_input_mobile = document.querySelector(".pd-header__search-bar #search-form");
    const ELE_popUp_search_input = document.querySelector(".pd-search-results-popup #search-form");
    const ELE_suggested_search = document.querySelector(".pd-search-results-suggested-searches");
    const ELE_product_results = document.querySelector(".pd-search-results-products");
    const ELE_product_results__grid = document.querySelector(".pd-search-results-products__items .pd-grid");


    // EVENT HANDLERS
    ELE_header_search_input.addEventListener('keyup', e => {
        const keyPressed = e.key;
        if (keyPressed === "Enter") {
            return;
        }

        const val = e?.target?.value;
        showPopup(val);
    })

    ELE_header_search_input_mobile.addEventListener('keyup', e => {
        const keyPressed = e.key;
        if (keyPressed === "Enter") {
            return;
        }

        const val = e?.target?.value;
        showPopup(val);
    })

    ELE_popUp_search_input.addEventListener('keyup', e => {
        const keyPressed = e.key;
        if (keyPressed !== "Enter") {
            return;
        }

        handleSeach();
    })

    ELE_popup_cancel.addEventListener('click', closePopup);
    ELE_close_up_button.addEventListener('click', closePopup);

    ELE_suggested_search.addEventListener('click', e => {
        if (e?.target?.classList.contains('list-link')) {
            const text = e.target.innerText;
            ELE_popUp_search_input.value = text;
            ELE_header_search_input.value = text;
            ELE_header_search_input_mobile.value = text;
            handleSeach();
        }
    })

    ELE_popup_view_all.addEventListener('click', e => {
        ELE_header_search_form.submit();
    })


    // UTILITY FUNCTIONS
    function showPopup(val) {
        if (val) {
            ELE_popup.classList.add('open');
            ELE_main_header.classList.add('bg-overlay')
            ELE_main_header.classList.add('pd-overlay')
        }

        if (ELE_popUp_search_input) {
            ELE_popUp_search_input.value = val;
            ELE_popUp_search_input.focus();
        }

        if (isMobile) {
            ELE_top_header.prepend(ELE_close_up_button);
        }
    }

    function closePopup() {
        ELE_popup.classList.remove('open');
        ELE_main_header.classList.remove('bg-overlay')
        ELE_main_header.classList.remove('pd-overlay')
        ELE_suggested_search.classList.add('open')
        ELE_product_results.classList.remove('open')
        ELE_close_up_button.remove();
    }

    async function handleSeach() {
        // TODO: call search endpoint and show results
        const q = ELE_popUp_search_input.value;

        // TODO: remove once api is hooked up
        // show 10 placeholder product cards
        for (let index = 0; index < 10; index++) {
            const productRenderUrl = `/products/apline-pom-pom-beanie-raspberry-1?view=view`;
            fetch(productRenderUrl)
                .then(productResponse => productResponse.text())
                .then(productHtml => {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = productHtml;
                    ELE_product_results__grid.append(wrapper);
                })
        }

        // display results section
        ELE_suggested_search.classList.remove('open')
        ELE_product_results.classList.add('open')
    }

})();