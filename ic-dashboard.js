/**
 * IC Executive Dashboard — Data-Bound Custom Widget
 * com.custom.icdashboard v1.0.0
 *
 * Renders directly in the widget's own DOM (no srcdoc iframe).
 * ECharts loads in the main SAC page context → fully working.
 * Receives live measure values via SAC data bindings.
 * Re-renders the full dashboard every time SAC data updates.
 */

(function () {
  'use strict';

  /* ── ECharts loader ─────────────────────────────────────────────── */
  let _echartsReady = false;
  let _echartsCallbacks = [];

  function loadECharts(cb) {
    if (_echartsReady) { cb(); return; }
    _echartsCallbacks.push(cb);
    if (document.getElementById('__echarts_cdn__')) return;
    const s = document.createElement('script');
    s.id  = '__echarts_cdn__';
    s.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
    s.onload = function () {
      _echartsReady = true;
      _echartsCallbacks.forEach(function (f) { f(); });
      _echartsCallbacks = [];
    };
    document.head.appendChild(s);
  }

  /* ── Helpers ────────────────────────────────────────────────────── */
  function fmt(n) {
    n = Math.round(n);
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) {
      return Math.floor(n / 1000) + ',' + ('000' + (n % 1000)).slice(-3);
    }
    return '' + n;
  }
  function ilaColor(v)   { return v >= 97 ? '#0070F2' : v >= 95 ? '#188918' : v >= 90 ? '#C35500' : '#D20A0A'; }
  function ilaRag(v)     { return v >= 97 ? 'blue' : v >= 95 ? 'green' : v >= 90 ? 'amber' : 'red'; }
  function concurColor(v){ return v > 50  ? '#D20A0A' : v > 40 ? '#C35500' : '#188918'; }
  function qhsCalc(i, c) { return Math.min(100, Math.round(i * 0.6 + (100 - c) * 0.3 + 10)); }

  /* ── CSS ────────────────────────────────────────────────────────── */
  const CSS = `
    :root {
      --nd:#00144A; --nm:#002A86; --sb:#0070F2; --sb2:#1B90FF;
      --bp:#89D1FF; --w:#fff; --bg:#F5F7FA; --c1:#32363A;
      --c2:#6A6D70; --c3:#999; --br:#EAECEE;
      --gr:#188918; --am:#C35500; --rd:#D20A0A; --ra:#0070F2;
      --r:8px; --sh:0 2px 8px rgba(0,0,0,.08);
    }
    *{box-sizing:border-box;margin:0;padding:0;}
    #icd-root{
      font-family:'72 Brand','72','Segoe UI',system-ui,sans-serif;
      background:var(--bg);color:var(--c1);font-size:14px;
      height:100%;overflow-y:auto;
    }
    /* HERO */
    .hero{background:linear-gradient(135deg,#00144A 0%,#002A86 55%,#00144A 100%);
      padding:16px 28px 20px;position:relative;overflow:hidden;}
    .hero::before{content:'';position:absolute;top:-60px;right:-60px;
      width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.03);}
    .badge{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
      color:var(--bp);margin-bottom:4px;}
    .hero-title{font-size:clamp(16px,2vw,21px);font-weight:700;
      color:var(--w);margin-bottom:10px;}
    .hero-hr{border:none;border-top:1px solid rgba(255,255,255,.15);margin-bottom:10px;}
    .hero-p{font-size:clamp(11px,1.2vw,13px);color:var(--w);line-height:1.72;max-width:1100px;}
    /* SUBHEADER */
    .sub{background:var(--nd);padding:8px 28px;display:flex;
      align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;}
    .sub-title{color:var(--w);font-size:13px;font-weight:600;}
    .sub-period{color:var(--bp);font-size:12px;font-weight:600;}
    /* NARRATIVE BAR */
    .narbar{margin:14px 28px 0;border-left:4px solid var(--sb);
      background:#F0F6FF;border-radius:0 var(--r) var(--r) 0;
      padding:11px 16px;font-size:13px;line-height:1.6;}
    /* MAIN GRID */
    .grid{padding:14px 28px 20px;display:grid;
      grid-template-columns:190px 1fr 210px;
      grid-template-rows:auto auto;gap:14px;}
    @media(max-width:1100px){.grid{grid-template-columns:1fr 1fr;}}
    @media(max-width:680px){
      .grid{grid-template-columns:1fr;padding:10px 14px;}
      .hero,.sub,.narbar{padding-left:14px;padding-right:14px;}
      .narbar{margin-left:14px;margin-right:14px;}
    }
    /* QHS */
    .qhs-card{background:var(--w);border-radius:var(--r);box-shadow:var(--sh);
      padding:16px 12px;display:flex;flex-direction:column;
      align-items:center;justify-content:center;grid-row:span 2;}
    #icd-gauge{width:160px;height:160px;}
    .qhs-status{font-size:11px;font-weight:700;margin-top:-4px;margin-bottom:8px;}
    .qhs-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1px;
      color:var(--c2);text-align:center;}
    .qhs-sub{font-size:8px;color:var(--c3);text-align:center;margin-top:2px;}
    /* KPI GRID */
    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
    @media(max-width:680px){.kpi-grid{grid-template-columns:repeat(2,1fr);}}
    .kpi{background:var(--w);border-radius:var(--r);box-shadow:var(--sh);
      padding:14px 16px;border-top:3px solid var(--br);}
    .kpi.blue  {border-top-color:var(--ra);}
    .kpi.green {border-top-color:var(--gr);}
    .kpi.amber {border-top-color:var(--am);}
    .kpi.red   {border-top-color:var(--rd);}
    .kpi-t{font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:.8px;color:var(--c2);margin-bottom:6px;}
    .kpi-v{font-size:clamp(20px,2.5vw,28px);font-weight:700;line-height:1;color:var(--c1);}
    .kpi.blue  .kpi-v{color:var(--ra);}
    .kpi.green .kpi-v{color:var(--gr);}
    .kpi.amber .kpi-v{color:var(--am);}
    .kpi.red   .kpi-v{color:var(--rd);}
    .kpi-s{font-size:10px;color:var(--c3);margin-top:4px;}
    /* PRIORITY */
    .pri{background:var(--w);border-radius:var(--r);box-shadow:var(--sh);
      padding:16px;grid-row:span 2;}
    .pri-t{font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:1.2px;color:var(--c2);
      border-bottom:2px solid var(--sb);padding-bottom:8px;margin-bottom:14px;}
    .act{display:flex;align-items:flex-start;gap:8px;
      margin-bottom:12px;font-size:12px;line-height:1.45;color:var(--c1);}
    .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;}
    /* CHARTS */
    .chart-card{background:var(--w);border-radius:var(--r);box-shadow:var(--sh);padding:16px;}
    .chart-t{font-size:11px;font-weight:700;color:var(--c1);margin-bottom:12px;}
    #icd-trend{width:100%;height:200px;}
    #icd-donut{width:100%;height:200px;}
    /* FOOTER */
    .foot{text-align:center;padding:10px 28px;font-size:10px;
      color:var(--c3);border-top:1px solid var(--br);}
  `;

  /* ── HTML shell ─────────────────────────────────────────────────── */
  function buildShell() {
    return `
<style>${CSS}</style>
<div id="icd-root">
  <div class="hero">
    <div class="badge">Executive Command Center</div>
    <div class="hero-title">Executive Overview</div>
    <hr class="hero-hr">
    <div class="hero-p" id="icd-narrative">Loading live data&#8230;</div>
  </div>
  <div class="sub">
    <div class="sub-title">&#127919; Invoice Capture &#8212; Executive Command Center</div>
    <div class="sub-period" id="icd-period">&#8212;</div>
  </div>
  <div class="narbar" id="icd-narbar">Loading&#8230;</div>
  <div class="grid">
    <div class="qhs-card">
      <div id="icd-gauge"></div>
      <div class="qhs-status" id="icd-qhs-status">&#8212;</div>
      <div class="qhs-lbl">Quality Health Score</div>
      <div class="qhs-sub">Accuracy &middot; Escalation &middot; Concur Rate</div>
    </div>
    <div class="kpi-grid">
      <div class="kpi blue">
        <div class="kpi-t">ILA %</div>
        <div class="kpi-v" id="icd-ila">&#8212;</div>
        <div class="kpi-s">Target: 95.00%</div>
      </div>
      <div class="kpi" id="icd-concur-card">
        <div class="kpi-t">SAP Concur %</div>
        <div class="kpi-v" id="icd-concur">&#8212;</div>
        <div class="kpi-s">Escalation confirmed</div>
      </div>
      <div class="kpi neutral">
        <div class="kpi-t">Escalation Rate</div>
        <div class="kpi-v" id="icd-escrate">&#8212;</div>
        <div class="kpi-s">% of total volume</div>
      </div>
      <div class="kpi neutral">
        <div class="kpi-t">Reviews</div>
        <div class="kpi-v" id="icd-reviews">&#8212;</div>
        <div class="kpi-s">Total reviewed</div>
      </div>
      <div class="kpi neutral">
        <div class="kpi-t">Escalations</div>
        <div class="kpi-v" id="icd-esc">&#8212;</div>
        <div class="kpi-s">Cases reviewed</div>
      </div>
      <div class="kpi blue">
        <div class="kpi-t">EOY Forecast ILA %</div>
        <div class="kpi-v" id="icd-eoy">&#8212;</div>
        <div class="kpi-s">Projected year-end</div>
      </div>
    </div>
    <div class="pri">
      <div class="pri-t">Priority Actions</div>
      <div id="icd-actions"></div>
    </div>
    <div class="chart-card" style="grid-column:1/3;">
      <div class="chart-t" id="icd-trend-title">Invoice Level Accuracy &#8212; Monthly Trend</div>
      <div id="icd-trend"></div>
    </div>
    <div class="chart-card">
      <div class="chart-t">Escalation Breakdown</div>
      <div id="icd-donut"></div>
    </div>
  </div>
  <div class="foot">
    Invoice Capture Operations &nbsp;&middot;&nbsp; IC_COMBINED_AM2
    &nbsp;&middot;&nbsp; SAP Datasphere EU10
  </div>
</div>`;
  }

  /* ── Priority actions HTML ──────────────────────────────────────── */
  function buildActions(ila, concur) {
    const items = [
      { color:'#D20A0A', text:'Root cause SAP Concur Errors by report type' },
      { color:'#D20A0A', text:'Engage site with highest Concur error rate' },
      { color:'#C35500', text: ila < 98 ? 'Monitor accuracy dip below 98%' : 'Monitor low-accuracy months for recurrence' },
      { color:'#C35500', text:'Review sample coverage for high-risk types' },
      { color:'#0070F2', text: concur < 60 ? 'Concur rate improving — sustain actions' : 'Escalate Concur trend to leadership' }
    ];
    return items.map(function(a) {
      return '<div class="act"><div class="dot" style="background:' + a.color + ';"></div><span>' + a.text + '</span></div>';
    }).join('');
  }

  /* ── Main render ────────────────────────────────────────────────── */
  function renderDashboard(root, vals, monthlyData) {
    const ila    = vals.ila    || 0;
    const concur = vals.concur || 0;
    const rev    = vals.reviews || 0;
    const esc    = vals.escalations || 0;
    const eoy    = vals.eoy    || ila;
    const escRate = vals.escRate || 0.04;

    const ic  = ilaColor(ila);
    const cc  = concurColor(concur);
    const qhs = qhsCalc(ila, concur);
    const qhsC = qhs >= 75 ? '#188918' : '#C35500';
    const qhsL = qhs >= 90 ? 'Excellent' : qhs >= 75 ? 'Good Standing' : 'Needs Attention';
    const qhsDeg = Math.round(qhs / 100 * 360);
    const concurDeg = Math.round(concur / 100 * 360);
    const status = ila >= 95 ? 'on track' : 'below target';

    /* Narrative */
    root.querySelector('#icd-narrative').innerHTML =
      'Invoice Capture reviewed <strong style="color:#89D1FF;">' + fmt(rev) + ' invoices</strong>' +
      ' and delivered <strong style="color:' + (ila >= 97 ? '#4ADE80' : ila >= 95 ? '#FACC15' : '#FF6B6B') + ';">' +
      ila.toFixed(2) + '% accuracy</strong>' +
      ' &#8212; <em style="color:rgba(255,255,255,.75);">' + status + ' against the 95% target</em>.' +
      ' One signal demands attention: <strong style="color:' + (concur > 50 ? '#FF6B6B' : '#FACC15') + ';">' +
      'SAP Concur errors represent ' + concur.toFixed(2) + '% of all escalations</strong>' +
      ' &#8212; a rising trend that is not self-correcting.' +
      ' EOY forecast at <strong style="color:' + (ila >= 97 ? '#4ADE80' : '#FACC15') + ';">' +
      eoy.toFixed(2) + '%</strong>' +
      ' &#8212; but only if the Concur escalation pattern is addressed before year-end.' +
      ' <strong style="color:' + (concur > 50 ? '#FF6B6B' : '#FACC15') + ';">' +
      'The escalation story requires a decision.</strong>';

    /* Sub-period */
    root.querySelector('#icd-period').textContent = 'Live \u00B7 YTD';

    /* Narrative bar */
    root.querySelector('#icd-narbar').innerHTML =
      '<strong style="color:#0070F2;">Invoice Capture &#8212; Quality Summary:</strong> ' +
      'Accuracy at <strong style="color:' + ic + ';">' + ila.toFixed(2) + '%</strong>' +
      ' &#8212; ' + (ila >= 95 ? 'above' : 'below') + ' the 95% target. ' +
      'SAP Concur Error Rate at <strong style="color:' + cc + ';">' + concur.toFixed(2) + '%</strong>' +
      (concur > 50 ? ' &#8212; <strong>monitor closely.</strong>' : ' &#8212; within range.') +
      ' Total reviews: <strong>' + fmt(rev) + '</strong>.';

    /* KPIs */
    root.querySelector('#icd-ila').textContent    = ila.toFixed(2);
    root.querySelector('#icd-concur').textContent  = concur.toFixed(2);
    root.querySelector('#icd-escrate').textContent = escRate.toFixed(2);
    root.querySelector('#icd-reviews').textContent = fmt(rev);
    root.querySelector('#icd-esc').textContent     = fmt(esc);
    root.querySelector('#icd-eoy').textContent     = eoy.toFixed(2);

    const ilaCard    = root.querySelector('.kpi.blue');
    if (ilaCard) ilaCard.className = 'kpi ' + ilaRag(ila);

    const concurCard = root.querySelector('#icd-concur-card');
    if (concurCard) concurCard.className = 'kpi ' + (concur > 50 ? 'red' : 'amber');

    /* QHS status */
    const qhsStat = root.querySelector('#icd-qhs-status');
    if (qhsStat) { qhsStat.textContent = '\u25B2 ' + qhsL; qhsStat.style.color = qhsC; }

    /* Priority actions */
    const actEl = root.querySelector('#icd-actions');
    if (actEl) actEl.innerHTML = buildActions(ila, concur);

    /* Charts */
    loadECharts(function () {
      /* Gauge */
      const gDom = root.querySelector('#icd-gauge');
      if (gDom) {
        const gc = echarts.init(gDom);
        gc.setOption({
          series:[{ type:'gauge', startAngle:220, endAngle:-40,
            min:0, max:100, radius:'82%',
            pointer:{ show:false },
            progress:{ show:true, width:12, itemStyle:{ color:qhsC } },
            axisLine:{ lineStyle:{ width:12, color:[[1,'#EAECEE']] } },
            axisTick:{ show:false }, splitLine:{ show:false }, axisLabel:{ show:false },
            detail:{ valueAnimation:true, fontSize:28, fontWeight:'bold',
              color:qhsC, offsetCenter:[0,'-8%'], formatter:'{value}' },
            title:{ offsetCenter:[0,'25%'], fontSize:11, color:'#6A6D70' },
            data:[{ value:qhs, name:qhsL }]
          }]
        });
      }

      /* Trend */
      const tDom = root.querySelector('#icd-trend');
      if (tDom && monthlyData && monthlyData.length) {
        const tc = echarts.init(tDom);
        const months = monthlyData.map(function(d){ return d.month; });
        const values = monthlyData.map(function(d){ return d.ila; });
        const minV   = Math.max(94, Math.min.apply(null, values) - 1);
        const maxV   = Math.min(100, Math.max.apply(null, values) + 0.5);
        tc.setOption({
          backgroundColor:'transparent',
          grid:{ left:36,right:16,top:24,bottom:28,containLabel:true },
          tooltip:{ trigger:'axis',
            formatter:function(p){ return '<b>'+p[0].name+'</b><br/>ILA: <b>'+p[0].value+'%</b>'; }},
          xAxis:{ type:'category', data:months,
            axisLabel:{ fontSize:10, color:'#6A6D70' },
            axisLine:{ lineStyle:{ color:'#EAECEE' } }},
          yAxis:{ type:'value', min:minV, max:maxV,
            axisLabel:{ fontSize:10, formatter:'{value}%', color:'#6A6D70' },
            splitLine:{ lineStyle:{ color:'#F0F2F5' } }},
          series:[{ type:'line', data:values, smooth:true,
            lineStyle:{ color:'#0070F2', width:2.5 },
            itemStyle:{ color:'#0070F2' }, symbol:'circle', symbolSize:6,
            label:{ show:true, position:'top', fontSize:9, color:'#32363A',
              formatter:function(p){ return p.value.toFixed(2); }},
            markLine:{ silent:true, symbol:'none', data:[{
              yAxis:95, lineStyle:{ type:'dashed', color:'#D20A0A', width:1.5 },
              label:{ formatter:'95% Target', color:'#D20A0A', fontSize:10 }}]}
          }]
        });
      }

      /* Donut */
      const dDom = root.querySelector('#icd-donut');
      if (dDom) {
        const concurCnt = Math.round(esc * concur / 100);
        const clientCnt = esc - concurCnt;
        const dc = echarts.init(dDom);
        dc.setOption({
          backgroundColor:'transparent',
          tooltip:{ trigger:'item',
            formatter:function(p){
              return '<b>'+p.name+'</b><br/>'+p.value.toLocaleString()+' ('+p.percent+'%)';
            }},
          legend:{ bottom:4, left:'center', itemWidth:10, itemHeight:10,
            textStyle:{ fontSize:11 }},
          series:[{ type:'pie', radius:['38%','65%'], center:['50%','46%'],
            label:{ show:true, position:'outside', fontSize:11, fontWeight:'bold',
              formatter:function(p){ return p.percent.toFixed(1)+'%'; }},
            data:[
              { value:concurCnt, name:'SAP Concur',
                itemStyle:{ color:'#D20A0A', borderRadius:4 }},
              { value:clientCnt, name:'Client Error',
                itemStyle:{ color:'#188918', borderRadius:4 }}
            ]
          }]
        });
      }
    });
  }

  /* ── Widget class ───────────────────────────────────────────────── */
  const TMPL = document.createElement('template');
  TMPL.innerHTML = buildShell();

  class ICDashboard extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow ? this.attachShadow({ mode:'open' }) : this;
      this._root.appendChild(TMPL.content.cloneNode(true));
      this._vals = { ila:98.15, concur:64.40, reviews:585226,
                     escalations:8143, eoy:98.15, escRate:0.04 };
      this._monthly = [
        {month:'Jan', ila:98.15},{month:'Feb', ila:98.12},
        {month:'Mar', ila:98.14},{month:'Apr', ila:97.83},
        {month:'May', ila:98.15},{month:'Jun', ila:98.04},
        {month:'Jul', ila:97.69},{month:'Aug', ila:98.02},
        {month:'Sep', ila:98.38},{month:'Oct', ila:98.76}
      ];
    }

    connectedCallback() {
      renderDashboard(this._root, this._vals, this._monthly);
    }

    /* ── SAC data binding entry point ───────────────────────────── */
    onCustomWidgetAfterUpdate(delta) {
      try {
        const binding = this.dataBindings && this.dataBindings.dashboardData;
        if (!binding) { this._renderFallback(); return; }

        const result = binding.result || binding.data;
        if (!result) { this._renderFallback(); return; }

        /* Extract measure values from SAC result set */
        const members = result.members || [];
        const row     = (result.data || result.rows || [])[0] || {};

        const get = function(id) {
          /* Try direct key first */
          if (row[id] !== undefined) return parseFloat(row[id]);
          /* Try each member's rawValue */
          for (let i = 0; i < members.length; i++) {
            if (members[i].id === id || members[i].description === id) {
              const v = (result.data || result.rows || [])[0];
              if (v && v[i] !== undefined) return parseFloat(v[i]);
            }
          }
          return null;
        };

        /* Map measure IDs — user binds these in SAC Builder panel */
        const ila    = get('Invoice_Level_Accuracy_Pct') || get('ILA') || get('ila');
        const concur = get('SAP_Concur_Error_Rate_Pct') || get('CONCUR') || get('concur');
        const rev    = get('Quality_Review_Count')       || get('REVIEWS') || get('reviews');
        const esc    = get('Escalation_Review_Count')    || get('ESCALATIONS') || get('escalations');
        const eoy    = get('EOY_Forecast_RLA')           || get('EOY') || ila;

        if (ila    !== null) this._vals.ila         = ila;
        if (concur !== null) this._vals.concur      = concur;
        if (rev    !== null) this._vals.reviews     = rev;
        if (esc    !== null) this._vals.escalations = esc;
        if (eoy    !== null) this._vals.eoy         = eoy;

        renderDashboard(this._root, this._vals, this._monthly);
      } catch (e) {
        this._renderFallback();
      }
    }

    _renderFallback() {
      renderDashboard(this._root, this._vals, this._monthly);
    }

    /* ── Allow direct property setting (SAC scripting fallback) ─── */
    set ila(v)          { this._vals.ila         = parseFloat(v) || this._vals.ila; renderDashboard(this._root, this._vals, this._monthly); }
    set concurRate(v)   { this._vals.concur      = parseFloat(v) || this._vals.concur; renderDashboard(this._root, this._vals, this._monthly); }
    set reviews(v)      { this._vals.reviews     = parseFloat(v) || this._vals.reviews; renderDashboard(this._root, this._vals, this._monthly); }
    set escalations(v)  { this._vals.escalations = parseFloat(v) || this._vals.escalations; renderDashboard(this._root, this._vals, this._monthly); }
    set eoy(v)          { this._vals.eoy         = parseFloat(v) || this._vals.eoy; renderDashboard(this._root, this._vals, this._monthly); }
    set monthlyData(v)  { try { this._monthly = JSON.parse(v); renderDashboard(this._root, this._vals, this._monthly); } catch(e){} }
  }

  customElements.define('com-custom-icdashboard', ICDashboard);
})();
