/**
 * IC Executive Dashboard — Builder Panel
 * com-custom-icdashboard-builder v1.0.0
 */
(function () {
  'use strict';

  const STYLE = `
    *{box-sizing:border-box;margin:0;padding:0;}
    :host{display:block;padding:12px;}
    .section{margin-bottom:18px;}
    .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:1.2px;color:#6A6D70;margin-bottom:10px;
      padding-bottom:6px;border-bottom:1px solid #EAECEE;}
    .field{margin-bottom:12px;}
    label{display:block;font-size:11px;font-weight:600;
      color:#32363A;margin-bottom:4px;}
    input,select{width:100%;border:1px solid #EAECEE;border-radius:4px;
      padding:6px 10px;font-size:12px;font-family:inherit;
      color:#32363A;background:#fff;outline:none;}
    input:focus,select:focus{border-color:#0070F2;}
    .hint{font-size:10px;color:#6A6D70;margin-top:3px;line-height:1.4;}
    .badge{display:inline-block;background:#E8F3FF;color:#0070F2;
      border-radius:12px;padding:2px 10px;font-size:10px;
      font-weight:700;margin-bottom:8px;}
    .info-box{background:#F5F8FF;border-left:3px solid #0070F2;
      padding:10px 12px;border-radius:0 4px 4px 0;font-size:11px;
      color:#32363A;line-height:1.6;}
    .info-box b{color:#0070F2;}
    .step{display:flex;gap:8px;margin-bottom:6px;font-size:11px;
      color:#32363A;line-height:1.5;}
    .num{background:#0070F2;color:#fff;border-radius:50%;
      width:16px;height:16px;display:flex;align-items:center;
      justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;
      margin-top:1px;}
  `;

  class ICDashboardBuilder extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>${STYLE}</style>
      <div>
        <div class="section">
          <div class="badge">IC Executive Dashboard v1.0.0</div>
          <div class="info-box">
            <b>How to connect live data:</b><br>
            After placing this widget, open the <b>Data</b> panel → 
            select <b>IC_COMBINED_AM2</b> → drag these measures into the 
            <b>Dashboard Measures</b> feed:
            <br><br>
            <div class="step"><span class="num">1</span><span>Invoice Level Accuracy Pct</span></div>
            <div class="step"><span class="num">2</span><span>SAP Concur Error Rate Pct</span></div>
            <div class="step"><span class="num">3</span><span>Quality Review Count</span></div>
            <div class="step"><span class="num">4</span><span>Escalation Review Count</span></div>
            <div class="step"><span class="num">5</span><span>EOY Forecast RLA</span></div>
          </div>
        </div>

        <div class="section">
          <div class="sec-title">Fallback Values</div>
          <div class="hint" style="margin-bottom:10px;">
            Used when data binding is not yet configured or data is unavailable.
          </div>
          <div class="field">
            <label>ILA % (fallback)</label>
            <input type="number" id="b-ila" step="0.01" min="0" max="100">
          </div>
          <div class="field">
            <label>SAP Concur % (fallback)</label>
            <input type="number" id="b-concur" step="0.01" min="0" max="100">
          </div>
          <div class="field">
            <label>Total Reviews (fallback)</label>
            <input type="number" id="b-reviews" min="0">
          </div>
          <div class="field">
            <label>Escalations (fallback)</label>
            <input type="number" id="b-esc" min="0">
          </div>
          <div class="field">
            <label>EOY Forecast % (fallback)</label>
            <input type="number" id="b-eoy" step="0.01" min="0" max="100">
          </div>
        </div>

        <div class="section">
          <div class="sec-title">Monthly Trend Data (Optional)</div>
          <div class="field">
            <label>Monthly ILA JSON</label>
            <textarea id="b-monthly" rows="4"
              style="width:100%;border:1px solid #EAECEE;border-radius:4px;
              padding:6px 10px;font-size:11px;font-family:monospace;resize:vertical;"
              placeholder='[{"month":"Jan","ila":98.15},...]'></textarea>
            <div class="hint">Optional — overrides the default Jan–Oct 2026 values.</div>
          </div>
        </div>
      </div>`;

      this._shadow = shadow;
    }

    connectedCallback() { this._syncToWidget(); }

    onCustomWidgetBeforeUpdate(delta) {}

    onCustomWidgetAfterUpdate(delta) { this._syncToWidget(); }

    _syncToWidget() {
      const sh = this._shadow;
      const set = function(id, val) {
        const el = sh.getElementById(id);
        if (el && val !== undefined) el.value = val;
      };
      if (!this.widget) return;
      const w = this.widget;
      set('b-ila',     w.ila);
      set('b-concur',  w.concurRate);
      set('b-reviews', w.reviews);
      set('b-esc',     w.escalations);
      set('b-eoy',     w.eoy);
      if (w.monthlyData) set('b-monthly', w.monthlyData);

      const onChange = (id, prop) => {
        const el = sh.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => { if (this.widget) this.widget[prop] = el.value; });
      };
      onChange('b-ila',     'ila');
      onChange('b-concur',  'concurRate');
      onChange('b-reviews', 'reviews');
      onChange('b-esc',     'escalations');
      onChange('b-eoy',     'eoy');
      onChange('b-monthly', 'monthlyData');
    }
  }

  customElements.define('com-custom-icdashboard-builder', ICDashboardBuilder);
})();
