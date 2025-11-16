/**
 * Boss配置模块
 * 集中管理所有Boss的参数和技能配置
 */

import { BossType, Boss } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";

/**
 * Boss基础配置
 * Boss参数设定为小怪的100倍
 */
export const BOSS_BASE_CONFIG = {
  // 基于普通敌人的100倍
  HEALTH_MULTIPLIER: 100,
  DAMAGE_MULTIPLIER: 100,
  SPEED_MULTIPLIER: 0.5, // Boss移动速度较慢
  RADIUS_MULTIPLIER: 3, // Boss体积较大
  SKILL_COOLDOWN: 3000, // 技能冷却时间（毫秒）
};

/**
 * Boss类型配置
 */
export interface BossTypeConfig {
  name: string;
  description: string;
  color: string;
  skillName: string;
  skillDescription: string;
}

export const BOSS_TYPES: Record<BossType, BossTypeConfig> = {
  level10: {
    name: "初级守护者",
    description: "第一个Boss，拥有环形弹幕技能",
    color: "#ef4444",
    skillName: "环形弹幕",
    skillDescription: "向8个方向发射子弹",
  },
  level20: {
    name: "中级守护者",
    description: "第二个Boss，拥有追踪弹幕技能",
    color: "#f97316",
    skillName: "追踪弹幕",
    skillDescription: "发射追踪玩家的子弹",
  },
  level30: {
    name: "高级守护者",
    description: "第三个Boss，拥有扇形弹幕技能",
    color: "#8b5cf6",
    skillName: "扇形弹幕",
    skillDescription: "向玩家方向发射扇形弹幕",
  },
  level40: {
    name: "精英守护者",
    description: "第四个Boss，拥有螺旋弹幕技能",
    color: "#eab308",
    skillName: "螺旋弹幕",
    skillDescription: "发射螺旋形弹幕",
  },
  level50: {
    name: "终极守护者",
    description: "第五个Boss，拥有多重弹幕技能",
    color: "#06b6d4",
    skillName: "多重弹幕",
    skillDescription: "同时发射多种弹幕",
  },
};

/**
 * 创建Boss实例
 */
export function createBoss(
  type: BossType,
  level: number,
  playerX: number,
  playerY: number,
  canvasWidth: number,
  canvasHeight: number
): Boss {
  // 基于普通敌人的基础值
  const baseEnemy = GAME_CONFIG.ENEMY.TYPES.swarm; // 使用swarm作为基础
  
  // 计算Boss属性（100倍）
  const baseHealth = GAME_CONFIG.ENEMY.BASE_HEALTH * BOSS_BASE_CONFIG.HEALTH_MULTIPLIER;
  const baseDamage = baseEnemy.damage * BOSS_BASE_CONFIG.DAMAGE_MULTIPLIER;
  const baseSpeed = GAME_CONFIG.ENEMY.BASE_SPEED * BOSS_BASE_CONFIG.SPEED_MULTIPLIER;
  const baseRadius = GAME_CONFIG.ENEMY.RADIUS * BOSS_BASE_CONFIG.RADIUS_MULTIPLIER;

  // 根据等级调整（每10级增加20%）
  const levelMultiplier = 1 + (level / 10 - 1) * 0.2;
  const health = baseHealth * levelMultiplier;
  const damage = baseDamage * levelMultiplier;
  const speed = baseSpeed;
  const radius = baseRadius;

  // 在玩家周围随机位置生成Boss
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.min(canvasWidth, canvasHeight) * 0.4;
  const x = playerX + Math.cos(angle) * distance;
  const y = playerY + Math.sin(angle) * distance;

  return {
    x,
    y,
    radius,
    health,
    maxHealth: health,
    speed,
    angle: Math.atan2(playerY - y, playerX - x),
    type,
    level,
    skillCooldown: BOSS_BASE_CONFIG.SKILL_COOLDOWN,
    lastSkillTime: 0,
    skillData: {},
  };
}

