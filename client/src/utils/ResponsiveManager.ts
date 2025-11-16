/**
 * 响应式设计管理器
 * 负责处理不同设备和屏幕尺寸的自适应
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
}

export interface ResponsiveConfig {
  canvasScale: number;
  uiScale: number;
  touchAreaSize: number;
  buttonSize: number;
  fontSize: {
    small: number;
    medium: number;
    large: number;
    title: number;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

export class ResponsiveManager {
  private deviceInfo: DeviceInfo;
  private config: ResponsiveConfig;
  private breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
  };

  constructor() {
    this.deviceInfo = this.detectDevice();
    this.config = this.generateConfig();
    
    // 监听窗口变化
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
  }

  /**
   * 检测设备类型
   */
  private detectDevice(): DeviceInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // 检测移动设备
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                     (screenWidth < this.breakpoints.mobile);
    
    // 检测平板设备
    const isTablet = !isMobile && (screenWidth >= this.breakpoints.mobile && screenWidth < this.breakpoints.desktop);
    
    // 检测桌面设备
    const isDesktop = !isMobile && !isTablet;
    
    // 检测屏幕方向
    const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      screenWidth,
      screenHeight,
      devicePixelRatio,
      orientation,
    };
  }

  /**
   * 根据设备信息生成配置
   */
  private generateConfig(): ResponsiveConfig {
    const { isMobile, isTablet, isDesktop, screenWidth, screenHeight, devicePixelRatio } = this.deviceInfo;
    
    if (isMobile) {
      return {
        canvasScale: 1.0,
        uiScale: Math.min(screenWidth, screenHeight) / 375, // 基于 iPhone X 的基准
        touchAreaSize: Math.max(44, Math.floor(screenWidth * 0.12)), // 最小 44px
        buttonSize: Math.max(48, Math.floor(screenWidth * 0.14)),
        fontSize: {
          small: 12,
          medium: 14,
          large: 16,
          title: Math.max(24, Math.floor(screenWidth * 0.064)),
        },
        spacing: {
          small: 8,
          medium: 12,
          large: 16,
        },
      };
    } else if (isTablet) {
      return {
        canvasScale: 1.2,
        uiScale: Math.min(screenWidth, screenHeight) / 768, // 基于 iPad 的基准
        touchAreaSize: 48,
        buttonSize: 56,
        fontSize: {
          small: 14,
          medium: 16,
          large: 18,
          title: 32,
        },
        spacing: {
          small: 12,
          medium: 16,
          large: 20,
        },
      };
    } else {
      // 桌面设备
      return {
        canvasScale: 1.0,
        uiScale: 1.0,
        touchAreaSize: 44,
        buttonSize: 48,
        fontSize: {
          small: 14,
          medium: 16,
          large: 18,
          title: 36,
        },
        spacing: {
          small: 12,
          medium: 16,
          large: 24,
        },
      };
    }
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize(): void {
    const oldInfo = { ...this.deviceInfo };
    this.deviceInfo = this.detectDevice();
    this.config = this.generateConfig();
    
    // 如果设备类型发生变化，触发自定义事件
    if (oldInfo.isMobile !== this.deviceInfo.isMobile || 
        oldInfo.orientation !== this.deviceInfo.orientation) {
      window.dispatchEvent(new CustomEvent('devicechange', {
        detail: {
          oldInfo,
          newInfo: this.deviceInfo,
          config: this.config,
        }
      }));
    }
  }

  /**
   * 处理屏幕方向变化
   */
  private handleOrientationChange(): void {
    setTimeout(() => {
      this.handleResize();
    }, 100); // 延迟处理，等待浏览器完成方向切换
  }

  /**
   * 获取设备信息
   */
  public getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  /**
   * 获取响应式配置
   */
  public getConfig(): ResponsiveConfig {
    return { ...this.config };
  }

  /**
   * 获取画布尺寸
   */
  public getCanvasSize(): { width: number; height: number } {
    const { screenWidth, screenHeight, isMobile } = this.deviceInfo;
    const { canvasScale } = this.config;
    
    if (isMobile) {
      // 移动设备：全屏显示
      return {
        width: screenWidth * canvasScale,
        height: screenHeight * canvasScale,
      };
    } else {
      // 桌面设备：限制最大尺寸
      const maxWidth = Math.min(screenWidth * 0.9, 1200) * canvasScale;
      const maxHeight = Math.min(screenHeight * 0.85, 800) * canvasScale;
      
      return {
        width: maxWidth,
        height: maxHeight,
      };
    }
  }

  /**
   * 获取虚拟摇杆配置
   */
  public getJoystickConfig(): {
    radius: number;
    deadZone: number;
    maxDistance: number;
    position: 'bottom-left' | 'bottom-center' | 'bottom-right';
  } {
    const { isMobile, isTablet, screenWidth, screenHeight } = this.deviceInfo;
    const { touchAreaSize } = this.config;
    
    return {
      radius: touchAreaSize,
      deadZone: touchAreaSize * 0.2,
      maxDistance: touchAreaSize * 0.8,
      position: isMobile ? 'bottom-left' : (isTablet ? 'bottom-center' : 'bottom-left'),
    };
  }

  /**
   * 获取UI布局配置
   */
  public getUILayoutConfig(): {
    headerHeight: number;
    footerHeight: number;
    sidePadding: number;
    cardPadding: number;
  } {
    const { isMobile, isTablet } = this.deviceInfo;
    const { spacing } = this.config;
    
    return {
      headerHeight: isMobile ? 60 : 80,
      footerHeight: isMobile ? 80 : 100,
      sidePadding: isMobile ? spacing.medium : spacing.large,
      cardPadding: isMobile ? spacing.large : spacing.large * 2,
    };
  }

  /**
   * 应用CSS变量到根元素
   */
  public applyCSSVariables(): void {
    const root = document.documentElement;
    const { fontSize, spacing } = this.config;
    
    root.style.setProperty('--font-size-small', `${fontSize.small}px`);
    root.style.setProperty('--font-size-medium', `${fontSize.medium}px`);
    root.style.setProperty('--font-size-large', `${fontSize.large}px`);
    root.style.setProperty('--font-size-title', `${fontSize.title}px`);
    
    root.style.setProperty('--spacing-small', `${spacing.small}px`);
    root.style.setProperty('--spacing-medium', `${spacing.medium}px`);
    root.style.setProperty('--spacing-large', `${spacing.large}px`);
    
    const { buttonSize, touchAreaSize } = this.config;
    root.style.setProperty('--button-size', `${buttonSize}px`);
    root.style.setProperty('--touch-area-size', `${touchAreaSize}px`);
  }

  /**
   * 检查是否支持触摸
   */
  public isTouchSupported(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * 检查是否为高DPI设备
   */
  public isHighDPIDevice(): boolean {
    return this.deviceInfo.devicePixelRatio > 1;
  }

  /**
   * 获取安全区域（用于刘海屏等）
   */
  public getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
    };
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));
  }
}

// 创建全局单例实例
export const responsiveManager = new ResponsiveManager();