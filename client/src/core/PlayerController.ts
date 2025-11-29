/**
 * 玩家控制器
 * 负责玩家移动、射击逻辑
 */

import { Player } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import { MathUtils } from "../utils/MathUtils";
import { BulletPool } from "../utils/BulletPool";
import { TreeSystem } from "../systems/TreeSystem";
import { AudioSystem } from "../systems/AudioSystem";

export interface PlayerInput {
  keys: Set<string>;
  joystickX: number;
  joystickY: number;
}

export interface ShootingContext {
  bulletPool: BulletPool;
  enemies: { x: number; y: number }[];
  audioSystem: AudioSystem;
}

/**
 * 玩家控制器类
 */
export class PlayerController {
  private lastShotTime: number = 0;
  private shotToggle: boolean = false;

  /**
   * 更新玩家位置
   */
  public updatePosition(
    player: Player,
    input: PlayerInput,
    deltaTime: number,
    treeSystem: TreeSystem
  ): void {
    let dx = input.joystickX;
    let dy = input.joystickY;

    // 键盘控制（作为备选）
    if (input.keys.has("w") || input.keys.has("arrowup")) dy -= 1;
    if (input.keys.has("s") || input.keys.has("arrowdown")) dy += 1;
    if (input.keys.has("a") || input.keys.has("arrowleft")) dx -= 1;
    if (input.keys.has("d") || input.keys.has("arrowright")) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const { x: normalizedX, y: normalizedY } = MathUtils.safeNormalize(dx, dy);

      const moveX = normalizedX * player.moveSpeed * deltaTime;
      const moveY = normalizedY * player.moveSpeed * deltaTime;

      const playerTreeRadius = player.radius * (GAME_CONFIG.COLLISION?.PLAYER_VS_TREE_RADIUS_MULTIPLIER ?? 0.85);

      // 检查移动是否被阻挡
      const blockResult = treeSystem.checkPlayerMovementBlock(
        player.x,
        player.y,
        moveX,
        moveY,
        playerTreeRadius
      );

      if (!blockResult.blocked) {
        player.x += moveX;
        player.y += moveY;
      } else {
        // 被阻挡，尝试简单的边缘滑动
        const slideResult = this.trySimpleSlide(player.x, player.y, moveX, moveY, playerTreeRadius, blockResult.tree, treeSystem);
        if (slideResult) {
          player.x = slideResult.x;
          player.y = slideResult.y;
        }
      }
    }
  }

  /**
   * 尝试简单的边缘滑动
   */
  private trySimpleSlide(
    currentX: number,
    currentY: number,
    moveX: number,
    moveY: number,
    playerRadius: number,
    tree: any,
    treeSystem: TreeSystem
  ): { x: number; y: number } | null {
    const moveLength = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveLength === 0) return null;

    const toPlayerX = currentX - tree.x;
    const toPlayerY = currentY - tree.y;
    const distanceToTree = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);

    if (distanceToTree === 0) {
      const randomAngle = Math.random() * Math.PI * 2;
      const pushDistance = tree.radius + playerRadius + 2;
      return {
        x: tree.x + Math.cos(randomAngle) * pushDistance,
        y: tree.y + Math.sin(randomAngle) * pushDistance
      };
    }

    const toPlayerNormX = toPlayerX / distanceToTree;
    const toPlayerNormY = toPlayerY / distanceToTree;

    const slideDir1X = -toPlayerNormY;
    const slideDir1Y = toPlayerNormX;
    const slideDir2X = toPlayerNormY;
    const slideDir2Y = -toPlayerNormX;

    const moveDirX = moveX / moveLength;
    const moveDirY = moveY / moveLength;

    const dot1 = slideDir1X * moveDirX + slideDir1Y * moveDirY;
    const dot2 = slideDir2X * moveDirX + slideDir2Y * moveDirY;

    const chosenSlideDirX = dot1 > dot2 ? slideDir1X : slideDir2X;
    const chosenSlideDirY = dot1 > dot2 ? slideDir1Y : slideDir2Y;

    const slideDistance = Math.min(moveLength * 0.3, playerRadius * 0.8);
    const slideX = chosenSlideDirX * slideDistance;
    const slideY = chosenSlideDirY * slideDistance;

    const slideNextX = currentX + slideX;
    const slideNextY = currentY + slideY;

    const slideCollision = treeSystem.checkCollision(slideNextX, slideNextY, playerRadius);
    if (!slideCollision) {
      return { x: slideNextX, y: slideNextY };
    }

    const smallMoveDistance = playerRadius * 0.3;
    const smallMoveX = moveDirX * smallMoveDistance;
    const smallMoveY = moveDirY * smallMoveDistance;
    const smallNextX = currentX + smallMoveX;
    const smallNextY = currentY + smallMoveY;

    const smallCollision = treeSystem.checkCollision(smallNextX, smallNextY, playerRadius);
    if (!smallCollision) {
      return { x: smallNextX, y: smallNextY };
    }

    return null;
  }

  /**
   * 处理玩家射击
   */
  public handleShooting(
    player: Player,
    now: number,
    context: ShootingContext
  ): void {
    const shootInterval = MathUtils.safeDivide(1000, player.attackSpeed, 1000);
    if (now - this.lastShotTime < shootInterval) return;

    if (context.enemies.length === 0) return;

    let closestEnemy = context.enemies[0];
    let minDistanceSq = Infinity;

    for (const enemy of context.enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestEnemy = enemy;
      }
    }

    if (minDistanceSq <= player.attackRange * player.attackRange) {
      const angle = Math.atan2(
        closestEnemy.y - player.y,
        closestEnemy.x - player.x
      );

      const bulletAngles: number[] = [];
      if (player.bulletCount === 2) {
        const spread = GAME_CONFIG.BULLET.SPREAD_ANGLE / 2;
        bulletAngles.push(angle);
        const side = this.shotToggle ? 1 : -1;
        bulletAngles.push(angle + side * spread);
        this.shotToggle = !this.shotToggle;
      } else {
        for (let i = 0; i < player.bulletCount; i++) {
          let spreadAngle = 0;
          if (player.bulletCount > 1) {
            const centerOffset = (player.bulletCount - 1) / 2;
            const offset = i - centerOffset;
            const maxSpread = GAME_CONFIG.BULLET.SPREAD_ANGLE;
            spreadAngle = (centerOffset === 0) ? 0 : (offset / centerOffset) * maxSpread;
          }
          bulletAngles.push(angle + spreadAngle);
        }
      }

      const bulletRadius = GAME_CONFIG.BULLET.BASE_RADIUS * player.bulletSizeMultiplier;
      for (const bulletAngle of bulletAngles) {
        context.bulletPool.acquire(
          player.x,
          player.y,
          Math.cos(bulletAngle) * GAME_CONFIG.BULLET.SPEED,
          Math.sin(bulletAngle) * GAME_CONFIG.BULLET.SPEED,
          bulletRadius,
          player.attackDamage,
          player.hasPierce,
          player.hasPierce ? player.pierceCount || 1 : 0,
          player.pierceDamageReduction || 0.5,
          false
        );
      }

      this.lastShotTime = now;
      context.audioSystem.playSound("shoot");
    }
  }

  /**
   * 重置控制器状态
   */
  public reset(): void {
    this.lastShotTime = 0;
    this.shotToggle = false;
  }
}
