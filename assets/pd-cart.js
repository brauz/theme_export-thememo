(function () {
  const breakpoint_tablet = 990;
  const containerWidth = window.innerWidth;
  const isMobile = containerWidth < breakpoint_tablet;

  function pd_triggerStickyCheckoutSectionInMobile() {
    const target = document.querySelector('.pd-sticky-bar__trigger-point');
    const stickySection = document.querySelector('.pd-sticky-bar');
    function callback(entries, observer) {
      entries.forEach((entry) => {
        if (entry.isIntersecting && stickySection.classList.contains('fixed')) {
          stickySection.classList.remove('fixed');
        }

        if (!entry.isIntersecting && !stickySection.classList.contains('fixed')) {
          stickySection.classList.add('fixed');
        }
      });
    }
    function createObserver(target, callback) {
      const options = {
        root: null,
        threshold: 1,
      };
      const observer = new IntersectionObserver(callback, options);
      observer.observe(target);
    }

    createObserver(target, callback);
  }

  if (isMobile) {
    pd_triggerStickyCheckoutSectionInMobile();
  }

  // remove free gift if gwp condition isnt met
  fetch(`/cart?view=api-gwp`)
    .then((response) => response.text())
    .then((resp) => {
      const gwpObj = JSON.parse(resp);
      if (gwpObj.anyGiftProductInCart && (!gwpObj.anyProductsApplicableForGift || !gwpObj.isThresHoldReached)) {
        const removeUrl = document.querySelector(`[data-gwp] a`).getAttribute('href');
        location.href = removeUrl;
      }
    })
})();