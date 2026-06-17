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
    density: 2.2,
  },
  medium: {
    radius: 34,
    density: 0.9,
  },
  large: {
    radius: 78,
    density: 0.42,
  },
};

// 小树林生成概率（每生成一棵树，有该概率额外生成一组邻近植物/矿物）
export const GROVE_CHANCE = 0.34;

// 碰撞半径乘数：只有中心树干部分阻挡走位
// 视觉半径 vs 碰撞半径 = 1 : 0.35
export const COLLISION_RADIUS_MULTIPLIER = 0.35;


export class TreeSystem {
  private trees: Tree[] = [];

  constructor() {
    // 初始化
  }

  /**
   * 生成树木
   * @param centerX 中心X坐标（玩家位置）
   * @param centerY 中心Y坐标（玩家位置）
   * @param radius 生成半径
   */
  public generateTrees(centerX: number, centerY: number, radius: number = 1000): void {
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
    const attempts = needCount * 4;

    for (let i = 0; i < attempts && newTrees.length < needCount; i++) {
      const clusterBias = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const distance = clusterBias < 0.62
        ? Math.pow(Math.random(), 1.7) * radius
        : (0.35 + Math.random() * 0.65) * radius;
      const x = centerX + Math.cos(angle) * distance + (Math.random() - 0.5) * radius * 0.18;
      const y = centerY + Math.sin(angle) * distance + (Math.random() - 0.5) * radius * 0.18;

      // 随机选择树木类型
      const type = this.selectTreeType();
      const randRadius = this.rollTreeRadius(type);

      // 检查是否与现有树木重叠
      const tooClose = this.trees.some((tree) => {
        const dx = tree.x - x;
        const dy = tree.y - y;
        const distanceSq = dx * dx + dy * dy;
        const minDist = tree.radius + randRadius + 20;
        return distanceSq < minDist * minDist;
      });

      // 检查是否与新生成的树木重叠
      const tooCloseToNew = newTrees.some((tree) => {
        const dx = tree.x - x;
        const dy = tree.y - y;
        const distanceSq = dx * dx + dy * dy;
        const minDist = tree.radius + randRadius + 20;
        return distanceSq < minDist * minDist;
      });

      if (!tooClose && !tooCloseToNew) {
        const mainTree: Tree = {
          x,
          y,
          radius: randRadius,
          type,
          shade: 0.68 + Math.random() * 0.48,
          seed: Math.random(),
        };
        newTrees.push(mainTree);

        // 小树林机制：有概率在主树周围生成大小差异更明显的附属植物/矿物
        if (Math.random() < GROVE_CHANCE) {
          const groveCount = 1 + Math.floor(Math.pow(Math.random(), 0.65) * 5);
          const groveSpread = randRadius * (1.15 + Math.random() * 1.75);
          for (let g = 0; g < groveCount; g++) {
            // 在主树周围随机位置生成较小的树
            const angle = Math.random() * Math.PI * 2;
            const dist = groveSpread * (0.35 + Math.pow(Math.random(), 1.4));
            const gx = x + Math.cos(angle) * dist;
            const gy = y + Math.sin(angle) * dist * 0.72;
            
            // 附属树类型：比主树小一档或相同
            const groveType = type === 'large'
              ? (Math.random() < 0.28 ? 'large' : Math.random() < 0.62 ? 'medium' : 'small')
              : type === 'medium'
                ? (Math.random() < 0.2 ? 'medium' : 'small')
                : 'small';
            const groveRadius = Math.floor(this.rollTreeRadius(groveType) * (0.62 + Math.random() * 0.52));

            // 检查附属树是否与现有树重叠
            const groveTooClose = [...this.trees, ...newTrees].some((tree) => {
              const dx = tree.x - gx;
              const dy = tree.y - gy;
              const distanceSq = dx * dx + dy * dy;
              const minDist = tree.radius + groveRadius + 10; // 附属树间距较小
              return distanceSq < minDist * minDist;
            });

            if (!groveTooClose) {
              newTrees.push({
                x: gx,
                y: gy,
                radius: groveRadius,
                type: groveType,
                shade: 0.62 + Math.random() * 0.55,
                seed: Math.random(),
              });
            }
          }
        }
      }
    }

    this.trees.push(...newTrees);
  }

  /**
   * 选择树木类型（基于权重）- 优化：更多样化的分布
   */
  private selectTreeType(): 'small' | 'medium' | 'large' {
    const rand = Math.random();
    if (rand < 0.18) return 'large';
    if (rand < 0.46) return 'medium';
    return 'small';
  }

  private rollTreeRadius(type: 'small' | 'medium' | 'large'): number {
    const base = TREE_CONFIGS[type].radius;
    if (type === 'large') {
      return Math.floor(base * (0.72 + Math.pow(Math.random(), 0.55) * 0.72));
    }
    if (type === 'medium') {
      return Math.floor(base * (0.68 + Math.random() * 0.72));
    }
    return Math.floor(base * (0.62 + Math.random() * 1.15));
  }

