/**
 * IC Executive Dashboard — Data-Bound Custom Widget
 * com.custom.icdashboard v1.0.1
 *
 * Renders directly in the widget's own DOM (no srcdoc iframe).
 * ECharts loads in the main SAC page context → fully working.
 * Receives live measure values via SAC data bindings.
 * Re-renders the full dashboard every time SAC data updates.
 *
 * v1.0.1 fix: Force hero/sub colors via JS setProperty('important')
 *             to beat SAC host page CSS inheritance on shadow root.
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
  function ilaColor(v)    { return v >= 97 ? '#0070F2' : v >= 95 ? '#188918' : v >= 90 ? '#C35500' : '#D20A0A'; }
  function ilaRag(v)      { return v >= 97 ? 'blue' : v >= 95 ? 'green' : v >= 90 ? 'amber' : 'red'; }
  function concurColor(v) { return v > 50  ? '#D20A0A' : v > 40 ? '#C35500' : '#188918'; }
  function qhsCalc(i, c)  { return Math.min(100, Math.round(i * 0.6 + (100 - c) * 0.3 + 10)); }

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
      font-family:'72 Brand','72','Segoe UI',system-ui,sans-serif !important;
      background:#F5F7FA !important;color:#32363A !important;
      font-size:14px;height:100%;overflow-y:auto;
    }
    /* HERO */
    .hero{background:linear-gradient(135deg,#00144A 0%,#002A86 55%,#00144A 100%);
      padding:16px 28px 20px;position:relative;overflow:hidden;
      color:#FFFFFF !important;}
    .hero::before{content:'';position:absolute;top:-60px;right:-60px;
      width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,.03);}
    .badge{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
      color:#89D1FF !important;margin-bottom:4px;}
    .hero-title{font-size:clamp(16px,2vw,21px);font-weight:700;
      color:#FFFFFF !important;margin-bottom:10px;}
    .hero-hr{border:none;border-top:1px solid rgba(255,255,255,.15);margin-bottom:10px;}
    .hero-p{font-size:clamp(11px,1.2vw,13px);color:#FFFFFF !important;
      line-height:1.72;max-width:1100px;}
    .hero-p em{color:rgba(255,255,255,0.75) !important;font-style:italic;}
    .hero-p span{color:#FFFFFF !important;}
    /* SUBHEADER */
    .sub{background:#00144A;padding:8px 28px;display:flex;
      align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;
      color:#FFFFFF !important;}
    .sub-title{color:#FFFFFF !important;font-size:13px;font-weight:600;}
    .sub-period{color:#89D1FF !important;font-size:12px;font-weight:600;}
    /* NARRATIVE BAR */
    .narbar{margin:14px 28px 0;border-left:4px solid #0070F2;
      background:#F0F6FF;border-radius:0 8px 8px 0;
      padding:11px 16px;font-size:13px;line-height:1.6;color:#32363A !important;}
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
    .qhs-card{background:#FFFFFF;border-radius:8px;
      box-shadow:0 2px 8px rgba(0,0,0,.08);padding:16px 12px;
      display:flex;flex-direction:column;align-items:center;
      justify-content:center;grid-row:span 2;}
    #icd-gauge{width:160px;height:160px;}
    .qhs-status{font-size:11px;font-weight:700;margin-top:-4px;margin-bottom:8px;}
    .qhs-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1px;
      color:#6A6D70 !important;text-align:center;}
    .qhs-sub{font-size:8px;color:#999999 !important;text-align:center;margin-top:2px;}
    /* KPI GRID */
    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
    @media(max-width:680px){.kpi-grid{grid-template-columns:repeat(2,1fr);}}
    .kpi{background:#FFFFFF;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);
      padding:14px 16px;border-top:3px solid #EAECEE;}
    .kpi.blue  {border-top-color:#0070F2;}
    .kpi.green {border-top-color:#188918;}
    .kpi.amber {border-top-color:#C35500;}
    .kpi.red   {border-top-color:#D20A0A;}
    .kpi-t{font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:.8px;color:#6A6D70 !important;margin-bottom:6px;}
    .kpi-v{font-size:clamp(20px,2.5vw,28px);font-weight:700;
      line-height:1;color:#32363A !important;}
    .kpi.blue  .kpi-v{color:#0070F2 !important;}
    .kpi.green .kpi-v{color:#188918 !important;}
    .kpi.amber .kpi-v{color:#C35500 !important;}
    .kpi.red   .kpi-v{color:#D20A0A !important;}
    .kpi-s{font-size:10px;color:#999999 !important;margin-top:4px;}
    /* PRIORITY */
    .pri{background:#FFFFFF;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);
      padding:16px;grid-row:span 2;}
    .pri-t{font-size:10px;font-weight:700;text-transform:uppercase;
      letter-spacing:1.2px;color:#6A6D70 !important;
      border-bottom:2px solid #0070F2;padding-bottom:8px;margin-bottom:14px;}
    .act{display:flex;align-items:flex-start;gap:8px;
      margin-bottom:12px;font-size:12px;line-height:1.45;color:#32363A !important;}
    .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;}
    /* CHARTS */
    .chart-card{background:#FFFFFF;border-radius:8px;
      box-shadow:0 2px 8px rgba(0,0,0,.08);padding:16px;}
    .chart-t{font-size:11px;font-weight:700;color:#32363A !important;margin-bottom:12px;}
    #icd-trend{width:100%;height:200px;}
    #icd-donut{width:100%;height:200px;}
    /* FOOTER */
    .foot{text-align:center;padding:10px 28px;font-size:10px;
      color:#999999 !important;border-top:1px solid #EAECEE;}
  `;

  /* ── HTML shell ─────────────────────────────────────────────────── */
  function buildShell() {
    return `
<style>${CSS}</style>
<div id="icd-root">
  <div class="hero" style="color:#FFFFFF;">
    <div class="badge" style="color:#89D1FF;">Executive Command Center</div>
    <div class="hero-title" style="color:#FFFFFF;">Executive Overview</div>
    <hr class="hero-hr">
    <div class="hero-p" id="icd-narrative" style="color:#FFFFFF;">Loading live data&#8230;</div>
  </div>
  <div class="sub" style="color:#FFFFFF;">
    <div class="sub-title" style="color:#FFFFFF;">&#127919; Invoice Capture &#8212; Executive Command Center</div>
    <div class="sub-period" style="color:#89D1FF;" id="icd-period">&#8212;</div>
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
      <div class="kpi">
        <div class="kpi-t">Escalation Rate</div>
        <div class="kpi-v" id="icd-escrate">&#8212;</div>
        <div class="kpi-s">% of total volume</div>
      </div>
      <div class="kpi">
        <div class="kpi-t">Reviews</div>
        <div class="kpi-v" id="icd-reviews">&#8212;</div>
        <div class="kpi-s">Total reviewed</div>
      </div>
      <div class="kpi">
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

  /* ── Force hero colors via JS (beats SAC host CSS inheritance) ──── */
  function forceHeroColors(root) {
    var heroEl = root.querySelector('.hero');
    if (heroEl) heroEl.style.setProperty('color', '#FFFFFF', 'important');

    var badgeEl = root.querySelector('.badge');
    if (badgeEl) badgeEl.style.setProperty('color', '#89D1FF', 'important');

    var titleEl = root.querySelector('.hero-title');
    if (titleEl) titleEl.style.setProperty('color', '#FFFFFF', 'important');

    var narEl = root.querySelector('#icd-narrative');
    if (narEl) narEl.style.setProperty('color', '#FFFFFF', 'important');

    var subEl = root.querySelector('.sub');
    if (subEl) subEl.style.setProperty('color', '#FFFFFF', 'important');

    var subTitleEl = root.querySelector('.sub-title');
    if (subTitleEl) subTitleEl.style.setProperty('color', '#FFFFFF', 'important');

    var subPeriodEl = root.querySelector('.sub-period');
    if (subPeriodEl) subPeriodEl.style.setProperty('color', '#89D1FF', 'important');
  }

  /* ── Main render ────────────────────────────────────────────────── */
  function renderDashboard(root, vals, monthlyData) {
    const ila     = vals.ila    || 0;
    const concur  = vals.concur || 0;
    const rev     = vals.reviews || 0;
    const esc     = vals.escalations || 0;
    const eoy     = vals.eoy    || ila;
    const escRate = vals.escRate || 0.04;

    const ic   = ilaColor(ila);
    const cc   = concurColor(concur);
    const qhs  = qhsCalc(ila, concur);
    const qhsC = qhs >= 75 ? '#188918' : '#C35500';
    const qhsL = qhs >= 90 ? 'Excellent' : qhs >= 75 ? 'Good Standing' : 'Needs Attention';
    const status = ila >= 95 ? 'on track' : 'below target';

    /* Narrative — all plain text inside <b font-weight:normal> so color
       inherits from the immediate parent, not from SAC host stylesheet */
    var ilaHlColor  = ila >= 97 ? '#4ADE80' : ila >= 95 ? '#FACC15' : '#FF6B6B';
    var concurHlColor = concur > 50 ? '#FF6B6B' : '#FACC15';
    var eoyHlColor  = ila >= 97 ? '#4ADE80' : '#FACC15';
    var narrativeEl = root.querySelector('#icd-narrative');
    narrativeEl.style.setProperty('color', '#FFFFFF', 'important');
    narrativeEl.innerHTML =
      '<b style="color:#FFFFFF;font-weight:normal;">Invoice Capture reviewed </b>' +
      '<b style="color:#89D1FF;font-weight:700;">' + fmt(rev) + ' invoices</b>' +
      '<b style="color:#FFFFFF;font-weight:normal;"> and delivered </b>' +
      '<b style="color:' + ilaHlColor + ';font-weight:700;">' + ila.toFixed(2) + '% accuracy</b>' +
      '<b style="color:#FFFFFF;font-weight:normal;"> &#8212; </b>' +
      '<b style="color:rgba(255,255,255,0.80);font-weight:normal;font-style:italic;">' + status + ' against the 95% target</b>' +
      '<b style="color:#FFFFFF;font-weight:normal;">. One signal demands attention: </b>' +
      '<b style="color:' + concurHlColor + ';font-weight:700;">' +
      'SAP Concur errors represent ' + concur.toFixed(2) + '% of all escalations</b>' +
      '<b style="color:#FFFFFF;font-weight:normal;"> &#8212; a rising trend that is not self-correcting. EOY forecast at </b>' +
      '<b style="color:' + eoyHlColor + ';font-weight:700;">' + eoy.toFixed(2) + '%</b>' +
      '<b style="color:#FFFFFF;font-weight:normal;"> &#8212; but only if the Concur escalation pattern is addressed before year-end. </b>' +
      '<b style="color:' + concurHlColor + ';font-weight:700;">The escalation story requires a decision.</b>';

    /* Force hero/sub colors immediately after innerHTML set */
    forceHeroColors(root);

    /* Sub-period */
    var periodEl = root.querySelector('#icd-period');
    if (periodEl) {
      periodEl.textContent = 'Live · YTD';
      periodEl.style.setProperty('color', '#89D1FF', 'important');
    }

    /* Narrative bar */
    root.querySelector('#icd-narbar').innerHTML =
      '<strong style="color:#0070F2;">Invoice Capture &#8212; Quality Summary:</strong> ' +
      'Accuracy at <strong style="color:' + ic + ';">' + ila.toFixed(2) + '%</strong>' +
      ' &#8212; ' + (ila >= 95 ? 'above' : 'below') + ' the 95% target. ' +
      'SAP Concur Error Rate at <strong style="color:' + cc + ';">' + concur.toFixed(2) + '%</strong>' +
      (concur > 50 ? ' &#8212; <strong>monitor closely.</strong>' : ' &#8212; within range.') +
      ' Total reviews: <strong>' + fmt(rev) + '</strong>.';

    /* KPIs */
    var ilaEl = root.querySelector('#icd-ila');
    if (ilaEl) { ilaEl.textContent = ila.toFixed(2); ilaEl.style.setProperty('color', ic, 'important'); }

    var concurEl = root.querySelector('#icd-concur');
    if (concurEl) { concurEl.textContent = concur.toFixed(2); concurEl.style.setProperty('color', cc, 'important'); }

    var escrateEl = root.querySelector('#icd-escrate');
    if (escrateEl) { escrateEl.textContent = escRate.toFixed(2); escrateEl.style.setProperty('color', '#32363A', 'important'); }

    var reviewsEl = root.querySelector('#icd-reviews');
    if (reviewsEl) { reviewsEl.textContent = fmt(rev); reviewsEl.style.setProperty('color', '#32363A', 'important'); }

    var escEl = root.querySelector('#icd-esc');
    if (escEl) { escEl.textContent = fmt(esc); escEl.style.setProperty('color', '#32363A', 'important'); }

    var eoyEl = root.querySelector('#icd-eoy');
    if (eoyEl) { eoyEl.textContent = eoy.toFixed(2); eoyEl.style.setProperty('color', ic, 'important'); }

    /* KPI card top border colors */
    var ilaCard = root.querySelector('#icd-ila') && root.querySelector('#icd-ila').closest('.kpi');
    if (ilaCard) ilaCard.style.borderTopColor = ic;

    var concurCard = root.querySelector('#icd-concur-card');
    if (concurCard) concurCard.style.borderTopColor = cc;

    /* QHS status */
    const qhsStat = root.querySelector('#icd-qhs-status');
    if (qhsStat) { qhsStat.textContent = '▲ ' + qhsL; qhsStat.style.setProperty('color', qhsC, 'important'); }

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
              return '<b>'+p.name+'</b><br/>'+fmt(p.value)+' ('+p.percent+'%)';
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

        const members = result.members || [];
        const row     = (result.data || result.rows || [])[0] || {};

        const get = function(id) {
          if (row[id] !== undefined) return parseFloat(row[id]);
          for (let i = 0; i < members.length; i++) {
            if (members[i].id === id || members[i].description === id) {
              const v = (result.data || result.rows || [])[0];
              if (v && v[i] !== undefined) return parseFloat(v[i]);
            }
          }
          return null;
        };

        const ila    = get('Invoice_Level_Accuracy_Pct') || get('ILA') || get('ila');
        const concur = get('SAP_Concur_Error_Rate_Pct')  || get('CONCUR') || get('concur');
        const rev    = get('Quality_Review_Count')        || get('REVIEWS') || get('reviews');
        const esc    = get('Escalation_Review_Count')     || get('ESCALATIONS') || get('escalations');
        const eoy    = get('EOY_Forecast_RLA')            || get('EOY') || ila;

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

    set ila(v)         { this._vals.ila         = parseFloat(v) || this._vals.ila;         renderDashboard(this._root, this._vals, this._monthly); }
    set concurRate(v)  { this._vals.concur      = parseFloat(v) || this._vals.concur;      renderDashboard(this._root, this._vals, this._monthly); }
    set reviews(v)     { this._vals.reviews     = parseFloat(v) || this._vals.reviews;     renderDashboard(this._root, this._vals, this._monthly); }
    set escalations(v) { this._vals.escalations = parseFloat(v) || this._vals.escalations; renderDashboard(this._root, this._vals, this._monthly); }
    set eoy(v)         { this._vals.eoy         = parseFloat(v) || this._vals.eoy;         renderDashboard(this._root, this._vals, this._monthly); }
    set monthlyData(v) { try { this._monthly = JSON.parse(v); renderDashboard(this._root, this._vals, this._monthly); } catch(e){} }
  }

  customElements.define('com-custom-icdashboard', ICDashboard);
})();
