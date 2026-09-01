const { request } = require('../../utils/request');

Page({
  data: { gender: '', age: '', weight: '', saving: false },
  onLoad() { this.load(); },
  async load() {
    try {
      const p = await request('/auth/profile');
      this.setData({ gender: p.gender || '', age: p.age !== null ? String(p.age) : '', weight: p.weight !== null ? String(p.weight) : '' });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
  setGender(e) { this.setData({ gender: e.currentTarget.dataset.g }); },
  onAgeInput(e) { this.setData({ age: e.detail.value }); },
  onWeightInput(e) { this.setData({ weight: e.detail.value }); },
  async save() {
    const { gender, age, weight } = this.data;
    if (!gender) { wx.showToast({ title: '请选择性别', icon: 'none' }); return; }
    this.setData({ saving: true });
    try {
      await request('/auth/profile', {
        method: 'PATCH',
        data: { gender, age: age ? parseInt(age) : null, weight: weight ? parseFloat(weight) : null }
      });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
