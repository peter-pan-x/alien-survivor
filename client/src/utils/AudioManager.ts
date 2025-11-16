/**
 * 音频管理器
 * 负责背景音乐和音效的播放
 * 使用Web Audio API生成音效，也支持加载外部音频文件
 */

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private masterVolume: number = 0.7;
  private musicVolume: number = 0.5;
  private soundVolume: number = 0.8;
  private lastSoundTime: Map<string, number> = new Map();
  private soundCooldown: number = 50; // 防止音效过于频繁

  constructor() {
    // 延迟初始化AudioContext（需要用户交互）
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
      }
    } catch (e) {
      console.warn("[AudioManager] Web Audio API not supported:", e);
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

  private backgroundMusicSource: AudioBufferSourceNode | null = null;
  private backgroundMusicGain: GainNode | null = null;
  private isPlayingMusic: boolean = false;

  /**
   * 播放背景音乐
   */
  public async playBackgroundMusic(loop: boolean = true): Promise<void> {
    if (!this.musicEnabled) return;

    // 如果已有背景音乐在播放，先停止
    if (this.isPlayingMusic) {
      this.stopBackgroundMusic();
    }

    await this.ensureAudioContext();
    
    if (!this.audioContext) {
      console.warn("[AudioManager] AudioContext not available");
      return;
    }

    // 生成简单的8-bit风格背景音乐
    this.startBackgroundMusicLoop(loop);
  }

  /**
   * 停止背景音乐
   */
  public stopBackgroundMusic(): void {
    if (this.backgroundMusicSource) {
      try {
        this.backgroundMusicSource.stop();
      } catch (e) {
        // 忽略已停止的错误
      }
      this.backgroundMusicSource = null;
    }
    if (this.backgroundMusicGain) {
      this.backgroundMusicGain.disconnect();
      this.backgroundMusicGain = null;
    }
    this.isPlayingMusic = false;
  }

  /**
   * 启动背景音乐循环
   */
  private startBackgroundMusicLoop(loop: boolean): void {
    if (!this.audioContext) return;

    try {
      const playMusic = () => {
        if (!this.audioContext || !this.musicEnabled) return;

        // 创建增益节点控制音量
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.musicVolume * this.masterVolume * 0.2;
        gainNode.connect(this.audioContext.destination);

        // 创建主旋律振荡器
        const osc1 = this.audioContext.createOscillator();
        osc1.type = "square";
        osc1.frequency.value = 220; // A3
        osc1.connect(gainNode);

        // 创建低音振荡器
        const osc2 = this.audioContext.createOscillator();
        osc2.type = "square";
        osc2.frequency.value = 110; // A2
        osc2.connect(gainNode);

        // 创建节奏振荡器
        const osc3 = this.audioContext.createOscillator();
        osc3.type = "sawtooth";
        osc3.frequency.value = 330; // E4
        osc3.connect(gainNode);

        // 使用调度器创建简单的旋律
        const now = this.audioContext.currentTime;
        const noteDuration = 0.5;

        // 简单的旋律序列
        const melody = [220, 247, 262, 294, 330, 294, 262, 247]; // C大调音阶

        melody.forEach((freq, index) => {
          const startTime = now + index * noteDuration;
          const osc = this.audioContext!.createOscillator();
          osc.type = "square";
          osc.frequency.value = freq;
          
          const gain = this.audioContext!.createGain();
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration - 0.1);
          gain.gain.setValueAtTime(0, startTime + noteDuration);
          
          osc.connect(gain);
          gain.connect(gainNode);
          osc.start(startTime);
          osc.stop(startTime + noteDuration);
        });

        // 启动基础音调
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);

        const duration = melody.length * noteDuration;
        osc1.stop(now + duration);
        osc2.stop(now + duration);
        osc3.stop(now + duration);

        this.backgroundMusicSource = osc1;
        this.backgroundMusicGain = gainNode;
        this.isPlayingMusic = true;

        // 如果循环，在音乐结束后重新播放
        if (loop) {
          setTimeout(() => {
            if (this.musicEnabled && this.isPlayingMusic) {
              this.startBackgroundMusicLoop(true);
            }
          }, duration * 1000);
        }
      };

      playMusic();
    } catch (e) {
      console.warn("[AudioManager] Failed to start background music:", e);
    }
  }

  /**
   * 播放音效
   */
  public async playSound(
    type: "shoot" | "hit" | "kill" | "levelup" | "damage" | "pickup" | "gameover"
  ): Promise<void> {
    if (!this.soundEnabled) return;

    // 防止音效过于频繁
    const now = Date.now();
    const lastTime = this.lastSoundTime.get(type) || 0;
    if (now - lastTime < this.soundCooldown) {
      return;
    }
    this.lastSoundTime.set(type, now);

    await this.ensureAudioContext();
    
    if (!this.audioContext) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // 根据音效类型设置不同的频率和参数
    const soundConfig = this.getSoundConfig(type);
    
    oscillator.type = soundConfig.waveType as OscillatorType;
    oscillator.frequency.setValueAtTime(soundConfig.frequency, this.audioContext.currentTime);
    
    // 设置音量包络
    const volume = this.soundVolume * this.masterVolume * soundConfig.volume;
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + soundConfig.duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + soundConfig.duration);
  }

  /**
   * 获取音效配置
   */
  private getSoundConfig(type: string): {
    frequency: number;
    waveType: string;
    duration: number;
    volume: number;
  } {
    const configs: Record<string, any> = {
      shoot: {
        frequency: 800,
        waveType: "square",
        duration: 0.1,
        volume: 0.3,
      },
      hit: {
        frequency: 400,
        waveType: "square",
        duration: 0.15,
        volume: 0.4,
      },
      kill: {
        frequency: 200,
        waveType: "sawtooth",
        duration: 0.2,
        volume: 0.5,
      },
      levelup: {
        frequency: 600,
        waveType: "sine",
        duration: 0.5,
        volume: 0.6,
      },
      damage: {
        frequency: 150,
        waveType: "sawtooth",
        duration: 0.2,
        volume: 0.4,
      },
      pickup: {
        frequency: 1000,
        waveType: "sine",
        duration: 0.2,
        volume: 0.3,
      },
      gameover: {
        frequency: 100,
        waveType: "sawtooth",
        duration: 1.0,
        volume: 0.5,
      },
    };

    return configs[type] || configs.shoot;
  }

  /**
   * 设置主音量
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusicGain) {
      this.backgroundMusicGain.gain.value = this.musicVolume * this.masterVolume * 0.2;
    }
  }

  /**
   * 设置音乐音量
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusicGain) {
      this.backgroundMusicGain.gain.value = this.musicVolume * this.masterVolume * 0.2;
    }
  }

  /**
   * 设置音效音量
   */
  public setSoundVolume(volume: number): void {
    this.soundVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 启用/禁用音效
   */
  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * 启用/禁用音乐
   */
  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopBackgroundMusic();
    } else if (enabled && !this.isPlayingMusic) {
      this.playBackgroundMusic();
    }
  }

  /**
   * 获取当前设置
   */
  public getSettings(): {
    soundEnabled: boolean;
    musicEnabled: boolean;
    masterVolume: number;
    musicVolume: number;
    soundVolume: number;
  } {
    return {
      soundEnabled: this.soundEnabled,
      musicEnabled: this.musicEnabled,
      masterVolume: this.masterVolume,
      musicVolume: this.musicVolume,
      soundVolume: this.soundVolume,
    };
  }
}

