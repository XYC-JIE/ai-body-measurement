// 标准尺码表数据
const sizeCharts = {
  top: [
    { size: 'S', measurements: [90, 76, 40] },
    { size: 'M', measurements: [95, 81, 42] },
    { size: 'L', measurements: [100, 86, 44] },
    { size: 'XL', measurements: [105, 91, 46] },
    { size: 'XXL', measurements: [110, 96, 48] }
  ],
  bottom: [
    { size: 'S', measurements: [76, 90, 58] },
    { size: 'M', measurements: [81, 94, 60] },
    { size: 'L', measurements: [86, 98, 62] },
    { size: 'XL', measurements: [91, 102, 64] },
    { size: 'XXL', measurements: [96, 106, 66] }
  ],
  dress: [
    { size: 'S', measurements: [90, 76, 90] },
    { size: 'M', measurements: [95, 81, 94] },
    { size: 'L', measurements: [100, 86, 98] },
    { size: 'XL', measurements: [105, 91, 102] },
    { size: 'XXL', measurements: [110, 96, 106] }
  ]
};

// 尺码表表头
const chartHeaders = {
  top: ['胸围', '腰围', '肩宽'],
  bottom: ['腰围', '臀围', '裤长'],
  dress: ['胸围', '腰围', '臀围']
};

// 测量参数映射
const measurementMap = {
  top: ['bustGirth', 'waistGirth', 'acrossBackShoulderWidth'],
  bottom: ['waistGirth', 'hipGirth', 'outseamR'],
  dress: ['bustGirth', 'waistGirth', 'hipGirth']
};

// 参数显示名称
const measurementNames = {
  bustGirth: '胸围',
  waistGirth: '腰围',
  acrossBackShoulderWidth: '肩宽',
  hipGirth: '臀围',
  outseamR: '裤长'
};

Page({
  data: {
    currentTab: 'top',
    userMeasurements: {},
    recommendedSize: '',
    matchPercentage: 0,
    sizeDetails: [],
    matchDetails: [],
    sizeChart: sizeCharts,
    chartHeaders: chartHeaders
  },

  onLoad(options) {
    // 获取从result页面传递过来的测量数据
    if (options.data) {
      try {
        const measurementData = JSON.parse(decodeURIComponent(options.data));
        this.processMeasurementData(measurementData);
      } catch (e) {
        console.error('解析测量数据失败', e);
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
      }
    } else {
      // 如果没有传递数据，尝试从全局数据获取
      this.getDataFromApp();
    }
  },

  // 处理从result页面传递的测量数据
  processMeasurementData(measurementData) {
    if (!measurementData || !measurementData.details) {
      wx.showToast({
        title: '无效的测量数据',
        icon: 'none'
      });
      return;
    }
    
    // 将测量详情转换为键值对格式
    const userMeasurements = {};
    measurementData.details.forEach(item => {
      userMeasurements[item.parameter_name] = item.value;
    });
    
    this.setData({
      userMeasurements: userMeasurements
    }, () => {
      // 数据设置完成后计算推荐
      this.calculateSizeRecommendation(this.data.currentTab);
    });
  },

  // 从全局数据获取测量数据
  getDataFromApp() {
    const app = getApp();
    if (app.globalData.lastMeasurementResult) {
      const lastResult = app.globalData.lastMeasurementResult;
      
      if (lastResult.measurements) {
        this.setData({
          userMeasurements: lastResult.measurements
        }, () => {
          this.calculateSizeRecommendation(this.data.currentTab);
        });
        return;
      }
    }
    
    // 如果没有数据，显示提示
    wx.showToast({
      title: '暂无测量数据，请先进行测量',
      icon: 'none',
      duration: 2000
    });
    
    // 延迟返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 2000);
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab
    });
    this.calculateSizeRecommendation(tab);
  },

  calculateSizeRecommendation(type) {
    const user = this.data.userMeasurements;
    const chart = this.data.sizeChart[type];
    const measurementKeys = measurementMap[type];
    
    // 检查是否有足够的数据进行计算
    let hasData = false;
    for (const key of measurementKeys) {
      if (user[key] !== undefined) {
        hasData = true;
        break;
      }
    }
    
    if (!hasData) {
      wx.showToast({
        title: '缺少必要的测量数据',
        icon: 'none'
      });
      return;
    }
    
    let bestMatch = null;
    let bestScore = 0;
    
    // 计算每个尺码的匹配度
    const scoredSizes = chart.map(item => {
      let totalScore = 0;
      let matchDetails = [];
      let validMeasurements = 0;
      
      measurementKeys.forEach((key, index) => {
        const userValue = user[key];
        if (userValue === undefined) return;
        
        const standardValue = item.measurements[index];
        const range = this.getRangeForSize(type, item.size, index);
        
        // 计算匹配度 (100% - 偏离百分比)
        let deviation = Math.abs(userValue - standardValue) / standardValue;
        let score = Math.max(0, 100 - Math.round(deviation * 100));
        
        totalScore += score;
        validMeasurements++;
        matchDetails.push({
          name: measurementNames[key],
          percent: score,
          value: userValue,
          range: range
        });
      });
      
      const avgScore = validMeasurements > 0 ? Math.round(totalScore / validMeasurements) : 0;
      
      return {
        size: item.size,
        score: avgScore,
        details: matchDetails
      };
    });
    
    // 找到最佳匹配
    scoredSizes.forEach(item => {
      if (item.score > bestScore) {
        bestScore = item.score;
        bestMatch = item;
      }
    });
    
    // 更新界面
    if (bestMatch) {
      this.setData({
        recommendedSize: bestMatch.size,
        matchPercentage: bestMatch.score,
        sizeDetails: bestMatch.details.map(detail => ({
          name: detail.name,
          value: detail.value,
          range: detail.range
        })),
        matchDetails: bestMatch.details.map(detail => ({
          name: detail.name,
          percent: detail.percent
        }))
      });
    } else {
      this.setData({
        recommendedSize: '暂无推荐',
        matchPercentage: 0,
        sizeDetails: [],
        matchDetails: []
      });
    }
  },

  getRangeForSize(type, size, measurementIndex) {
    // 根据尺码类型和测量指标返回范围
    const chart = this.data.sizeChart[type];
    const sizeData = chart.find(item => item.size === size);
    
    if (!sizeData) return '';
    
    const value = sizeData.measurements[measurementIndex];
    let min, max;
    
    if (type === 'top') {
      if (measurementIndex === 0) { // 胸围
        min = value - 5;
        max = value + 5;
      } else if (measurementIndex === 1) { // 腰围
        min = value - 4;
        max = value + 4;
      } else { // 肩宽
        min = value - 1;
        max = value + 1;
      }
    } else if (type === 'bottom') {
      if (measurementIndex === 0) { // 腰围
        min = value - 4;
        max = value + 4;
      } else if (measurementIndex === 1) { // 臀围
        min = value - 4;
        max = value + 4;
      } else { // 裤长
        min = value - 3;
        max = value + 3;
      }
    } else { // 连衣裙
      min = value - 5;
      max = value + 5;
    }
    
    return `${min}-${max}cm`;
  },

  navigateBack() {
    wx.navigateBack();
  },
});