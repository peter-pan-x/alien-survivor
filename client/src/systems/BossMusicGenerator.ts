/**
 * Boss战斗音乐生成器
 * 负责生成和播放紧张、急促的Boss战斗背景音乐
 * 使用小调和快速节奏营造压迫感
 */

import { BossMusicConfig, BOSS_MELODY, BOSS_MUSIC_CONFIG } from "./SoundConfig";

export class BossMusicGenerator {
  private audioContext: AudioContext;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private config: BossMusicConfig;
  private musicBuffer: AudioBuffer | null = null;

  constructor(
    audioContext: AudioContext,
    config: BossMusicConfig = BOSS_MUSIC_CONFIG
  ) {
    this.audioContext = audioContext;
    this.config = config;
    this.generateMusicBuffer();
  }

  /**
   * 生成Boss战斗音乐AudioBuffer
   */
  private generateMusicBuffer(): void {
    try {
      // 计算总时长
      const totalDuration = BOSS_MELODY.reduce((sum, note) => sum + note.duration, 0);
      const sampleRate = this.audioContext.sampleRate;
      const frameCount = Math.floor(sampleRate * totalDuration);
      
      // 创建立体声buffer
      const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);
      
      let currentFrame = 0;
      
      // 生成每个音符
      for (const note of BOSS_MELODY) {
        const noteFrames = Math.floor(sampleRate * note.duration);
        const endFrame = Math.min(currentFrame + noteFrames, frameCount);
        
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const channelData = buffer.getChannelData(channel);
          
          for (let i = currentFrame; i < endFrame; i++) {
            const t = (i - currentFrame) / sampleRate;
            const noteT = t % note.duration;
            
            // Boss音乐使用锯齿波营造更紧张的感觉
            const phase = 2 * Math.PI * note.note * noteT;
            let wave = 0;
            
            // 主波形 - 锯齿波
            const sawtoothPhase = (phase / (2 * Math.PI)) % 1;
            wave = (sawtoothPhase - 0.5) * 2;
            
            // 添加轻微失真效果增加紧张感
            wave = Math.tanh(wave * 1.2);
            
            // 快速包络（更短的攻击和释放）
            let envelope = 1;
            const attackTime = 0.005; // 5ms快速攻击
            const releaseTime = 0.01; // 10ms快速释放
            const sustainTime = note.duration - attackTime - releaseTime;
            
            if (noteT < attackTime) {
              envelope = noteT / attackTime;
            } else if (noteT > attackTime + sustainTime) {
              const releaseProgress = (noteT - attackTime - sustainTime) / releaseTime;
              envelope = 1 - releaseProgress;
            }
            
            // 添加轻微的震音效果（tremolo）增加紧张感
            const tremoloFreq = 4; // 4Hz震音
            const tremoloDepth = 0.3;
            const tremolo = 1 + tremoloDepth * Math.sin(2 * Math.PI * tremoloFreq * noteT);
            
            // 应用所有效果
            const finalWave = wave * envelope * tremolo * 0.18; // 稍高的音量
            channelData[i] = finalWave;
          }
        }
        
        currentFrame = endFrame;
      }
      
      this.musicBuffer = buffer;
    } catch (e) {
      console.warn("[BossMusicGenerator] Failed to generate Boss music buffer:", e);
    }
  }

  /**
   * 开始播放Boss战斗音乐
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
      console.warn("[BossMusicGenerator] Boss music buffer not available");
      return;
    }

    this.isPlaying = true;
    this.playLoop(volume);
  }

  /**
   * 停止播放Boss战斗音乐
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
  public updateConfig(config: Partial<BossMusicConfig>): void {
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
      console.warn("[BossMusicGenerator] Failed to play Boss music:", e);
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