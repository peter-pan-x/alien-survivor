/**
 * 背景音乐生成器
 * 负责生成和播放8-bit风格的背景音乐
 * 使用AudioBuffer生成平滑循环的音乐
 */

import { BackgroundMusicConfig, BACKGROUND_MUSIC_CONFIG, BACKGROUND_MELODY } from "./SoundConfig";

export class BackgroundMusicGenerator {
  private audioContext: AudioContext;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private config: BackgroundMusicConfig;
  private musicBuffer: AudioBuffer | null = null;

  constructor(
    audioContext: AudioContext,
    config: BackgroundMusicConfig = BACKGROUND_MUSIC_CONFIG
  ) {
    this.audioContext = audioContext;
    this.config = config;
    this.generateMusicBuffer();
  }

  /**
   * 生成音乐AudioBuffer
   */
  private generateMusicBuffer(): void {
    try {
      // 计算总时长
      const totalDuration = BACKGROUND_MELODY.reduce((sum, note) => sum + note.duration, 0);
      const sampleRate = this.audioContext.sampleRate;
      const frameCount = Math.floor(sampleRate * totalDuration);
      
      // 创建立体声buffer
      const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);
      
      let currentFrame = 0;
      
      // 生成每个音符
      for (const note of BACKGROUND_MELODY) {
        const noteFrames = Math.floor(sampleRate * note.duration);
        const endFrame = Math.min(currentFrame + noteFrames, frameCount);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          
          for (let i = currentFrame; i < endFrame; i++) {
            const t = (i - currentFrame) / sampleRate;
            const noteT = t % note.duration;
            
            // 生成方波（8-bit风格）
            const phase = 2 * Math.PI * note.note * noteT;
            const squareWave = Math.sin(phase) > 0 ? 1 : -1;
            
            // 添加包络（淡入淡出，避免咔嗒声）
            let envelope = 1;
            const attackTime = 0.01; // 10ms攻击
            const releaseTime = 0.02; // 20ms释放
            const sustainTime = note.duration - attackTime - releaseTime;
            
            if (noteT < attackTime) {
              envelope = noteT / attackTime; // 淡入
            } else if (noteT > attackTime + sustainTime) {
              const releaseProgress = (noteT - attackTime - sustainTime) / releaseTime;
              envelope = 1 - releaseProgress; // 淡出
            }
            
            // 应用包络和音量
            channelData[i] = squareWave * envelope * 0.15;
          }
        }
        
        currentFrame = endFrame;
      }
      
      this.musicBuffer = buffer;
    } catch (e) {
      console.warn("[BackgroundMusicGenerator] Failed to generate music buffer:", e);
    }
  }

  /**
   * 开始播放背景音乐
   * @param volume 音量（0-1）
   */
  public start(volume: number = 1.0): void {
    if (this.isPlaying) {
      this.stop();
    }

    if (!this.musicBuffer) {
      this.generateMusicBuffer();
    }

    if (!this.musicBuffer) {
      console.warn("[BackgroundMusicGenerator] Music buffer not available");
      return;
    }

    this.isPlaying = true;
    this.playLoop(volume);
  }

  /**
   * 停止播放背景音乐
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // 忽略已停止的错误
      }
      this.currentSource = null;
    }
    if (this.currentGain) {
      this.currentGain.disconnect();
      this.currentGain = null;
    }
  }

  /**
   * 设置音量
   * @param volume 音量（0-1）
   */
  public setVolume(volume: number): void {
    if (this.currentGain) {
      this.currentGain.gain.value = this.config.baseVolume * volume;
    }
  }

  /**
   * 更新配置
   * @param config 新的配置
   */
  public updateConfig(config: Partial<BackgroundMusicConfig>): void {
    this.config = { ...this.config, ...config };
    this.generateMusicBuffer(); // 重新生成音乐
  }

  /**
   * 播放音乐循环
   * @param volume 音量
   */
  private playLoop(volume: number): void {
    if (!this.isPlaying || !this.musicBuffer) return;

    try {
      // 创建增益节点控制音量
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = this.config.baseVolume * volume;
      gainNode.connect(this.audioContext.destination);

      // 创建AudioBufferSourceNode
      const source = this.audioContext.createBufferSource();
      source.buffer = this.musicBuffer;
      source.loop = this.config.loop;
      source.connect(gainNode);

      // 播放
      source.start(0);

      this.currentSource = source;
      this.currentGain = gainNode;

      // 监听播放结束（如果未循环）
      if (!this.config.loop) {
        source.onended = () => {
          this.isPlaying = false;
          this.currentSource = null;
          this.currentGain = null;
        };
      }
    } catch (e) {
      console.warn("[BackgroundMusicGenerator] Failed to play music:", e);
      this.isPlaying = false;
    }
  }

  /**
   * 检查是否正在播放
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

