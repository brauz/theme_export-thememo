if (!customElements.get('steps-slider')) {
  customElements.define('steps-slider', class StepsSlider extends HTMLElement {
    constructor() {
      super();

      this.itemsCount = this.dataset.itemsCount ? Number(this.dataset.itemsCount) : 0;
      if (!this.itemsCount) return;

      this.timeToSwitch = this.dataset.timeToSwitch ? Number(this.dataset.timeToSwitch) * 1000 : 5000;
      this.currentStep = 0;
      this.sliderInterval = null;
      // this.goNext();

      this.querySelectorAll('[data-step-number]').forEach(elm => elm.addEventListener('click', () => {
        const step = Number(elm.dataset.step);
        this.currentStep = step;
        this.runSlider();
      }))
    }

    runSlider() {
      if (this.sliderInterval) clearInterval(this.sliderInterval);
      this.querySelectorAll('[data-step]')?.forEach(elm => elm.classList.remove('active'));
      this.querySelectorAll(`[data-step="${ this.currentStep }"]`)?.forEach(elm => elm.classList.add('active'));

      this.sliderInterval = setInterval(() => {
        this.goNext();
      }, this.timeToSwitch);
    }

    goNext() {
      if (this.currentStep < this.itemsCount) {
        this.currentStep += 1;
      } else {
        this.currentStep = 1;
      }
      this.runSlider();
    }
  })
}
