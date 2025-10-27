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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvasRect = canvas.getBoundingClientRect();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // 触摸事件
    this.canvas.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener("touchcancel", this.handleTouchEnd.bind(this), { passive: false });

    // 鼠标事件（用于桌面测试）
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseUp.bind(this));
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
    
    // 只在屏幕下半部分激活摇杆
    if (y > this.canvas.height / 2) {
      this.activateJoystick(x, y);
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
    this.canvas.removeEventListener("touchstart", this.handleTouchStart.bind(this));
    this.canvas.removeEventListener("touchmove", this.handleTouchMove.bind(this));
    this.canvas.removeEventListener("touchend", this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener("touchcancel", this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.removeEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.removeEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.removeEventListener("mouseleave", this.handleMouseUp.bind(this));
  }
}

