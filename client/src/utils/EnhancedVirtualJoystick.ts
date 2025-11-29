import { Joystick } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import { responsiveManager } from "./ResponsiveManager";

export interface JoystickConfig {
  radius: number;
  deadZone: number;
  maxDistance: number;
  position: 'bottom-left' | 'bottom-center' | 'bottom-right';
  activationArea: 'bottom-half' | 'lower-third' | 'custom';
  customAreaHeight?: number;
  opacity: number;
  color: string;
  hapticFeedback: boolean;
  visualFeedback: boolean;
}

export class EnhancedVirtualJoystick {
  private joystick: Joystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    angle: 0,
    distance: 0,
  };

  private touchId: number | null = null;
  private canvas: HTMLCanvasElement;
  private canvasRect: DOMRect;
  private config: JoystickConfig;
  private isVibrationSupported: boolean;
  private lastUpdateTime: number = 0;
  private renderAnimation: number = 0;

  constructor(canvas: HTMLCanvasElement, customConfig?: Partial<JoystickConfig>) {
    this.canvas = canvas;
    this.canvasRect = canvas.getBoundingClientRect();
    this.isVibrationSupported = 'vibrate' in navigator;
    
    // 获取响应式配置
    const responsiveConfig = responsiveManager.getJoystickConfig();
    const deviceInfo = responsiveManager.getDeviceInfo();
    
    // 根据设备类型设置默认配置
    const defaultConfig: JoystickConfig = {
      radius: responsiveConfig.radius,
      deadZone: responsiveConfig.deadZone,
      maxDistance: responsiveConfig.maxDistance,
      position: responsiveConfig.position,
      activationArea: deviceInfo.isMobile ? 'lower-third' : 'bottom-half',
      opacity: 0.6,
      color: '#3b82f6',
      hapticFeedback: deviceInfo.isMobile,
      visualFeedback: true,
    };
    
    this.config = { ...defaultConfig, ...customConfig };
    this.setupEventListeners();
    
    // 监听设备变化
    window.addEventListener('devicechange' as any, this.handleDeviceChange.bind(this));
  }

  private setupEventListeners() {
    // 触摸事件
    this.canvas.addEventListener("touchstart", this.handleTouchStart.bind(this), { 
      passive: false,
      capture: true 
    });
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this), { 
      passive: false,
      capture: true 
    });
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this), { 
      passive: false,
      capture: true 
    });
    this.canvas.addEventListener("touchcancel", this.handleTouchEnd.bind(this), { 
      passive: false,
      capture: true 
    });

    // 鼠标事件（用于桌面测试）
    if (!responsiveManager.isTouchSupported()) {
      this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
      this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
      this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
      this.canvas.addEventListener("mouseleave", this.handleMouseUp.bind(this));
    }
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    
    // 只处理第一个触摸点
    if (this.touchId !== null) return;
    
    const touch = e.touches[0];
    this.touchId = touch.identifier;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // 检查是否在激活区域内
    if (this.isInActivationArea(x, y)) {
      this.activateJoystick(x, y);
      
      // 触觉反馈
      if (this.config.hapticFeedback && this.isVibrationSupported) {
        navigator.vibrate(10);
      }
    }
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    
    if (!this.joystick.active || this.touchId === null) return;
    
    // 找到对应的触摸点
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchId) {
        const touch = e.touches[i];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.updateJoystick(x, y);
        break;
      }
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    
    if (this.touchId === null) return;
    
    // 检查是否是当前的触摸点结束
    let found = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        found = true;
        break;
      }
    }
    
    if (found) {
      this.deactivateJoystick();
      this.touchId = null;
      
      // 触觉反馈
      if (this.config.hapticFeedback && this.isVibrationSupported) {
        navigator.vibrate(5);
      }
    }
  }

  private handleMouseDown(e: MouseEvent) {
    // 只在没有触摸输入时处理鼠标事件
    if (this.touchId !== null) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查是否在激活区域内
    if (this.isInActivationArea(x, y)) {
      this.activateJoystick(x, y);
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.joystick.active || this.touchId !== null) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.updateJoystick(x, y);
  }

  private handleMouseUp() {
    if (this.touchId !== null) return;
    this.deactivateJoystick();
  }

  /**
   * 检查是否在激活区域内
   */
  private isInActivationArea(x: number, y: number): boolean {
    const { height } = this.canvas;
    
    switch (this.config.activationArea) {
      case 'bottom-half':
        return y > height / 2;
      case 'lower-third':
        return y > (height * 2) / 3;
      case 'custom':
        return this.config.customAreaHeight ? y > this.config.customAreaHeight : y > height / 2;
      default:
        return y > height / 2;
    }
  }

  /**
   * 激活摇杆
   */
  private activateJoystick(x: number, y: number) {
    this.joystick.active = true;
    this.joystick.startX = x;
    this.joystick.startY = y;
    this.joystick.currentX = x;
    this.joystick.currentY = y;
    this.joystick.angle = 0;
    this.joystick.distance = 0;
    this.renderAnimation = 0;
  }

  /**
   * 更新摇杆状态
   */
  private updateJoystick(x: number, y: number) {
    const dx = x - this.joystick.startX;
    const dy = y - this.joystick.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 限制最大距离
    const maxDistance = this.config.maxDistance;
    const clampedDistance = Math.min(distance, maxDistance);
    
    this.joystick.currentX = x;
    this.joystick.currentY = y;
    this.joystick.distance = clampedDistance;
    this.joystick.angle = Math.atan2(dy, dx);
    
    // 视觉反馈
    if (this.config.visualFeedback && distance > this.config.deadZone) {
      const intensity = Math.min(1, distance / maxDistance);
      if (this.isVibrationSupported && this.touchId !== null) {
        // 轻微的持续振动反馈
        const now = Date.now();
        if (now - this.lastUpdateTime > 100) {
          navigator.vibrate(Math.floor(intensity * 5));
          this.lastUpdateTime = now;
        }
      }
    }
    
    this.renderAnimation = Math.min(1, this.renderAnimation + 0.1);
  }

  /**
   * 停用摇杆
   */
  private deactivateJoystick() {
    this.joystick.active = false;
    this.joystick.distance = 0;
    this.renderAnimation = 0;
  }

  /**
   * 处理设备变化
   */
  private handleDeviceChange(e: CustomEvent) {
    const { config: newConfig } = e.detail;
    const responsiveConfig = responsiveManager.getJoystickConfig();
    
    // 更新配置
    this.config.radius = responsiveConfig.radius;
    this.config.deadZone = responsiveConfig.deadZone;
    this.config.maxDistance = responsiveConfig.maxDistance;
    this.config.position = responsiveConfig.position;
    
    // 更新画布矩形
    this.updateCanvasRect();
  }

  /**
   * 获取摇杆状态
   */
  public getJoystick(): Joystick {
    return { ...this.joystick };
  }

  /**
   * 获取移动向量（考虑死区）
   */
  public getMovementVector(): { x: number; y: number } {
    if (!this.joystick.active || this.joystick.distance === 0) {
      return { x: 0, y: 0 };
    }
    
    // 应用死区
    const effectiveDistance = Math.max(0, this.joystick.distance - this.config.deadZone);
    const maxEffectiveDistance = this.config.maxDistance - this.config.deadZone;
    
    if (effectiveDistance === 0) {
      return { x: 0, y: 0 };
    }
    
    // 归一化距离 (0-1)
    const normalizedDistance = effectiveDistance / maxEffectiveDistance;
    
    // 应用缓动函数（非线性响应）
    const easedDistance = this.applyEasing(normalizedDistance);
    
    return {
      x: Math.cos(this.joystick.angle) * easedDistance,
      y: Math.sin(this.joystick.angle) * easedDistance,
    };
  }

  /**
   * 应用缓动函数
   */
  private applyEasing(value: number): number {
    // 使用二次缓动，让控制更加平滑
    return value * value;
  }

  /**
   * 渲染摇杆
   */
  public render(ctx: CanvasRenderingContext2D) {
    if (!this.joystick.active) return;
    
    const { startX, startY, currentX, currentY } = this.joystick;
    
    // 计算内圈位置（限制在外圈内）
    const dx = currentX - startX;
    const dy = currentY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = this.config.maxDistance;
    
    let innerX = currentX;
    let innerY = currentY;
    
    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      innerX = startX + Math.cos(angle) * maxDistance;
      innerY = startY + Math.sin(angle) * maxDistance;
    }
    
    ctx.save();
    
    // 应用动画
    const animatedOpacity = this.config.opacity * this.renderAnimation;
    ctx.globalAlpha = animatedOpacity;
    
    // 绘制外圈（带渐变）
    const gradient = ctx.createRadialGradient(startX, startY, 0, startX, startY, this.config.radius);
    gradient.addColorStop(0, this.config.color + '00');
    gradient.addColorStop(0.7, this.config.color + '22');
    gradient.addColorStop(1, this.config.color + '44');
    
    ctx.beginPath();
    ctx.arc(startX, startY, this.config.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // 绘制外圈边框
    ctx.beginPath();
    ctx.arc(startX, startY, this.config.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.config.color + '88';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制方向指示器
    if (distance > this.config.deadZone) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const indicatorLength = this.config.radius * 0.8;
      ctx.lineTo(
        startX + Math.cos(this.joystick.angle) * indicatorLength,
        startY + Math.sin(this.joystick.angle) * indicatorLength
      );
      ctx.strokeStyle = this.config.color + 'aa';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // 绘制内圈（带发光效果）
    const innerGradient = ctx.createRadialGradient(innerX, innerY, 0, innerX, innerY, this.config.radius * 0.4);
    innerGradient.addColorStop(0, this.config.color);
    innerGradient.addColorStop(1, this.config.color + '88');
    
    ctx.beginPath();
    ctx.arc(innerX, innerY, this.config.radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();
    
    // 内圈边框
    ctx.beginPath();
    ctx.arc(innerX, innerY, this.config.radius * 0.4, 0, Math.PI * 2);
    ctx.strokeStyle = this.config.color + 'ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * 更新画布矩形
   */
  public updateCanvasRect() {
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<JoystickConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 设置是否启用
   */
  public setEnabled(enabled: boolean) {
    if (!enabled) {
      this.deactivateJoystick();
      this.touchId = null;
    }
  }

  /**
   * 销毁摇杆
   */
  public destroy() {
    // 移除事件监听器
    this.canvas.removeEventListener("touchstart", this.handleTouchStart.bind(this));
    this.canvas.removeEventListener("touchmove", this.handleTouchMove.bind(this));
    this.canvas.removeEventListener("touchend", this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener("touchcancel", this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.removeEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.removeEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.removeEventListener("mouseleave", this.handleMouseUp.bind(this));
    
    // 移除设备变化监听器
    window.removeEventListener('devicechange' as any, this.handleDeviceChange.bind(this));
    
    // 清理状态
    this.deactivateJoystick();
    this.touchId = null;
  }
}