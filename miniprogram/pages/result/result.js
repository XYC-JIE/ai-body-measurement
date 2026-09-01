const { request } = require('../../utils/request');
const { classifyBodyShape, calculateHealthMetrics } = require('../../utils/body-analysis.js');

// 参数名称映射表
const parameterNameMap = {
  acrossBackShoulderWidth: '背部肩宽',
  backNeckHeight: '后颈高度',
  backNeckPointToGroundContoured: '后颈点至地面高度',
  backNeckPointToWaist: '后颈点至腰围',
  backNeckPointToWristLengthR: '后颈点至右手腕长度',
  bellyWaistDepth: '腹部腰围深度',
  bellyWaistGirth: '腹部腰围',
  bellyWaistHeight: '腹部腰围高度',
  bellyWaistWidth: '腹部腰围宽度',
  bustGirth: '胸围',
  bustHeight: '胸围高度',
  calfGirthR: '右小腿围',
  forearmGirthR: '右前臂围',
  hipGirth: '臀围',
  hipHeight: '臀围高度',
  insideLegHeight: '右内腿高',
  insideLegLengthR: '右内腿长',
  kneeGirthR: '右膝围',
  kneeHeight: '膝盖高度',
  midThighGirthR: '右大腿中围',
  neckBaseGirth: '颈围',
  neckGirth: '脖围',
  outerAnkleHeightR: '右外踝高度',
  outerArmLengthR: '右外臂长',
  outseamR: '右外缝长',
  outsideLegLengthR: '右外腿长',
  shoulderToElbowR: '右肩至肘长',
  thighGirthR: '右大腿围',
  topHipGirth: '上臀围',
  topHipHeight: '上臀围高度',
  underBustGirth: '下胸围',
  upperArmGirth: '上臂围',
  waistGirth: '腰围',
  waistHeight: '腰围高度',
  wristGirthR: '右手腕围'
};

// 参数分类
const parameterCategories = {
  upperBody: ['acrossBackShoulderWidth', 'backNeckHeight', 'backNeckPointToWaist', 'backNeckPointToWristLengthR', 'bustGirth', 'bustHeight', 'neckBaseGirth', 'neckGirth', 'outerArmLengthR', 'shoulderToElbowR', 'underBustGirth', 'upperArmGirth', 'forearmGirthR', 'wristGirthR'],
  lowerBody: ['hipGirth', 'hipHeight', 'insideLegHeight', 'insideLegLengthR', 'kneeGirthR', 'kneeHeight', 'midThighGirthR', 'outerAnkleHeightR', 'outseamR', 'outsideLegLengthR', 'thighGirthR', 'calfGirthR'],
  waist: ['bellyWaistDepth', 'bellyWaistGirth', 'bellyWaistHeight', 'bellyWaistWidth', 'waistGirth', 'waistHeight', 'topHipGirth', 'topHipHeight']
};

