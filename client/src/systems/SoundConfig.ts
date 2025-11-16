/**
 * 音效配置模块
 * 集中管理所有音效的参数配置，便于调整和优化
 */

export type SoundType = "shoot" | "hit" | "kill" | "levelup" | "damage" | "pickup" | "gameover";

export interface SoundEffectConfig {
  frequency: number;
  waveType: OscillatorType;
  duration: number;
  volume: number;
  description?: string;
}

/**
 * 音效配置表
 * 所有音效的参数都在这里集中管理
 */
export const SOUND_CONFIGS: Record<SoundType, SoundEffectConfig> = {
  shoot: {
    frequency: 800,
    waveType: "square",
    duration: 0.1,
    volume: 0.3,
    description: "射击音效 - 高音方波",
  },
  hit: {
    frequency: 400,
    waveType: "square",
    duration: 0.15,
    volume: 0.4,
    description: "击中音效 - 中音方波",
  },
  kill: {
    frequency: 200,
    waveType: "sawtooth",
    duration: 0.2,
    volume: 0.5,
    description: "击杀音效 - 低音锯齿波",
  },
  levelup: {
    frequency: 600,
    waveType: "sine",
    duration: 0.5,
    volume: 0.6,
    description: "升级音效 - 上升音调正弦波",
  },
  damage: {
    frequency: 150,
    waveType: "sawtooth",
    duration: 0.2,
    volume: 0.4,
    description: "受伤音效 - 低音锯齿波",
  },
  pickup: {
    frequency: 1000,
    waveType: "sine",
    duration: 0.2,
    volume: 0.3,
    description: "拾取音效 - 高音正弦波",
  },
  gameover: {
    frequency: 100,
    waveType: "sawtooth",
    duration: 1.0,
    volume: 0.5,
    description: "游戏结束音效 - 长低音",
  },
};

/**
 * 背景音乐配置
 */
export interface BackgroundMusicConfig {
  tempo: number; // 节拍速度（BPM）
  baseVolume: number; // 基础音量
  loop: boolean; // 是否循环
}

export const BACKGROUND_MUSIC_CONFIG: BackgroundMusicConfig = {
  tempo: 120, // 120 BPM
  baseVolume: 0.15, // 降低基础音量
  loop: true,
};

/**
 * Boss战斗音乐配置
 */
export interface BossMusicConfig {
  tempo: number; // 节拍速度（BPM）- 更快营造紧张感
  baseVolume: number; // 基础音量 - 更大突出紧张氛围
  loop: boolean; // 是否循环
}

export const BOSS_MUSIC_CONFIG: BossMusicConfig = {
  tempo: 140, // 140 BPM - 更��的节奏
  baseVolume: 0.25, // 更高的音量突出紧张感
  loop: true,
};

/**
 * 8-bit风格音乐音符定义
 * 使用C大调音阶
 */
export const MUSIC_NOTES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.00,
  A3: 220.00,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00,
  B4: 493.88,
  C5: 523.25,
};

/**
 * 背景音乐旋律序列
 * 简单的8-bit风格循环旋律
 */
export const BACKGROUND_MELODY = [
  // 第一段：主旋律
  { note: MUSIC_NOTES.C4, duration: 0.25 },
  { note: MUSIC_NOTES.E4, duration: 0.25 },
  { note: MUSIC_NOTES.G4, duration: 0.25 },
  { note: MUSIC_NOTES.C5, duration: 0.25 },
  { note: MUSIC_NOTES.G4, duration: 0.25 },
  { note: MUSIC_NOTES.E4, duration: 0.25 },
  { note: MUSIC_NOTES.C4, duration: 0.25 },
  { note: MUSIC_NOTES.G3, duration: 0.25 },
  // 第二段：变化
  { note: MUSIC_NOTES.A3, duration: 0.25 },
  { note: MUSIC_NOTES.C4, duration: 0.25 },
  { note: MUSIC_NOTES.E4, duration: 0.25 },
  { note: MUSIC_NOTES.A4, duration: 0.25 },
  { note: MUSIC_NOTES.E4, duration: 0.25 },
  { note: MUSIC_NOTES.C4, duration: 0.25 },
  { note: MUSIC_NOTES.A3, duration: 0.25 },
  { note: MUSIC_NOTES.F3, duration: 0.25 },
];

/**
 * Boss战斗背景音乐旋律序列
 * 紧张、急促、有压迫感的旋律
 */
export const BOSS_MELODY = [
  // 紧张的主旋律 - 小调音阶营造压迫感
  { note: 261.63, duration: 0.2 },  // C4
  { note: 261.63, duration: 0.2 },
  { note: 293.66, duration: 0.2 },  // D4
  { note: 293.66, duration: 0.2 },
  { note: 311.13, duration: 0.2 },  // 升D4
  { note: 311.13, duration: 0.2 },
  { note: 329.63, duration: 0.3 },  // E4
  { note: 329.63, duration: 0.3 },
  
  // 上升的旋律增加紧张感
  { note: 349.23, duration: 0.2 },  // F4
  { note: 392.00, duration: 0.2 },  // G4
  { note: 415.30, duration: 0.2 },  // 降A4
  { note: 440.00, duration: 0.4 },  // A4
  
  // 下行旋律缓解然后再次紧张
  { note: 392.00, duration: 0.2 },  // G4
  { note: 349.23, duration: 0.2 },  // F4
  { note: 329.63, duration: 0.2 },  // E4
  { note: 293.66, duration: 0.2 },  // D4
  { note: 261.63, duration: 0.4 },  // C4
  
  // 重复主旋律
  { note: 261.63, duration: 0.2 },
  { note: 261.63, duration: 0.2 },
  { note: 293.66, duration: 0.2 },
  { note: 293.66, duration: 0.2 },
  { note: 311.13, duration: 0.2 },
  { note: 311.13, duration: 0.2 },
  { note: 329.63, duration: 0.3 },
  { note: 329.63, duration: 0.3 },
];

/**
 * 音频系统默认设置
 */
export const AUDIO_DEFAULT_SETTINGS = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  soundVolume: 0.8,
  soundEnabled: true,
  musicEnabled: true,
  soundCooldown: 50, // 音效冷却时间（毫秒）
};

