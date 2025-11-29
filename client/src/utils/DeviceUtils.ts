/**
 * 设备检测和适配工具类
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isHighDPI: boolean;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

export class DeviceUtils {
  /**
   * 检测设备信息
   */
  static detectDevice(): DeviceInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;

    // 检测移动设备
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isMobile = isMobileUA || screenWidth < 768;

    // 检测平板设备
    const isTablet = !isMobile && (screenWidth >= 768 && screenWidth < 1024);

    // 检测桌面设备
    const isDesktop = !isMobile && !isTablet;

    // 检测触摸支持
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // 检测高DPI屏幕
    const isHighDPI = devicePixelRatio > 1;

    // 检测屏幕方向
    const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      isHighDPI,
      devicePixelRatio,
      screenWidth,
      screenHeight,
      orientation,
    };
  }

  /**
   * 请求全屏（移动端）
   */
  static async requestFullscreen(element: HTMLElement): Promise<boolean> {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        return true;
      } else if ((element as any).webkitRequestFullscreen) {
        // Safari
        await (element as any).webkitRequestFullscreen();
        return true;
      } else if ((element as any).mozRequestFullScreen) {
        // Firefox
        await (element as any).mozRequestFullScreen();
        return true;
      } else if ((element as any).msRequestFullscreen) {
        // IE/Edge
        await (element as any).msRequestFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
      return false;
    }
  }

  /**
   * 退出全屏
   */
  static async exitFullscreen(): Promise<boolean> {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
        return true;
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
        return true;
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
      return false;
    }
  }

  /**
   * 检查是否处于全屏状态
   */
  static isFullscreen(): boolean {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  }

  /**
   * 锁定屏幕方向（移动端）
   */
  static async lockOrientation(orientation: 'portrait' | 'landscape'): Promise<boolean> {
    try {
      const screenOrientation = (screen as any).orientation;
      if (screenOrientation && screenOrientation.lock) {
        await screenOrientation.lock(orientation);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Screen orientation lock failed:', error);
      return false;
    }
  }

  /**
   * 解锁屏幕方向
   */
  static unlockOrientation(): void {
    try {
      const orientation = (screen as any).orientation;
      if (orientation && orientation.unlock) {
        orientation.unlock();
      }
    } catch (error) {
      console.warn('Screen orientation unlock failed:', error);
    }
  }

  /**
   * 防止移动端双击缩放
   */
  static preventDoubleTapZoom(element: HTMLElement): void {
    let lastTouchEnd = 0;
    element.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  /**
   * 获取视口安全区域
   */
  static getSafeAreaInsets(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
    };
  }

  /**
   * 获取推荐的Canvas渲染质量
   */
  static getRecommendedQuality(deviceInfo?: DeviceInfo): {
    scale: number;
    maxDPR: number;
    enableEffects: boolean;
  } {
    const info = deviceInfo || this.detectDevice();

    if (info.isMobile) {
      // 移动端：平衡性能和质量
      return {
        scale: 0.85, // 降低15%分辨率提升性能
        maxDPR: 2,   // 限制最大DPR
        enableEffects: false, // 禁用一些视觉效果
      };
    } else if (info.isTablet) {
      // 平板：中等质量
      return {
        scale: 0.9,
        maxDPR: 2,
        enableEffects: true,
      };
    } else {
      // 桌面：最高质量
      return {
        scale: 1.0,
        maxDPR: 3,
        enableEffects: true,
      };
    }
  }

  /**
   * 监听设备方向变化
   */
  static onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): () => void {
    const handler = () => {
      const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      callback(orientation);
    };

    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);

    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }

  /**
   * 检测设备性能等级（简单启发式）
   */
  static getPerformanceLevel(): 'low' | 'medium' | 'high' {
    const info = this.detectDevice();

    // 移动端一般性能较低
    if (info.isMobile) {
      return 'low';
    }

    // 检测CPU核心数（如果可用）
    const cores = navigator.hardwareConcurrency || 2;

    // 检测内存（如果可用）
    const memory = (navigator as any).deviceMemory || 4;

    if (cores >= 8 && memory >= 8) {
      return 'high';
    } else if (cores >= 4 && memory >= 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}