  /**
   * 获取所有树木
   */
  public getTrees(): Tree[] {
    return this.trees;
  }

  /**
   * 检查点是否与树木碰撞
   * 优化：使用平方距离判定
   * 碰撞区域只取树木中心的"树干"部分（视觉半径的35%）
   * 草丛不阻挡走位
   */
  public checkCollision(x: number, y: number, radius: number): Tree | null {
    for (const tree of this.trees) {
      const dx = tree.x - x;
      const dy = tree.y - y;
      const distanceSq = dx * dx + dy * dy;
      // 只有树干中心部分阻挡走位（视觉半径的35%）
      const collisionRadius = tree.radius * COLLISION_RADIUS_MULTIPLIER;
      const radiusSum = collisionRadius + radius;
      if (distanceSq < radiusSum * radiusSum) {
        return tree;
      }
    }
    return null;
  }

  /**
   * 检查玩家移动是否会受到树木阻挡（基于方向和距离）
   * @param playerX 玩家当前X位置
   * @param playerY 玩家当前Y位置
   * @param moveX X轴移动量
   * @param moveY Y轴移动量
   * @param playerRadius 玩家半径
   * @returns 是否被阻挡及阻挡的树木
   */
  public checkPlayerMovementBlock(
    playerX: number,
    playerY: number,
    moveX: number,
    moveY: number,
    playerRadius: number
  ): { blocked: boolean; tree: Tree | null } {
    // 如果没有移动，不会被阻挡
    if (moveX === 0 && moveY === 0) {
      return { blocked: false, tree: null };
    }

    // 计算移动方向
    const moveLength = Math.sqrt(moveX * moveX + moveY * moveY);
    const moveDirX = moveX / moveLength;
    const moveDirY = moveY / moveLength;

    // 检查目标位置
    const targetX = playerX + moveX;
    const targetY = playerY + moveY;

    for (const tree of this.trees) {
      // 计算树木与玩家的相对位置
      const toTreeX = tree.x - playerX;
      const toTreeY = tree.y - playerY;
      const distanceToTree = Math.sqrt(toTreeX * toTreeX + toTreeY * toTreeY);

      // 如果距离太远，跳过
      const maxCheckDistance = tree.radius + playerRadius + 20;
      if (distanceToTree > maxCheckDistance) {
        continue;
      }

      // 计算树木相对于玩家移动方向的角度
      const toTreeNormX = toTreeX / distanceToTree;
      const toTreeNormY = toTreeY / distanceToTree;
      const dotProduct = toTreeNormX * moveDirX + toTreeNormY * moveDirY;
      const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))) * (180 / Math.PI);

      // 只有在玩家前方扇形区域内的树木才会阻挡
      const blockAngle = GAME_CONFIG.COLLISION.TREE_BLOCK_ANGLE;
      if (angle > blockAngle / 2) {
        continue;
      }

      // 检查目标位置是否碰撞（优化：使用平方距离判定）
      // 只有树干中心部分阻挡走位（视觉半径的35%）
      const dx = targetX - tree.x;
      const dy = targetY - tree.y;
      const distanceSq = dx * dx + dy * dy;
      const minBlockDistance = GAME_CONFIG.COLLISION.TREE_MIN_BLOCK_DISTANCE;
      const collisionRadius = tree.radius * COLLISION_RADIUS_MULTIPLIER;
      const radiusSum = collisionRadius + playerRadius + minBlockDistance;

      if (distanceSq < radiusSum * radiusSum) {
        return { blocked: true, tree };
      }
    }

    return { blocked: false, tree: null };
  }

  /**
   * 获取指定区域内的树木
   * 优化：使用平方距离判定
   */
  public getTreesInArea(centerX: number, centerY: number, radius: number): Tree[] {
    return this.trees.filter((tree) => {
      const dx = tree.x - centerX;
      const dy = tree.y - centerY;
      const distanceSq = dx * dx + dy * dy;
      const radiusSum = radius + tree.radius;
      return distanceSq < radiusSum * radiusSum;
    });
  }

  /**
   * 重置树木系统
   */
  public reset(): void {
    this.trees = [];
  }

  /**
   * 根据玩家位置动态生成树木（在玩家周围）
   * 提前预加载屏幕外2屏范围的树木，避免玩家移动时看到树木"陆续出现"
   */
  public updateTreesAroundPlayer(playerX: number, playerY: number, viewRadius: number = 1500): void {
    // 检查玩家周围是否有足够的树木
    const nearbyTrees = this.getTreesInArea(playerX, playerY, viewRadius);

    // 基于范围计算期望的树木数量（面积 * 密度）
    const area = (viewRadius * 2) * (viewRadius * 2);
    const totalDensity = Object.values(TREE_CONFIGS).reduce((sum, config) => sum + config.density, 0);
    const expectedCount = Math.floor((area / (1000 * 1000)) * totalDensity * 0.6); // 60%阈值

    // 如果树木数量不足，提前生成
    if (nearbyTrees.length < expectedCount) {
      this.generateTrees(playerX, playerY, viewRadius);
    }
  }
}
