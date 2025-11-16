/**
 * 树木系统
 * 负责生成和管理场景中的树木
 * 树木会阻挡玩家走位和子弹
 */

import { Tree } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";

export interface TreeConfig {
  radius: number;
  density: number; // 每1000x1000单位面积的树木数量
}

export const TREE_CONFIGS: Record<'small' | 'medium' | 'large', TreeConfig> = {
  small: {
    radius: 12,
    density: 1.8, // -10%
  },
  medium: {
    radius: 18,
    density: 1.08, // -10%
  },
  large: {
    radius: 25,
    density: 0.72, // -10%
  },
};

export class TreeSystem {
  private trees: Tree[] = [];
  private worldBounds: { minX: number; maxX: number; minY: number; maxY: number };
  private gridSize: number = 500; // 网格大小，用于分区域生成树木

  constructor() {
    // 初始世界边界（会在生成时扩展）
    this.worldBounds = {
      minX: -2000,
      maxX: 2000,
      minY: -2000,
      maxY: 2000,
    };
  }

  /**
   * 生成树木
   * @param centerX 中心X坐标（玩家位置）
   * @param centerY 中心Y坐标（玩家位置）
   * @param radius 生成半径
   */
  public generateTrees(centerX: number, centerY: number, radius: number = 1000): void {
    // 更新世界边界（记录最近生成区域，当前不用于剔除）
    this.worldBounds = {
      minX: centerX - radius,
      maxX: centerX + radius,
      minY: centerY - radius,
      maxY: centerY + radius,
    };

    // 计算需要生成的树木数量（基于面积和密度）
    const area = (radius * 2) * (radius * 2);
    const totalDensity = Object.values(TREE_CONFIGS).reduce(
      (sum, config) => sum + config.density,
      0
    );
    const targetCount = Math.floor((area / (1000 * 1000)) * totalDensity);

    // 仅比较当前区域内已有数量，避免被全局数量误伤导致远处不生成
    const existingInArea = this.getTreesInArea(centerX, centerY, radius).length;
    const needCount = Math.max(0, targetCount - existingInArea);
    if (needCount <= 0) return;

    // 生成新树木
    const newTrees: Tree[] = [];
    const attempts = needCount * 6; // 提升尝试次数，确保远处区域能填满

    for (let i = 0; i < attempts && newTrees.length < needCount; i++) {
      // 随机位置
      const x = centerX + (Math.random() - 0.5) * radius * 2;
      const y = centerY + (Math.random() - 0.5) * radius * 2;

      // 随机选择树木类型
      const type = this.selectTreeType();
      const config = TREE_CONFIGS[type];
      // 为半径加入随机抖动，提升形态多样性（0.8x ~ 1.4x）
      const jitterFactor = 0.8 + Math.random() * 0.6;
      const randRadius = Math.max(6, Math.floor(config.radius * jitterFactor));

      // 检查是否与现有树木重叠
      const tooClose = this.trees.some((tree) => {
        const dx = tree.x - x;
        const dy = tree.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < tree.radius + randRadius + 12; // 最小间距降低，提升密度
      });

      // 检查是否与新生成的树木重叠
      const tooCloseToNew = newTrees.some((tree) => {
        const dx = tree.x - x;
        const dy = tree.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < tree.radius + randRadius + 12;
      });

      if (!tooClose && !tooCloseToNew) {
        // 是否生成小型簇（两三棵树扎堆）
        const clusterChance = 0.25; // 25% 概率生成簇
        const makeCluster = Math.random() < clusterChance && newTrees.length < needCount - 1;

        if (makeCluster) {
          // 先放置中心树
          newTrees.push({
            x,
            y,
            radius: randRadius,
            type,
            shade: 0.8 + Math.random() * 0.4,
          });

          // 在小范围半径内生成2~3棵随机类型的树
          const extraCount = Math.min(3, Math.max(2, Math.floor(Math.random() * 3) + 2));
          for (let k = 0; k < extraCount && newTrees.length < needCount; k++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 14 + Math.random() * 32; // 簇内距离
            const cx = x + Math.cos(angle) * dist;
            const cy = y + Math.sin(angle) * dist;

            const ctype = this.selectTreeType();
            const cconfig = TREE_CONFIGS[ctype];
            const cjitter = 0.8 + Math.random() * 0.6;
            const cradius = Math.max(6, Math.floor(cconfig.radius * cjitter));

            const collideExisting = this.trees.some((tree) => {
              const dx = tree.x - cx;
              const dy = tree.y - cy;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance < tree.radius + cradius + 8; // 簇内更紧凑
            });
            const collideNew = newTrees.some((tree) => {
              const dx = tree.x - cx;
              const dy = tree.y - cy;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance < tree.radius + cradius + 8;
            });

            if (!collideExisting && !collideNew) {
              newTrees.push({
                x: cx,
                y: cy,
                radius: cradius,
                type: ctype,
                shade: 0.8 + Math.random() * 0.4,
              });
            }
          }
        } else {
          // 普通单棵生成
          newTrees.push({
            x,
            y,
            radius: randRadius,
            type,
            shade: 0.8 + Math.random() * 0.4,
          });
        }
      }
    }

    this.trees.push(...newTrees);
  }

  /**
   * 选择树木类型（基于权重）
   */
  private selectTreeType(): 'small' | 'medium' | 'large' {
    const rand = Math.random();
    if (rand < 0.5) return 'small';
    if (rand < 0.8) return 'medium';
    return 'large';
  }

  /**
   * 获取所有树木
   */
  public getTrees(): Tree[] {
    return this.trees;
  }

  /**
   * 检查点是否与树木碰撞
   */
  public checkCollision(x: number, y: number, radius: number): Tree | null {
    for (const tree of this.trees) {
      const dx = tree.x - x;
      const dy = tree.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < tree.radius + radius) {
        return tree;
      }
    }
    return null;
  }

  /**
   * 获取指定区域内的树木
   */
  public getTreesInArea(centerX: number, centerY: number, radius: number): Tree[] {
    return this.trees.filter((tree) => {
      const dx = tree.x - centerX;
      const dy = tree.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < radius + tree.radius;
    });
  }

  /**
   * 重置树木系统
   */
  public reset(): void {
    this.trees = [];
    this.worldBounds = {
      minX: -2000,
      maxX: 2000,
      minY: -2000,
      maxY: 2000,
    };
  }

  /**
   * 根据玩家位置动态生成树木（在玩家周围）
   */
  public updateTreesAroundPlayer(playerX: number, playerY: number, viewRadius: number = 800): void {
    // 检查玩家周围是否有足够的树木
    const nearbyTrees = this.getTreesInArea(playerX, playerY, viewRadius);
    
    // 如果树木太少，生成新的
    if (nearbyTrees.length < 25) {
      this.generateTrees(playerX, playerY, viewRadius);
    }
  }
}

