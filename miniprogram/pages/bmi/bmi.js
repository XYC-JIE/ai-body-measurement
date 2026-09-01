// bmi.js
const { request } = require('../../utils/request');

Page({
  data: {
    height: '',
    weight: '',
    bmiResult: '',
    bmiCategory: '',
    categoryClass: '',
    indicatorPosition: 50,
    history: [],
    isLoading: false
  },

  onLoad: function() {
    // 检查用户是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      this.showLoginPrompt();
      return;
    }
    
    // 加载历史记录
    this.loadHistory();
  },

  // 显示登录提示
  showLoginPrompt: function() {
    wx.showModal({
      title: '提示',
      content: '请先登录',
      showCancel: false,
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/user/user'
          });
        }
      }
    });
  },

  // 输入身高
  onHeightInput: function(e) {
    this.setData({
      height: e.detail.value
    });
  },

  // 输入体重
  onWeightInput: function(e) {
    this.setData({
      weight: e.detail.value
    });
  },

  // 计算BMI
  async calculateBMI() {
    const { height, weight } = this.data;
    
    if (!height || !weight || height <= 0 || weight <= 0) {
      wx.showToast({
        title: '请输入有效的身高和体重',
        icon: 'none'
      });
      return;
    }

    if (height > 250) {
      wx.showToast({
        title: '身高不能超过250cm',
        icon: 'none'
      });
      return;
    }

    if (weight > 300) {
      wx.showToast({
        title: '体重不能超过300kg',
        icon: 'none'
      });
      return;
    }

    this.setData({ isLoading: true });

    try {
      // 转换为米（后端API需要米为单位）
      const heightInMeters = height / 100;
      
      // 调用后端API计算BMI并保存记录
      const res = await request('/bmi/calculate', {
        method: 'POST',
        data: {
          height: heightInMeters,
          weight: weight
        }
      });
      
      const { bmi, category } = res;
      
      // 确定分类和样式
      let categoryClass;
      if (bmi < 18.5) {
        categoryClass = 'underweight';
      } else if (bmi >= 18.5 && bmi < 24) {
        categoryClass = 'normal';
      } else if (bmi >= 24 && bmi < 28) {
        categoryClass = 'overweight';
      } else {
        categoryClass = 'obese';
      }
      
      // 更新指示器位置 (假设刻度从0到40)
      const position = Math.min(Math.max((bmi / 40) * 100, 5), 95);
      
      // 更新UI
      this.setData({
        bmiResult: bmi.toFixed(1),
        bmiCategory: category,
        categoryClass: categoryClass,
        indicatorPosition: position
      });
      
      // 重新加载历史记录
      this.loadHistory();
      
    } catch (error) {
      console.error('计算BMI失败:', error);
      wx.showToast({
        title: '计算失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 加载历史记录
async loadHistory() {
  try {
    this.setData({ isLoading: true });
    
    const res = await request('/bmi/history');
    
    // 格式化日期显示并添加分类样式
    const history = res.records.map(record => {
      // 确定分类样式
      let categoryClass = '';
      if (record.bmi < 18.5) {
        categoryClass = 'underweight';
      } else if (record.bmi >= 18.5 && record.bmi < 24) {
        categoryClass = 'normal';
      } else if (record.bmi >= 24 && record.bmi < 28) {
        categoryClass = 'overweight';
      } else {
        categoryClass = 'obese';
      }
      
      return {
        ...record,
        // 将米转换为厘米显示
        height: (record.height * 100).toFixed(1),
        weight: record.weight.toFixed(1),
        bmi: record.bmi.toFixed(1),
        created_at: this.formatDate(record.created_at),
        categoryClass: categoryClass
      };
    });
    
    this.setData({ history });
    
  } catch (error) {
    console.error('获取历史记录失败:', error);
    wx.showToast({
      title: '获取历史记录失败',
      icon: 'none'
    });
  } finally {
    this.setData({ isLoading: false });
  }
},
  // 格式化日期
  formatDate: function(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  // 删除单条历史记录
  deleteHistoryItem(e) {
    const recordId = e.currentTarget.dataset.id;
    const that = this;
    
    wx.showModal({
      title: '提示',
      content: '确定要删除这条记录吗？',
      success: async function(res) {
        if (res.confirm) {
          try {
            await request(`/bmi/record/${recordId}`, {
              method: 'DELETE'
            });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            // 重新加载历史记录
            that.loadHistory();
          } catch (error) {
            console.error('删除记录失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 清除所有历史记录
  clearAllHistory() {
    const that = this;
    const { history } = this.data;
    
    if (history.length === 0) return;
    
    wx.showModal({
      title: '提示',
      content: '确定要清除所有历史记录吗？',
      success: async function(res) {
        if (res.confirm) {
          try {
            // 创建一个删除所有记录的Promise数组
            const deletePromises = history.map(record => {
              return request(`/bmi/record/${record.record_id}`, {
                method: 'DELETE'
              });
            });
            
            // 等待所有删除操作完成
            await Promise.all(deletePromises);
            
            wx.showToast({
              title: '已清除所有记录',
              icon: 'success'
            });
            
            that.setData({ history: [] });
          } catch (error) {
            console.error('清除历史记录失败:', error);
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});