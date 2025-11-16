# 如何添加新技能 - 快速指南

## 🎯 3步添加新技能

### 步骤 1: 打开技能系统文件
```
client/src/systems/SkillSystem.ts
```

### 步骤 2: 在 `registerDefaultSkills()` 方法中添加

```typescript
// 找到合适的位置（按类型分类）
// ==================== 你的新技能类型 ====================
this.registerSkill({
  id: "your_skill_id",          // ✅ 唯一ID（英文）
  name: "你的技能名",            // ✅ 显示名称
  description: "技能描述文字",   // ✅ 显示描述
  type: "attack",               // ✅ 类型: health/attack/shield/special
  icon: "⚔️",                   // ✅ 显示图标
  
  // ✅ 技能效果
  apply: (player: Player) => {
    // 在这里修改玩家属性
    player.attackDamage += 10;
    return true; // 返回true表示成功
  },
  
  // ✅ 是否可选
  canSelect: (player: Player) => {
    return true; // true=可重复选择，false=只能选一次
  },
});
```

### 步骤 3: 保存文件

完成！游戏会自动加载新技能。

---

## 📝 技能模板

### 模板 1: 简单属性增强

```typescript
this.registerSkill({
  id: "super_speed",
  name: "超级速度",
  description: "攻击速度 +50%",
  type: "attack",
  icon: "⚡",
  apply: (player: Player) => {
    player.attackSpeed *= 1.5;
    return true;
  },
  canSelect: () => true, // 可重复选择
});
```

### 模板 2: 一次性技能

```typescript
this.registerSkill({
  id: "double_jump",
  name: "二段跳",
  description: "获得二段跳能力",
  type: "special",
  icon: "🦘",
  apply: (player: Player) => {
    player.canDoubleJump = true;
    return true;
  },
  canSelect: (player: Player) => !player.canDoubleJump, // 只能选一次
});
```

### 模板 3: 条件技能

```typescript
this.registerSkill({
  id: "ultimate_power",
  name: "终极力量",
  description: "需要10级解锁，攻击力+100%",
  type: "special",
  icon: "💥",
  apply: (player: Player) => {
    player.attackDamage *= 2.0;
    return true;
  },
  canSelect: (player: Player) => {
    return player.level >= 10 && player.attackDamage < 100;
  },
});
```

### 模板 4: 叠加技能

```typescript
this.registerSkill({
  id: "armor_plating",
  name: "装甲镀层",
  description: "护盾+15（可叠加，最多5层）",
  type: "shield",
  icon: "🛡️",
  apply: (player: Player) => {
    player.armorStacks = (player.armorStacks || 0) + 1;
    player.maxShield += 15;
    player.shield = player.maxShield;
    return true;
  },
  canSelect: (player: Player) => (player.armorStacks || 0) < 5,
});
```

---

## 🎨 常用玩家属性

可以在技能中修改的属性：

### 基础属性
```typescript
player.health        // 当前生命
player.maxHealth     // 最大生命
player.shield        // 当前护盾
player.maxShield     // 最大护盾
player.level         // 等级
player.exp           // 经验值
```

### 战斗属性
```typescript
player.attackDamage     // 攻击力
player.attackSpeed      // 攻击速度
player.attackRange      // 攻击范围
player.bulletCount      // 子弹数量
player.bulletSizeMultiplier  // 子弹大小倍数
```

### 移动属性
```typescript
player.moveSpeed     // 移动速度
player.radius        // 碰撞半径
```

### 特殊属性
```typescript
player.hasPierce      // 穿透效果
player.hasLifeSteal   // 生命汲取
player.weapons        // 武器列表
```

### 自定义属性（随意添加）
```typescript
player.critChance = 0.15;        // 暴击率
player.dodgeChance = 0.1;        // 闪避率
player.vampireAura = true;       // 吸血光环
player.damageMultiplier = 1.5;   // 伤害倍数
// ... 任意自定义
```

---

## 🚀 高级技巧

### 技巧 1: 技能效果叠加

```typescript
// 不要用 = 赋值，用 *= 或 += 累加
apply: (player) => {
  player.attackDamage *= 1.1; // ✅ 每次+10%
  // player.attackDamage = 15; // ❌ 会覆盖之前的增强
  return true;
}
```

### 技巧 2: 安全的属性初始化

```typescript
apply: (player) => {
  // 确保属性存在，否则初始化
  player.customStat = (player.customStat || 0) + 10;
  return true;
}
```

### 技巧 3: 技能组合检测

```typescript
canSelect: (player) => {
  // 需要先有某个技能
  const hasPierce = player.hasPierce;
  const hasLifeSteal = player.hasLifeSteal;
  return hasPierce && hasLifeSteal;
}
```

### 技巧 4: 武器技能

```typescript
apply: (player) => {
  // 需要通过回调添加武器
  if (this.weaponAddCallback) {
    this.weaponAddCallback(player, "orbital");
    return true;
  }
  return false;
}
```

---

## ⚠️ 注意事项

### 不要做的事

❌ **不要修改Player接口**（如果只是临时属性）
```typescript
// 使用可选属性或Map存储
player.customAttributes = player.customAttributes || {};
player.customAttributes['mySkill'] = true;
```

❌ **不要在apply中执行异步操作**
```typescript
apply: async (player) => {  // ❌ 不要用async
  await fetch(...);         // ❌ 不要等待
}
```

❌ **不要直接修改GameEngine状态**
```typescript
apply: (player) => {
  // ❌ 不能访问 this.enemies 等
  // ✅ 只能修改 player 对象
}
```

### 应该做的事

✅ **使用配置常量**
```typescript
apply: (player) => {
  player.attackDamage += GAME_CONFIG.SKILLS.ATTACK_BOOST;
}
```

✅ **返回明确的结果**
```typescript
apply: (player) => {
  if (someCondition) {
    return false; // 失败
  }
  player.stat += 10;
  return true; // 成功
}
```

✅ **添加注释**
```typescript
this.registerSkill({
  id: "complex_skill",
  // ... 对于复杂技能，添加详细注释
  apply: (player) => {
    // 说明这里的逻辑
    return true;
  },
});
```

---

## 📊 技能类型指南

| 类型 | 适用场景 | 图标建议 |
|------|---------|---------|
| **health** | 生命相关 | ❤️ 💚 🩹 |
| **attack** | 攻击相关 | ⚔️ 🔫 💥 ⚡ 🎯 |
| **shield** | 防御相关 | 🛡️ 🔰 |
| **special** | 特殊能力 | ✨ 🌟 💫 🔮 |

---

## 🎓 最佳实践

1. **技能ID使用蛇形命名法**: `super_attack` 不是 `SuperAttack`
2. **技能名称简短有力**: 2-4个字
3. **描述包含数值**: "攻击+5" 不是 "提升攻击"
4. **图标具有代表性**: 一眼能看出技能类型
5. **可选性逻辑清晰**: 避免复杂的条件判断

---

**完成日期**: 2025-11-08  
**维护难度**: ⭐☆☆☆☆ (非常简单)  
**扩展性**: ⭐⭐⭐⭐⭐ (极易扩展)

🚀 **现在添加新技能只需要1分钟！**

