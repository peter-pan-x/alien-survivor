/**
 * 音频系统
 * 独立模块，统一管理背景音乐和音效
 * 便于后期调整和优化
 */

import { SoundEffectGenerator } from "./SoundEffectGenerator";
import { BackgroundMusicGenerator } from "./BackgroundMusicGenerator";
import { SoundType, AUDIO_DEFAULT_SETTINGS } from "./SoundConfig";

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  soundVolume: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

/**
 * 音频系统主类
 * 提供统一的音频管理接口
 */
export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private soundGenerator: SoundEffectGenerator | null = null;
  private musicGenerator: BackgroundMusicGenerator | null = null;
  
  private settings: AudioSettings;
  private lastSoundTime: Map<string, number> = new Map();

  constructor(settings: Partial<AudioSettings> = {}) {
    this.settings = {
      ...AUDIO_DEFAULT_SETTINGS,
      ...settings,
    };
    this.initAudioContext();
  }

  /**
   * 初始化AudioContext
   */
  private initAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        this.soundGenerator = new SoundEffectGenerator(this.audioContext);
        this.musicGenerator = new BackgroundMusicGenerator(this.audioContext);
      }
    } catch (e) {
      console.warn("[AudioSystem] Web Audio API not supported:", e);
    }
  }

  /**
   * 确保AudioContext已激活（需要用户交互）
   */
  private async ensureAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * 播放背景音乐
   * @param loop 是否循环
   */
  public async playBackgroundMusic(loop: boolean = true): Promise<void> {
    if (!this.musicEnabled) return;

    await this.ensureAudioContext();
    
    if (!this.musicGenerator) {
      console.warn("[AudioSystem] Music generator not available");
      return;
    }

    if (loop) {
      this.musicGenerator.updateConfig({ loop: true });
    }

    const volume = this.settings.musicVolume * this.settings.masterVolume;
    this.musicGenerator.start(volume);
  }

  /**
   * 停止背景音乐
   */
  public stopBackgroundMusic(): void {
    if (this.musicGenerator) {
      this.musicGenerator.stop();
    }
  }

  /**
   * 播放音效
   * @param type 音效类型
   */
  public async playSound(type: SoundType): Promise<void> {
    if (!this.soundEnabled) return;

    // 防止音效过于频繁
    const now = Date.now();
    const lastTime = this.lastSoundTime.get(type) || 0;
    if (now - lastTime < AUDIO_DEFAULT_SETTINGS.soundCooldown) {
      return;
    }
    this.lastSoundTime.set(type, now);

    await this.ensureAudioContext();
    
    if (!this.soundGenerator) {
      return;
    }

    const volume = this.settings.soundVolume * this.settings.masterVolume;
    this.soundGenerator.playSound(type, volume);
  }

  /**
   * 设置主音量
   */
  public setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolume();
  }

  /**
   * 设置音乐音量
   */
  public setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolume();
  }

  /**
   * 更新音乐音量
   */
  private updateMusicVolume(): void {
    if (this.musicGenerator) {
      const volume = this.settings.musicVolume * this.settings.masterVolume;
      this.musicGenerator.setVolume(volume);
    }
  }

  /**
   * 设置音效音量
   */
  public setSoundVolume(volume: number): void {
    this.settings.soundVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 启用/禁用音效
   */
  public setSoundEnabled(enabled: boolean): void {
    this.settings.soundEnabled = enabled;
  }

  /**
   * 启用/禁用音乐
   */
  public setMusicEnabled(enabled: boolean): void {
    this.settings.musicEnabled = enabled;
    if (!enabled && this.musicGenerator) {
      this.musicGenerator.stop();
    } else if (enabled && this.musicGenerator && !this.musicGenerator.getIsPlaying()) {
      this.playBackgroundMusic();
    }
  }

  /**
   * 获取当前设置
   */
  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * 更新设置
   */
  public updateSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.updateMusicVolume();
  }

  /**
   * 获取音效生成器（用于高级用法）
   */
  public getSoundGenerator(): SoundEffectGenerator | null {
    return this.soundGenerator;
  }

  /**
   * 获取音乐生成器（用于高级用法）
   */
  public getMusicGenerator(): BackgroundMusicGenerator | null {
    return this.musicGenerator;
  }

  // 便捷属性访问器
  get masterVolume(): number {
    return this.settings.masterVolume;
  }

  get musicVolume(): number {
    return this.settings.musicVolume;
  }

  get soundVolume(): number {
    return this.settings.soundVolume;
  }

  get soundEnabled(): boolean {
    return this.settings.soundEnabled;
  }

  get musicEnabled(): boolean {
    return this.settings.musicEnabled;
  }
}

