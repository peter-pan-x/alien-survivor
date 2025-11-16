/**
 * 音效生成器
 * 负责使用Web Audio API生成各种游戏音效
 */

import { SoundType, SOUND_CONFIGS } from "./SoundConfig";

export class SoundEffectGenerator {
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  /**
   * 播放音效
   * @param type 音效类型
   * @param volumeMultiplier 音量倍数（0-1）
   */
  public playSound(type: SoundType, volumeMultiplier: number = 1.0): void {
    const config = SOUND_CONFIGS[type];
    if (!config) {
      console.warn(`[SoundEffectGenerator] Unknown sound type: ${type}`);
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = config.waveType;
      oscillator.frequency.setValueAtTime(
        config.frequency,
        this.audioContext.currentTime
      );

      // 设置音量包络
      const volume = config.volume * volumeMultiplier;
      const now = this.audioContext.currentTime;
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

      oscillator.start(now);
      oscillator.stop(now + config.duration);
    } catch (e) {
      console.warn(`[SoundEffectGenerator] Failed to play sound ${type}:`, e);
    }
  }

  /**
   * 播放自定义音效
   * @param config 音效配置
   * @param volumeMultiplier 音量倍数
   */
  public playCustomSound(
    config: {
      frequency: number;
      waveType: OscillatorType;
      duration: number;
      volume: number;
    },
    volumeMultiplier: number = 1.0
  ): void {
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = config.waveType;
      oscillator.frequency.setValueAtTime(
        config.frequency,
        this.audioContext.currentTime
      );

      const volume = config.volume * volumeMultiplier;
      const now = this.audioContext.currentTime;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);

      oscillator.start(now);
      oscillator.stop(now + config.duration);
    } catch (e) {
      console.warn("[SoundEffectGenerator] Failed to play custom sound:", e);
    }
  }
}