Page({
  data: {
    measurements: [],
    loading: true,
    selectedMeasurement: null,
    frontAnnotatedUrl: '',  // 正面标注图URL
    sideAnnotatedUrl: '',   // 侧面标注图URL
    showDetails: false,     // 是否显示详情
    showImages: true,       // 是否显示图片（默认显示图片）
    bodyShape: null,
    healthMetrics: null,
    profile: null,
    categoryOpen: { upperBody: true, lowerBody: false, waist: false },
    currentImg: 'front',
    categories: {
      upperBody: { name: '上身尺寸', items: [] },
      lowerBody: { name: '下身尺寸', items: [] },
      waist: { name: '腰部尺寸', items: [] }
    }
  },
  
  onShow(){
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadProfile();
    this.fetchMeasurementData();
  },

  async loadProfile() {
    if (!wx.getStorageSync('token')) {
      this.setData({ profile: null });
      return;
    }
    try {
      const profile = await request('/auth/profile');
      this.setData({ profile });
    } catch (e) {
      this.setData({ profile: null });
    }
  },

  async fetchMeasurementData() {
    try {
      const res = await request('/measurement/history', {
        method: 'GET'
      });

      if (res && res.length > 0) {
        this.setData({
          measurements: res
        });
      } else {
        this.setData({
          measurements: []
        });
        wx.showToast({
          title: '暂无测量数据',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('获取测量数据失败:', error);
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  processMeasurementData(data) {
    if (!data || !data.details) return;
    
    const categorizedData = {
      upperBody: { name: '上身尺寸', items: [] },
      lowerBody: { name: '下身尺寸', items: [] },
      waist: { name: '腰部尺寸', items: [] }
    };

    data.details.forEach(item => {
      const measurement = {
        parameter_name: parameterNameMap[item.parameter_name] || item.parameter_name,
        value: item.value.toFixed(1)
      };

      // 根据参数名将数据分类
      for (const [category, params] of Object.entries(parameterCategories)) {
        if (params.includes(item.parameter_name)) {
          categorizedData[category].items.push(measurement);
          break;
        }
      }
    });

    this.setData({
      categories: categorizedData
    });
  },

  selectMeasurement(e) {
    const index = e.currentTarget.dataset.index;
    const measurement = this.data.measurements[index];
    
    // 获取基础URL（您的服务器地址）
    const baseUrl = 'http://127.0.0.1:8000'; // 替换为您的实际服务器地址
    
    // 设置完整的图片URL
    const frontAnnotatedUrl = measurement.front_annotated_image_url 
      ? baseUrl + measurement.front_annotated_image_url 
      : '';
    
    const sideAnnotatedUrl = measurement.side_annotated_image_url
      ? baseUrl + measurement.side_annotated_image_url
      : '';

    const bodyShape = classifyBodyShape(measurement.details);
    let healthMetrics = null;
    if (this.data.profile) {
      healthMetrics = calculateHealthMetrics({
        height: measurement.height,
        weight: this.data.profile.weight,
        age: this.data.profile.age,
        gender: this.data.profile.gender,
        details: measurement.details
      });
    }

    this.setData({
      frontAnnotatedUrl: frontAnnotatedUrl,
      sideAnnotatedUrl: sideAnnotatedUrl,
      selectedMeasurement: measurement,
      showDetails: true,
      showImages: true,
      bodyShape: bodyShape,
      healthMetrics: healthMetrics,
      categoryOpen: { upperBody: true, lowerBody: false, waist: false }
    });
    
    // 处理测量数据
    this.processMeasurementData(measurement);
  },

  handleShare() {
    if (!this.data.selectedMeasurement) {
      wx.showToast({
        title: '请先选择测量数据',
        icon: 'none'
      });
      return;
    }
  
    const measurementId = this.data.selectedMeasurement.id;
    wx.navigateTo({  
      url: `/pages/share/share?measurementId=${measurementId}`
    }); 
  },

  // 图片预览功能
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    
    wx.previewImage({
      current: url, // 当前显示图片的链接
      urls: [this.data.frontAnnotatedUrl, this.data.sideAnnotatedUrl].filter(item => item) // 所有需要预览的图片链接
    });
  },

  // 切换显示图片和尺寸列表
  toggleDetails() {
    this.setData({
      showImages: !this.data.showImages
    });
  },

  setFrontImg() {
    this.setData({ currentImg: 'front' });
  },

  setSideImg() {
    this.setData({ currentImg: 'side' });
  },

  navigateToRecommendation(){
    if (!this.data.selectedMeasurement) {
      wx.showToast({
        title: '请先选择测量数据',
        icon: 'none'
      });
      return;
    }
    
    // 将测量数据转换为适合推荐的格式
    const measurementData = {
      details: this.data.selectedMeasurement.details
    };
    
    wx.navigateTo({
      url: `/pages/clothing-size-recommendation/clothing-size-recommendation?data=${encodeURIComponent(JSON.stringify(measurementData))}`
    });
  },

  navigateToTrend() {
    wx.navigateTo({ url: '/pages/trend/trend' });
  },

  toggleCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ [`categoryOpen.${cat}`]: !this.data.categoryOpen[cat] });
  },

  backToList() {
    this.setData({
      showDetails: false,
      selectedMeasurement: null,
      showImages: true,
      categoryOpen: { upperBody: true, lowerBody: false, waist: false },
      categories: {
        upperBody: { name: '上身尺寸', items: [] },
        lowerBody: { name: '下身尺寸', items: [] },
        waist: { name: '腰部尺寸', items: [] }
      }
    });
  },

  generateReportCard() {
    if (!this.data.selectedMeasurement) {
      wx.showToast({ title: '请先选择测量数据', icon: 'none' });
      return;
    }
    const m = this.data.selectedMeasurement;
    const bodyShape = this.data.bodyShape || { name: '--', advice: '' };
    const hm = this.data.healthMetrics || {};
    const query = wx.createSelectorQuery();
    query.select('#reportCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const W = 600, H = 900;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
      ctx.fillStyle = '#F5F8FA'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2BB3A3'; ctx.fillRect(0, 0, W, 140);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 36px sans-serif'; ctx.fillText('AI 身体测量报告', 30, 80);
      ctx.fillStyle = '#1F2937'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('体型：' + bodyShape.name, 30, 200);
      ctx.font = '22px sans-serif'; ctx.fillStyle = '#6B7280'; ctx.fillText(bodyShape.advice.slice(0, 30), 30, 240);
      ctx.font = '26px sans-serif'; ctx.fillStyle = '#1F2937';
      ctx.fillText('身高 ' + m.height + ' cm', 30, 300);
      ctx.fillText('BMI ' + (hm.bmi || '--'), 30, 340);
      ctx.fillText('腰臀比 ' + (hm.whr || '--'), 30, 380);
      ctx.fillText('体脂率 ' + (hm.bodyFat !== null && hm.bodyFat !== undefined ? hm.bodyFat + '%' : '--'), 30, 420);
      ctx.fillText('测量日期 ' + m.created_at, 30, 480);
      ctx.fillStyle = '#9CA3AF'; ctx.font = '18px sans-serif';
      ctx.fillText('数据仅供参考，不代表医疗建议', 30, 860);
      wx.canvasToTempFilePath({
        canvas, success: (r) => {
          wx.saveImageToPhotosAlbum({
            filePath: r.tempFilePath,
            success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
            fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
          });
        }
      });
    });
  }
});