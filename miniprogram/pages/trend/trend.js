const { request } = require('../../utils/request');

const METRICS = [
  { key: 'bustGirth', label: '胸围' },
  { key: 'waistGirth', label: '腰围' },
  { key: 'hipGirth', label: '臀围' },
  { key: 'thighGirthR', label: '大腿围' },
  { key: 'acrossBackShoulderWidth', label: '肩宽' }
];

Page({
  data: { metrics: METRICS, current: 'bustGirth', latestValue: '--' },
  onLoad() { this.fetchData(); },
  switchMetric(e) {
    this.setData({ current: e.currentTarget.dataset.key });
    this.fetchData();
  },
  async fetchData() {
    try {
      const res = await request('/measurement/history');
      const series = res
        .map((m) => {
          const d = (m.details || []).find((x) => x.parameter_name === this.data.current);
          return d ? { date: m.created_at, value: d.value } : null;
        })
        .filter(Boolean)
        .reverse();
      if (series.length === 0) { this.setData({ latestValue: '--' }); return; }
      this.setData({ latestValue: series[series.length - 1].value.toFixed(1) });
      this.drawChart(series);
    } catch (e) {
      wx.showToast({ title: '加载趋势失败', icon: 'none' });
    }
  },
  drawChart(series) {
    const query = wx.createSelectorQuery();
    query.select('#trendCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      const W = res[0].width, H = res[0].height, pad = 30;
      const values = series.map((s) => s.value);
      const min = Math.min(...values) - 5, max = Math.max(...values) + 5;
      const xs = (i) => pad + (i * (W - 2 * pad)) / Math.max(series.length - 1, 1);
      const ys = (v) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad + (i * (H - 2 * pad)) / 4;
        ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
      }
      const grad = ctx.createLinearGradient(0, pad, 0, H - pad);
      grad.addColorStop(0, 'rgba(43,179,163,0.25)'); grad.addColorStop(1, 'rgba(43,179,163,0)');
      ctx.beginPath();
      series.forEach((s, i) => { i === 0 ? ctx.moveTo(xs(i), ys(s.value)) : ctx.lineTo(xs(i), ys(s.value)); });
      ctx.lineTo(xs(series.length - 1), H - pad); ctx.lineTo(xs(0), H - pad); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      series.forEach((s, i) => { i === 0 ? ctx.moveTo(xs(i), ys(s.value)) : ctx.lineTo(xs(i), ys(s.value)); });
      ctx.strokeStyle = '#2BB3A3'; ctx.lineWidth = 2; ctx.stroke();
      series.forEach((s, i) => {
        ctx.beginPath(); ctx.arc(xs(i), ys(s.value), 3, 0, Math.PI * 2);
        ctx.fillStyle = '#2BB3A3'; ctx.fill();
      });
    });
  }
});
