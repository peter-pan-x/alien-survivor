/**
 * 动画精灵渲染器 - 代码像素帧版
 * 用更高密度的像素帧表达 2.5D 异星生物，而不是简单图标。
 */

import { PixelColors } from "../utils/PixelRenderer";
import type { EntityAnimationState } from "../gameTypes";

export interface AnimatedSpriteFrame {
  pixels: string[][];
  colors: Record<string, string>;
}

export class AnimatedSpriteRenderer {
  public renderAnimatedEnemy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    enemyType: string,
    time: number,
    pixelSize: number = 3,
    state: EntityAnimationState = "move"
  ): void {
    const frame = this.getAnimatedFrame(enemyType, time, state);
    this.drawFrame(ctx, frame, x, y, time, pixelSize, state);
  }

  public renderAnimatedPlayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    isMoving: boolean,
    pixelSize: number = 3,
    state: EntityAnimationState = isMoving ? "move" : "idle"
  ): void {
    const frame = this.getPlayerFrame(time, isMoving, state);
    const transformState = state === "hit" || state === "death"
      ? state
      : isMoving ? "move" : "idle";
    this.drawFrame(ctx, frame, x, y, time, pixelSize, transformState);
  }

  private drawFrame(
    ctx: CanvasRenderingContext2D,
    frame: AnimatedSpriteFrame,
    x: number,
    y: number,
    time: number,
    pixelSize: number,
    state: EntityAnimationState
  ): void {
    const height = frame.pixels.length;
    const width = frame.pixels[0].length;
    const offsetX = x - (width * pixelSize) / 2;
    const offsetY = y - (height * pixelSize) / 2;
    const transform = this.getStateTransform(state, time);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x + transform.offsetX, y + transform.offsetY);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.translate(-x, -y);
    ctx.globalAlpha = transform.alpha;

    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    const shadowOffset = Math.max(2, Math.floor(pixelSize * 0.45));
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const char = frame.pixels[row][col];
        if (char === " " || frame.colors[char] === "transparent") continue;

        ctx.fillRect(
          Math.round(offsetX + col * pixelSize + shadowOffset),
          Math.round(offsetY + row * pixelSize + shadowOffset),
          pixelSize,
          pixelSize
        );
      }
    }

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const char = frame.pixels[row][col];
        if (char === " ") continue;

        const color = frame.colors[char] || "#ffffff";
        if (color === "transparent") continue;

        ctx.fillStyle = color;
        ctx.fillRect(
          Math.round(offsetX + col * pixelSize),
          Math.round(offsetY + row * pixelSize),
          pixelSize,
          pixelSize
        );
      }
    }

    ctx.restore();
  }

  private frame(rows: string[], colors: Record<string, string>): AnimatedSpriteFrame {
    const width = Math.max(...rows.map((row) => row.length));
    return {
      pixels: rows.map((row) => row.padEnd(width, " ").split("")),
      colors,
    };
  }

  private getAnimatedFrame(enemyType: string, time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    switch (enemyType) {
      case "swarm":
        return this.getSwarmFrame(time, state);
      case "rusher":
        return this.getRusherFrame(time, state);
      case "shooter":
        return this.getShooterFrame(time, state);
      case "elite":
        return this.getEliteFrame(time, state);
      case "spider":
        return this.getSpiderFrame(time, state);
      case "crab":
        return this.getCrabFrame(time, state);
      case "bigeye":
        return this.getBigEyeFrame(time, state);
      case "frog":
        return this.getFrogFrame(time, state);
      default:
        return this.getSwarmFrame(time, state);
    }
  }

  private getStateTransform(state: EntityAnimationState, time: number): {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
    alpha: number;
  } {
    if (state === "hit") {
      return {
        scaleX: 1.16,
        scaleY: 0.8,
        offsetX: Math.sin(time * 80) * 2,
        offsetY: 1,
        alpha: 0.7 + Math.abs(Math.sin(time * 55)) * 0.3,
      };
    }

    if (state === "attack") {
      return {
        scaleX: 1.1,
        scaleY: 0.92,
        offsetX: Math.sin(time * 24) * 1.5,
        offsetY: -1,
        alpha: 1,
      };
    }

    if (state === "idle") {
      return {
        scaleX: 1 + Math.sin(time * 3) * 0.02,
        scaleY: 1 - Math.sin(time * 3) * 0.02,
        offsetX: 0,
        offsetY: 0,
        alpha: 1,
      };
    }

    if (state === "death") {
      return {
        scaleX: 1.25,
        scaleY: 0.52,
        offsetX: 0,
        offsetY: 5,
        alpha: 0.45,
      };
    }

    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, alpha: 1 };
  }

  private getSwarmFrame(time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    const twitch = Math.sin(time * 18) > 0;
    const blink = state === "hit" || Math.sin(time * 11) > 0.76;

    return this.frame(
      twitch
        ? [
            "  a       a  ",
            " a  oooo  a ",
            "  aorrrroa  ",
            "  orererro  ",
            " aorrrrroa  ",
            "a  arrrra  a",
            "   a a a    ",
          ]
        : [
            " a         a ",
            "  a oooo a  ",
            "  aorrrroa  ",
            blink ? "  orppprro  " : "  orererro  ",
            " aorrrrroa  ",
            "   arrrra   ",
            "  a a   a a ",
          ],
      PixelColors.enemySwarm
    );
  }

  private getRusherFrame(time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    const stride = state === "attack" || Math.sin(time * 10) > 0;
    return this.frame(
      stride
        ? [
            "    a     a   ",
            "   ayoooooya ",
            "  aorrrrrrroa",
            " oorereerrroo",
            "oorrrrrrrrroo",
            "  aaorrrroaa ",
            " a   a  a   a",
            "a    a  a    ",
          ]
        : [
            "   a       a  ",
            "  ayoooooya  ",
            " aorrrrrrroa ",
            "oorereerrroo ",
            "oorrrrrrrrroo",
            "  aaorrrroaa ",
            "a   a    a   ",
            "    a    a  a",
          ],
      PixelColors.enemyRusher
    );
  }

  private getShooterFrame(time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    const inflate = state === "attack" || Math.sin(time * 5) > 0.15;
    const pupil = Math.sin(time * 4) > 0 ? "epe" : "eep";

    return this.frame(
      inflate
        ? [
            "    vvvv     ",
            "  vvmmmmvv   ",
            " vommmmmmmo  ",
            `vommm${pupil}mmov`,
            "vommmcccmmov ",
            " vmmcccccmmv ",
            "  vvmmmvvv   ",
            "   v v v     ",
          ]
        : [
            "     vv      ",
            "   vvmmvv    ",
            "  vommmmmo   ",
            ` vomm${pupil}mmov `,
            " vmmmcccmmv  ",
            "  vvmmmvv    ",
            "   v v v     ",
          ],
      PixelColors.enemyShooter
    );
  }

  private getEliteFrame(time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    const flare = state === "attack" || Math.sin(time * 7) > 0.35;
    const core = flare ? "ceyec" : "cepec";

    return this.frame(
      [
        "     y   y     ",
        "   yyoooooyy   ",
        "  yorrrrrrroy  ",
        " yorrrrrrrrrroy ",
        `yorrr${core}rrroy`,
        " yorrrrrrrrrroy ",
        "  yorrrrrrroy  ",
        "   yyoooooyy   ",
        flare ? " y  a a a  y  " : "    a a a     ",
      ],
      PixelColors.enemyElite
    );
  }

  private getSpiderFrame(time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    const phase = Math.floor((time * (state === "attack" ? 14 : 8)) % 2);
    return this.frame(
      phase === 0
        ? [
            "a  a     a  a",
            " a  oooo  a ",
            "  aovvvvoa  ",
            " aaovepvoaa ",
            "  aovvvvoa  ",
            " a  oooo  a ",
            "a  a     a  a",
          ]
        : [
            "  a a   a a  ",
            "a   oooo   a",
            " aaovvvvoaa ",
            "  aovepvoa  ",
            " aaovvvvoaa ",
            "a   oooo   a",
            "  a a   a a ",
          ],
      PixelColors.enemySpider
    );
  }

  private getCrabFrame(time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    const open = state === "attack" || Math.sin(time * 6) > 0;
    return this.frame(
      open
        ? [
            "aa         aa",
            "aao oooo oaa",
            "  oorrrrroo ",
            " oorereerrroo",
            "oorrrrrrrrroo",
            "  aaorrroaa ",
            " a  a   a  a",
          ]
        : [
            " a         a ",
            " aa oooo aa ",
            "  oorrrrroo ",
            " oorereerrroo",
            "oorrrrrrrrroo",
            "  aaorrroaa ",
            "a   a   a   a",
          ],
      PixelColors.enemyCrab
    );
  }

  private getBigEyeFrame(time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    const pupilLeft = state === "hit" || Math.sin(time * 2.2) < -0.35;
    const pupil = pupilLeft ? "pww" : "wwp";
    const lid = Math.sin(time * 5) > 0.88 ? "ccccccc" : `cc${pupil}cc`;

    return this.frame(
      [
        "    coooc    ",
        "  coommmmooc ",
        " coomccccmooc",
        `coom${lid}mooc`,
        "coomccccmooc ",
        " coommmmmmooc",
        "  ccoommocc  ",
        "   a  a  a   ",
      ],
      PixelColors.enemyBigEye
    );
  }

  private getFrogFrame(time: number, state: EntityAnimationState): AnimatedSpriteFrame {
    const jump = state === "attack" || Math.sin(time * 7) > 0.45;
    return this.frame(
      jump
        ? [
            "   g     g   ",
            "  gegooogeg  ",
            " googggggoog ",
            " goggeegggog ",
            "  oogggggoo  ",
            " a  gggg  a ",
            "a         a  ",
          ]
        : [
            "  g       g  ",
            " gegooogeg  ",
            "googgggggoog",
            "goggeegggog ",
            " ooggggggoo ",
            "  a gggg a  ",
            " a  a  a  a ",
          ],
      PixelColors.enemyFrog
    );
  }

  private getPlayerFrame(time: number, isMoving: boolean, state: EntityAnimationState): AnimatedSpriteFrame {
    const upperBody = state === "hit"
      ? [
          "    oooo     ",
          "  oobbbboo   ",
          " obcwwccbo   ",
          " obcpcpcbo   ",
          "  obbbbbbo   ",
          " oopmmmboo   ",
          "o   mmmb  p  ",
        ]
      : state === "attack" ? [
          "    oooo     ",
          "  oobbbboo   ",
          " obcwwccbo   ",
          " obccccdbo   ",
          "  obbbbbbo pp",
          " oopmmmbo pcp",
          "o   mmmb  pp ",
        ]
      : [
          "    oooo     ",
          "  oobbbboo   ",
          " obcwwccbo   ",
          " obccccdbo   ",
          "  obbbbbbo   ",
          "  opmmmmpo   ",
          "  o mmmm o   ",
        ];

    return this.frame(
      [...upperBody, ...this.getPlayerLegRows(time, isMoving)],
      PixelColors.player
    );
  }

  private getPlayerLegRows(time: number, isMoving: boolean): readonly string[] {
    const standingLegs = ["   oammao    ", "   aa  aa    ", "   aa  aa    "] as const;
    if (!isMoving) return standingLegs;

    const phase = Math.floor(time * 5.2) % 2;
    const walkCycle = [
      standingLegs,
      ["   oammao    ", "   aa  aa    ", "  aa    aa   "],
    ] as const;

    return walkCycle[phase];
  }
}

export const animatedSpriteRenderer = new AnimatedSpriteRenderer();
