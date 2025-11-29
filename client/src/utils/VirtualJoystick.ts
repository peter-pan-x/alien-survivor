import { Joystick } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";

export class VirtualJoystick {
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
  private isMobile: boolean;

  // 绑定的事件处理函数引用（用于正确移除监听器）
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;
  private boundHandleTouchEnd: (e: TouchEvent) => void;
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvasRect = canvas.getBoundingClientRect();
    
    // 检测是否为移动设备
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || ('ontouchstart' in window) 
      || (navigator.maxTouchPoints > 0);
    
    // 预绑定事件处理函数
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    
    this.setupEventListeners();
    
    console.log('[VirtualJoystick] Initialized, isMobile:', this.isMobile);
  }

  private setupEventListeners() {
    // 触摸事件 - 使用 document 级别监听以确保捕获所有触摸
    document.addEventListener("touchstart", this.boundHandleTouchStart, { passive: false });
    document.addEventListener("touchmove", this.boundHandleTouchMove, { passive: false });
    document.addEventListener("touchend", this.boundHandleTouchEnd, { passive: false });
    document.addEventListener("touchcancel", this.boundHandleTouchEnd, { passive: false });

    // 鼠标事件（用于桌面测试）
    this.canvas.addEventListener("mousedown", this.boundHandleMouseDown);
    this.canvas.addEventListener("mousemove", this.boundHandleMouseMove);
    this.canvas.addEventListener("mouseup", this.boundHandleMouseUp);
    this.canvas.addEventListener("mouseleave", this.boundHandleMouseUp);
  }

  private handleTouchStart(e: TouchEvent) {
    // 只处理第一个触摸点
    if (this.touchId !== null) return;
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // 检查触摸是否在 canvas 范围内
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      return;
    }
    
    // 移动端：左半屏幕区域用于移动控制
    // 桌面端：下半部分用于移动控制
    const isValidArea = this.isMobile 
      ? (x < rect.width * 0.6)  // 移动端：左侧60%区域
      : (y > rect.height / 2);   // 桌面端：下半部分
    
    if (isValidArea) {
      e.preventDefault();
      this.touchId = touch.identifier;
      this.activateJoystick(x, y);
      console.log('[VirtualJoystick] Touch started at:', x, y);
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (!this.joystick.active || this.touchId === null) return;
    
    // 找到对应的触摸点
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchId) {
        e.preventDefault(); // 只在找到对应触摸点时阻止默认行为
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
    if (this.touchId === null) return;
    
    // 检查是否是当前的触摸点结束
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        this.deactivateJoystick();
        this.touchId = null;
        console.log('[VirtualJoystick] Touch ended');
        break;
      }
    }
  }

  private handleMouseDown(e: MouseEvent) {
    // 只在没有触摸输入时处理鼠标事件
    if (this.touchId !== null) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 只在屏幕下半部分激活摇杆
    if (y > this.canvas.height / 2) {
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

  private activateJoystick(x: number, y: number) {
    this.joystick.active = true;
    this.joystick.startX = x;
    this.joystick.startY = y;
    this.joystick.currentX = x;
    this.joystick.currentY = y;
    this.joystick.angle = 0;
    this.joystick.distance = 0;
  }

  private updateJoystick(x: number, y: number) {
    const dx = x - this.joystick.startX;
    const dy = y - this.joystick.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 限制最大距离
    const maxDistance = GAME_CONFIG.JOYSTICK.MAX_DISTANCE;
    const clampedDistance = Math.min(distance, maxDistance);
    
    this.joystick.currentX = x;
    this.joystick.currentY = y;
    this.joystick.distance = clampedDistance;
    this.joystick.angle = Math.atan2(dy, dx);
  }

  private deactivateJoystick() {
    this.joystick.active = false;
    this.joystick.distance = 0;
  }

  public getJoystick(): Joystick {
    return { ...this.joystick };
  }

  public getMovementVector(): { x: number; y: number } {
    if (!this.joystick.active || this.joystick.distance === 0) {
      return { x: 0, y: 0 };
    }
    
    // 归一化距离 (0-1)
    const normalizedDistance = this.joystick.distance / GAME_CONFIG.JOYSTICK.MAX_DISTANCE;
    
    return {
      x: Math.cos(this.joystick.angle) * normalizedDistance,
      y: Math.sin(this.joystick.angle) * normalizedDistance,
    };
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.joystick.active) return;
    
    const { OUTER_RADIUS, INNER_RADIUS, OPACITY, COLOR } = GAME_CONFIG.JOYSTICK;
    const { startX, startY, currentX, currentY } = this.joystick;
    
    // 计算内圈位置（限制在外圈内）
    const dx = currentX - startX;
    const dy = currentY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = GAME_CONFIG.JOYSTICK.MAX_DISTANCE;
    
    let innerX = currentX;
    let innerY = currentY;
    
    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      innerX = startX + Math.cos(angle) * maxDistance;
      innerY = startY + Math.sin(angle) * maxDistance;
    }
    
    ctx.save();
    ctx.globalAlpha = OPACITY;
    
    // 绘制外圈
    ctx.beginPath();
    ctx.arc(startX, startY, OUTER_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = COLOR;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = `${COLOR}22`;
    ctx.fill();
    
    // 绘制内圈
    ctx.beginPath();
    ctx.arc(innerX, innerY, INNER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLOR;
    ctx.fill();
    
    ctx.restore();
  }

  public updateCanvasRect() {
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  public destroy() {
    // 使用预绑定的函数引用移除监听器
    document.removeEventListener("touchstart", this.boundHandleTouchStart);
    document.removeEventListener("touchmove", this.boundHandleTouchMove);
    document.removeEventListener("touchend", this.boundHandleTouchEnd);
    document.removeEventListener("touchcancel", this.boundHandleTouchEnd);
    this.canvas.removeEventListener("mousedown", this.boundHandleMouseDown);
    this.canvas.removeEventListener("mousemove", this.boundHandleMouseMove);
    this.canvas.removeEventListener("mouseup", this.boundHandleMouseUp);
    this.canvas.removeEventListener("mouseleave", this.boundHandleMouseUp);
    console.log('[VirtualJoystick] Destroyed');
  }
}

