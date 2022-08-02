export let autoBattle = {
  // Manually set thingys
  usingRealTimeOffline: false,

  // For set ethereal hits.
  setEthChance: false,
  ethRolls: [],
  leftoverChance: 0,

  total: 0,
  eth: 0,

  // Controller stuff, it will change these to something meaningful on import
  onEnemyDied: function () {},
  onTrimpDied: function () {},

  // GS stuff
  frameTime: 300,
  speed: 1,
  enemyLevel: 1,
  maxEnemyLevel: 1,
  autoLevel: false, // Changed from false
  dust: 0,
  shards: 0,
  shardDust: 0,
  trimp: null,
  enemy: null,
  seed: 4568654,
  enemiesKilled: 0,
  sessionEnemiesKilled: 0,
  sessionTrimpsKilled: 0,
  notes: "&nbsp;",
  popupMode: "items",
  battleTime: 0,
  lastSelect: "",
  lastActions: [],
  activeContract: "",
  lootAvg: {
    accumulator: 0,
    counter: 0,
  },
  rings: {
    level: 1,
    mods: [],
  },
  template: function () {
    return {
      level: 1,
      isTrimp: false,
      baseHealth: 50,
      health: 50,
      maxHealth: 50,
      baseAttack: 5,
      attack: 5,
      baseAttackSpeed: 5000,
      attackSpeed: 5000,
      lastAttack: 0,
      shockChance: 0,
      shockMod: 0,
      bleedChance: 0,
      bleedMod: 0,
      bleedTime: 0,
      poisonChance: 0,
      poisonTime: 0,
      poisonMod: 0,
      poisonStack: 2,
      poisonRate: 1,
      poisonTick: 1000,
      poisonHeal: 0,
      defense: 0,
      lifesteal: 0,
      shockResist: 0,
      poisonResist: 0,
      bleedResist: 0,
      lifestealResist: 0,
      slowAura: 1,
      damageTakenMult: 1,
      enrageMult: 1.25,
      enrageFreq: 60,
      explodeDamage: 0,
      explodeFreq: -1,
      lastExplode: 0,
      berserkMod: -1,
      berserkStack: 0,
      ethChance: 0,
      dmgTaken: 0,
      dustMult: 0,
      gooStored: 0,
      lastGoo: -1,
      bleed: {
        time: 0,
        mod: 0,
      },
      poison: {
        time: 0,
        mod: 0,
        lastTick: 0,
        stacks: 0,
        expired: false,
        hitsAtMax: 0,
      },
      shock: {
        time: 0,
        mod: 0,
        count: 0,
      },
    };
  },

  unlockAllItems: function () {
    for (var item in this.items) {
      this.items[item].owned = true;
    }
  },

  resetAll: function () {
    this.dust = 0;
    this.shards = 0;
    this.trimp = null;
    this.enemy = null;
    this.enemiesKilled = 0;
    this.resetStats();
    this.resetCombat();
  },

  getItemOrder: function () {
    var items = [];
    for (var item in this.items) {
      items.push({
        name: item,
        zone: this.items[item].zone ? this.items[item].zone : 0,
      });
    }
    function itemSort(a, b) {
      if (a.zone > b.zone) return 1;
      if (a.zone < b.zone) return -1;
    }
    items.sort(itemSort);
    return items;
  },

  getContracts: function () {
    var items = this.getItemOrder();
    var contracts = [];
    for (var x = 0; x < items.length; x++) {
      if (!this.items[items[x].name].owned) {
        contracts.push(items[x].name);
        if (contracts.length >= 3) return contracts;
      }
    }
    return contracts;
  },

  contractPrice: function (item) {
    var itemObj = this.items[item];
    var dif = itemObj.zone - 75;
    var total = 100 * Math.pow(1.2023, dif);
    if (itemObj.dustType == "shards") total /= 1e9;
    return total;
  },

  oneTimerPrice: function (item) {
    var itemObj = this.oneTimers[item];
    var allItems = this.getItemOrder();
    var index = itemObj.requiredItems - 1;
    if (itemObj.useShards) index++;
    if (index <= 6) return 10000;
    var lastItem = allItems[index];
    var contractPrice = this.contractPrice(lastItem.name);
    if (itemObj.useShards) return Math.ceil(contractPrice / 2);
    return Math.ceil(contractPrice * 1000) / 10;
  },

  items: {
    //Starting items
    Menacing_Mask: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      description: function () {
        return (
          "-" +
          prettify((1 - this.trimpAttackSpeed()) * 100) +
          "% Huffy Attack Time, +" +
          prettify((1 - this.enemyAttackSpeed()) * -100) +
          "% Enemy Attack Time."
        );
      },
      upgrade: "-2% Huffy Attack Time, +2% Enemy Attack Time (compounding)",
      trimpAttackSpeed: function () {
        return Math.pow(0.98, this.level);
      },
      enemyAttackSpeed: function () {
        return 1.05 * Math.pow(1.02, this.level - 1);
      },
      doStuff: function () {
        autoBattle.trimp.attackSpeed *= this.trimpAttackSpeed();
        autoBattle.enemy.attackSpeed *= this.enemyAttackSpeed();
      },
      priceMod: 5,
    },
    Sword: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      description: function () {
        return "+" + this.effect() + " attack damage.";
      },
      upgrade: "+1 attack damage",
      effect: function () {
        return this.level;
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.effect();
      },
      priceMod: 2.5,
    },
    Armor: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      description: function () {
        return "+" + prettify(this.effect()) + " base health.";
      },
      upgrade: "+20 base health",
      effect: function () {
        return 20 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.maxHealth += this.effect();
      },
      priceMod: 5,
    },
    Rusty_Dagger: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      description: function () {
        return (
          "Can create a Bleed on the Enemy for 10 seconds. +" +
          prettify(this.bleedMod() * 100) +
          "% Bleed Damage" +
          (this.level >= 5 ? ", +" + prettify(this.attack()) + " Attack" : "") +
          ". +" +
          prettify(this.bleedChance()) +
          "% Bleed Chance, doubled if the Enemy is Shocked or Poisoned."
        );
      },
      upgrade:
        "+10 Attack and +20% Bleed Damage per 5 levels. +5% Bleed Damage and +3% Bleed Chance",
      attack: function () {
        return Math.floor(this.level / 5) * 10;
      },
      bleedChance: function () {
        return 17 + 3 * this.level;
      },
      bleedMod: function () {
        var val = 0.1 + 0.05 * this.level;
        val += Math.floor(this.level / 5) * 0.2;
        return val;
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.bleedMod += this.bleedMod();
        if (autoBattle.trimp.bleedTime < 10000)
          autoBattle.trimp.bleedTime = 10000;
        autoBattle.trimp.bleedChance +=
          autoBattle.enemy.poison.time > 0 || autoBattle.enemy.shock.time > 0
            ? this.bleedChance() * 2
            : this.bleedChance();
      },
      startPrice: 25,
      priceMod: 4,
    },
    Fists_of_Goo: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      description: function () {
        return (
          "Can create a Poison on the Enemy for 10 seconds. +" +
          prettify(this.effect()) +
          " Poison Damage. +25% Poison Chance, doubled if the enemy is bleeding or shocked."
        );
      },
      upgrade: "+1 poison damage",
      effect: function () {
        return this.level;
      },
      doStuff: function () {
        autoBattle.trimp.poisonMod += this.effect();
        autoBattle.trimp.poisonChance +=
          autoBattle.enemy.shock.time > 0 || autoBattle.enemy.bleed.time > 0
            ? 50
            : 25;
        if (autoBattle.trimp.poisonTime < 10000)
          autoBattle.trimp.poisonTime = 10000;
      },
      priceMod: 6,
      startPrice: 50,
    },
    Battery_Stick: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      description: function () {
        return (
          "Can create a Shock on the Enemy for 10 seconds. +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage. +35% Shock Chance, doubled if the enemy is bleeding or poisoned."
        );
      },
      upgrade: "+10% Shock Damage",
      shockMod: function () {
        return 0.15 + 0.1 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.shockChance +=
          autoBattle.enemy.bleed.time > 0 || autoBattle.enemy.poison.time > 0
            ? 70
            : 35;
        autoBattle.trimp.shockMod += this.shockMod();
        autoBattle.trimp.shockTime = 10000;
      },
      startPrice: 25,
      priceMod: 4,
    },
    Pants: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      description: function () {
        return "+" + prettify(this.effect()) + " Defense.";
      },
      upgrade: "+1 Defense",
      effect: function () {
        return this.level;
      },
      doStuff: function () {
        autoBattle.trimp.defense += this.effect();
      },
    },
    //unlockables

    //raincoat, 75
    //pouch 78
    Chemistry_Set: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 81,
      description: function () {
        var stacks = this.poisonStack();
        return (
          "+50% Poison Chance if the Enemy is not already Poisoned. +" +
          this.defenseEffect() +
          " Defense if the Enemy is Poisoned. +" +
          prettify(this.poisonChance()) +
          "% Poison Chance. Poisons you inflict can stack " +
          stacks +
          " more time" +
          needAnS(stacks) +
          "."
        );
      },
      upgrade:
        "+1 Max Poison Stack per 4 levels. +1 Defense, +4% standard Poison Chance",
      defenseEffect: function () {
        return this.level;
      },
      poisonChance: function () {
        return 6 + this.level * 4;
      },
      poisonStack: function () {
        var levels = Math.floor(this.level / 4);
        return 1 + levels;
      },
      doStuff: function () {
        if (autoBattle.enemy.poison.time > 0)
          autoBattle.trimp.defense += this.defenseEffect();
        else autoBattle.trimp.poisonChance += 50;
        autoBattle.trimp.poisonChance += this.poisonChance();
        autoBattle.trimp.poisonStack += this.poisonStack();
      },
      priceMod: 4,
      startPrice: 200,
    },
    //bad medkit - 84
    Comfy_Boots: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 87,
      description: function () {
        return (
          "+" +
          prettify(this.defense()) +
          " Defense. +" +
          prettify(this.resistance()) +
          "% to all Resistances."
        );
      },
      upgrade: "+2 Defense, +5% Resist",
      defense: function () {
        return 2 + this.level * 2;
      },
      resistance: function () {
        return this.level * 5;
      },
      doStuff: function () {
        autoBattle.trimp.defense += this.defense();
        var res = this.resistance();
        autoBattle.trimp.bleedResist += res;
        autoBattle.trimp.poisonResist += res;
        autoBattle.trimp.shockResist += res;
      },
      startPrice: 430,
    },
    //Labcoat 90
    Lifegiving_Gem: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 93,
      description: function () {
        return (
          "Increases Dust gained from Enemies by " +
          prettify(this.effect() * 100) +
          "% PLUS your Lifesteal amount when the Enemy dies."
        );
      },
      upgrade: "+10% Dust Gained",
      effect: function () {
        return 0.2 + 0.1 * this.level;
      },
      dustIncrease: function () {
        return (
          this.effect() +
          Math.max(
            0,
            autoBattle.trimp.lifesteal - autoBattle.enemy.lifestealResist
          )
        );
      },
      startPrice: 650,
      priceMod: 4,
    },
    Mood_Bracelet: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 95,
      description: function () {
        return (
          "-" +
          prettify((1 - this.effect()) * 100) +
          "% Attack Time and +" +
          prettify(this.defense()) +
          " Defense if the Enemy is not Bleeding."
        );
      },
      upgrade: "-3% Attack Time (compounding), +4 Defense",
      effect: function () {
        return 0.8765 * Math.pow(0.97, this.level);
      },
      defense: function () {
        return 6 + 4 * this.level;
      },
      doStuff: function () {
        if (autoBattle.enemy.bleed.time <= 0) {
          autoBattle.trimp.attackSpeed *= this.effect();
          autoBattle.trimp.defense += this.defense();
        }
      },
      priceMod: 4,
      startPrice: 1100,
    },
    Hungering_Mold: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 98,
      description: function () {
        return (
          "Heal for " +
          prettify(this.healAmt()) +
          " per stack of Poison whenever one of your Poisons deals damage. Your Poisons tick " +
          prettify((1 - this.tickMult()) * 100) +
          "% faster."
        );
      },
      upgrade: "+0.5 Heal on Poison Tick, +1% Poison Tick Speed",
      healAmt: function () {
        return 0.5 + 0.5 * this.level;
      },
      tickMult: function () {
        return 0.909 * Math.pow(0.99, this.level);
      },
      doStuff: function () {
        autoBattle.trimp.poisonTick *= this.tickMult();
        autoBattle.trimp.poisonHeal += this.healAmt();
      },
      priceMod: 5,
      startPrice: 2000,
    },
    Recycler: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 100,
      description: function () {
        return (
          "+" +
          prettify(this.effect() * 100) +
          "% Lifesteal. Huffy's Lifesteal heals twice as much off of Bleed damage."
        );
      },
      upgrade: "+5% Lifesteal",
      effect: function () {
        return 0.2 + 0.05 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.lifesteal += this.effect();
      },
      startPrice: 2800,
      priceMod: 5,
    },
    Shining_Armor: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 103,
      description: function () {
        return (
          "+" +
          prettify(this.defense()) +
          " Defense. +" +
          prettify(this.health()) +
          " Health."
        );
      },
      upgrade: "+6 defense, +100 health",
      defense: function () {
        return 14 + 6 * this.level;
      },
      health: function () {
        return 200 + this.level * 100;
      },
      doStuff: function () {
        autoBattle.trimp.defense += this.defense();
        autoBattle.trimp.maxHealth += this.health();
      },
      priceMod: 5,
      startPrice: 4000,
    },
    Shock_and_Awl: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 105,
      description: function () {
        return (
          "Can create a Shock on an enemy for 20 seconds. +" +
          prettify(this.attack()) +
          " Attack, +" +
          prettify(this.shockChance()) +
          "% Shock Chance, +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage. -25% Attack Time if the Enemy is not Shocked, +25% Lifesteal if the Enemy is Shocked."
        );
      },
      upgrade: "+4 Attack, +10% Shock Chance, +10% Shock Damage",
      attack: function () {
        return 6 + 4 * this.level;
      },
      shockChance: function () {
        return 20 + 10 * this.level;
      },
      shockMod: function () {
        return 0.4 + 0.1 * this.level;
      },
      doStuff: function () {
        if (autoBattle.trimp.shockTime < 20000)
          autoBattle.trimp.shockTime = 20000;
        autoBattle.trimp.shockMod += this.shockMod();
        autoBattle.trimp.shockChance += this.shockChance();
        autoBattle.trimp.attack += this.attack();
        if (autoBattle.enemy.shock.time <= 0)
          autoBattle.trimp.attackSpeed *= 0.75;
        else autoBattle.trimp.lifesteal += 0.25;
      },
      priceMod: 5,
      startPrice: 5750,
    },
    //spiked gloves - 108
    Tame_Snimp: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 110,
      description: function () {
        return (
          "Can create a Poison on the Enemy for 10 seconds. +" +
          prettify(this.poisonChance()) +
          "% Poison Chance, +" +
          prettify(this.poisonMod()) +
          " Poison Damage. Enemy Attack is reduced by 15% while the Enemy is Poisoned."
        );
      },
      upgrade: "+10% Poison Chance, +2 Poison Damage",
      poisonChance: function () {
        return 30 + 10 * this.level;
      },
      poisonMod: function () {
        return 5 + 2 * this.level;
      },
      doStuff: function () {
        if (autoBattle.enemy.poison.time > 0) autoBattle.enemy.attack *= 0.85;
        if (autoBattle.trimp.poisonTime < 10000)
          autoBattle.trimp.poisonTime = 10000;
        autoBattle.trimp.poisonChance += this.poisonChance();
        autoBattle.trimp.poisonMod += this.poisonMod();
      },
      priceMod: 5.5,
      startPrice: 15000,
    },
    Lich_Wraps: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 113,
      description: function () {
        return (
          "When Poisoned, Bleeding, or Shocked, gain +" +
          prettify(this.attack()) +
          " Attack, -15% Attack Time, +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal, and take " +
          prettify((1 - this.damageTakenMult()) * 100) +
          "% less damage from all sources."
        );
      },
      upgrade:
        "+6 Attack, +6% Lifesteal, -3% damage taken (compounding, never reaching 75%)",
      damageTakenMult: function () {
        return (0.825 * Math.pow(0.93, this.level - 1)) / 1.5 + 0.25;
      },
      attack: function () {
        return 9 + 6 * this.level;
      },
      lifesteal: function () {
        return 0.09 + 0.06 * this.level;
      },
      doStuff: function () {
        if (
          autoBattle.trimp.bleed.time > 0 ||
          autoBattle.trimp.shock.time > 0 ||
          autoBattle.trimp.poison.time > 0
        ) {
          autoBattle.trimp.damageTakenMult *= this.damageTakenMult();
          autoBattle.trimp.attack += this.attack();
          autoBattle.trimp.lifesteal += this.lifesteal();
          autoBattle.trimp.attackSpeed *= 0.85;
        }
      },
      priceMod: 4,
      startPrice: 25000,
    },
    Wired_Wristguards: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 115,
      description: function () {
        return (
          "+" +
          prettify(this.defense()) +
          " Defense, +" +
          prettify(this.shockChance()) +
          "% Shock Chance, +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage, +50% to all Resistances. If the Enemy is Shocked, increase its Attack Time by " +
          prettify((this.enemySpeed() - 1) * 100) +
          "%."
        );
      },
      upgrade:
        "+3 Defense, +15% Shock Chance, +15% Shock Damage, +2% Enemy Attack Time",
      defense: function () {
        return 7 + 3 * this.level;
      },
      shockChance: function () {
        return 25 + 15 * this.level;
      },
      shockMod: function () {
        return 0.25 + 0.15 * this.level;
      },
      enemySpeed: function () {
        return 1.18 + 0.02 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.defense += this.defense();
        autoBattle.trimp.shockChance += this.shockChance();
        autoBattle.trimp.shockMod += this.shockMod();
        autoBattle.trimp.shockResist += 50;
        autoBattle.trimp.poisonResist += 50;
        autoBattle.trimp.bleedResist += 50;
        if (autoBattle.enemy.shock.time > 0) {
          autoBattle.enemy.attackSpeed *= this.enemySpeed();
        }
      },
      startPrice: 44000,
      priceMod: 4.5,
    },

    Sword_and_Board: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 120,
      description: function () {
        return (
          "+" +
          prettify(this.attack()) +
          " Attack, +" +
          prettify(this.defense()) +
          " Defense, +" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.resists()) +
          "% to all Resistances."
        );
      },
      upgrade: "+5 Attack, +50 Health, +4 Defense, +10% Resists",
      attack: function () {
        return 10 + 5 * this.level;
      },
      defense: function () {
        return 6 + 4 * this.level;
      },
      health: function () {
        return 350 + 50 * this.level;
      },
      resists: function () {
        return 10 + 10 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.defense += this.defense();
        autoBattle.trimp.maxHealth += this.health();
        var resists = this.resists();
        autoBattle.trimp.shockResist += resists;
        autoBattle.trimp.poisonResist += resists;
        autoBattle.trimp.bleedResist += resists;
      },
      priceMod: 5,
      startPrice: 90000,
    },
    Bilious_Boots: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 122,
      description: function () {
        return (
          "+" +
          prettify(this.poisonMod()) +
          " Poison Damage, +1 Max Poison Stack, +" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.resists()) +
          "% to all Resistances."
        );
      },
      upgrade: "+3 Poison Damage, +50 Health, +10% Resists",
      poisonMod: function () {
        return 7 + 3 * this.level;
      },
      health: function () {
        return 150 + 50 * this.level;
      },
      resists: function () {
        return 10 + 10 * this.level;
      },
      doStuff: function () {
        var resists = this.resists();
        autoBattle.trimp.shockResist += resists;
        autoBattle.trimp.poisonResist += resists;
        autoBattle.trimp.bleedResist += resists;
        autoBattle.trimp.poisonMod += this.poisonMod();
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.poisonStack++;
      },
      priceMod: 5,
      startPrice: 100000,
    },
    Bloodstained_Gloves: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 123,
      description: function () {
        return (
          "+" +
          prettify(this.bleedChance()) +
          "% to Bleed Chance, +" +
          prettify(this.attack()) +
          " Attack, -25% Enemy Attack Time, -25% Enemy Attack Damage. Fills up " +
          prettify(this.barFill() * 100) +
          "% of your Attack Speed bar whenever you cause or receive a Bleed."
        );
      },
      upgrade: "+5% Bleed Chance, +2 Attack, +5% bar filled on Bleed",
      attack: function () {
        return 6 + this.level * 2;
      },
      onBleed: function () {
        autoBattle.trimp.lastAttack +=
          autoBattle.trimp.attackSpeed * this.barFill();
      },
      bleedChance: function () {
        return 25 + 5 * this.level;
      },
      barFill: function () {
        return 0.2 + 0.05 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.bleedChance += this.bleedChance();
        autoBattle.enemy.attackSpeed *= 0.75;
        autoBattle.enemy.attack *= 0.75;
        autoBattle.trimp.attack += this.attack();
      },
      startPrice: 160000,
    },
    Unlucky_Coin: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 125,
      description: function () {
        return (
          "+" +
          prettify(this.attack()) +
          " Attack. +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal if the Enemy is not Poisoned or Bleeding."
        );
      },
      upgrade: "+4 Attack, +10% Lifesteal",
      attack: function () {
        return 11 + this.level * 4;
      },
      lifesteal: function () {
        return 0.2 + this.level * 0.1;
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        if (
          autoBattle.enemy.bleed.time <= 0 &&
          autoBattle.enemy.poison.time <= 0
        ) {
          autoBattle.trimp.lifesteal += this.lifesteal();
        }
      },
      priceMod: 5,
      startPrice: 400000,
    },
    Eelimp_in_a_Bottle: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 130,
      description: function () {
        return (
          "+" +
          prettify(this.shockChance()) +
          "% Shock Chance, +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage, +" +
          prettify(this.shockResist()) +
          "% Shock Resist. -" +
          prettify((1 - this.attackSpeed()) * 100) +
          "% Attack Time if the Enemy is Shocked. When you Shock an Enemy, they lose all progress towards their attack. +" +
          prettify(this.attack()) +
          " Attack for each time you've Shocked this Enemy (up to 10 times)."
        );
      },
      upgrade:
        "+5% Shock Chance, +5% Shock Damage, -5% Attack Time, +5% Shock Resist, +1 Attack per Shock",
      attackSpeed: function () {
        return 0.9 * Math.pow(0.95, this.level);
      },
      shockChance: function () {
        return 35 + 5 * this.level;
      },
      shockMod: function () {
        return 0.65 + 0.1 * this.level;
      },
      shockResist: function () {
        return 10 + 5 * this.level;
      },
      attack: function () {
        return 2 + this.level;
      },
      doStuff: function () {
        autoBattle.trimp.shockMod += this.shockMod();
        autoBattle.trimp.shockChance += this.shockChance();
        if (autoBattle.enemy.shock.time >= 0)
          autoBattle.trimp.attackSpeed *= this.attackSpeed();
        autoBattle.trimp.attack +=
          Math.min(10, autoBattle.enemy.shock.count) * this.attack();
        autoBattle.trimp.shockResist += this.shockResist();
      },
      priceMod: 5,
      startPrice: 1000000,
    },
    Big_Cleaver: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 133,
      description: function () {
        return (
          "Can create a Bleed on the Enemy for 10 seconds. +100% Bleed Chance if the Enemy is at full Health, otherwise +25%. +" +
          prettify(this.attack()) +
          " Attack if the Enemy is Bleeding. +" +
          prettify(this.bleedMod() * 100) +
          "% Bleed Damage, +" +
          prettify(this.health()) +
          " Health."
        );
      },
      upgrade: "+2 Attack, +25% Bleed Damage, +100 Health",
      attack: function () {
        return 30 + this.level * 2;
      },
      bleedMod: function () {
        return 1 + 0.25 * this.level;
      },
      health: function () {
        return 500 + 100 * this.level;
      },
      doStuff: function () {
        if (autoBattle.enemy.health == autoBattle.enemy.maxHealth)
          autoBattle.trimp.bleedChance += 100;
        else autoBattle.trimp.bleedChance += 25;
        autoBattle.trimp.maxHealth += this.health();
        if (autoBattle.enemy.bleed.time > 0)
          autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.bleedMod += this.bleedMod();
        if (autoBattle.trimp.bleedTime <= 10000)
          autoBattle.trimp.bleedTime = 10000;
      },
      priceMod: 4,
      startPrice: 3000000,
    },
    The_Globulator: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 135,
      description: function () {
        return (
          "+" +
          prettify(this.defense()) +
          " Defense and +" +
          prettify(this.health()) +
          " Max Health if the Enemy is Poisoned. On adding a new Poison Stack to an Enemy that hasn't had poisons expire, heal for half of this item's Max Health. If the Enemy is at Max Poison Stacks, non-Lifesteal healing effects on you are doubled. +" +
          prettify(this.poisonMod()) +
          " Poison Damage."
        );
      },
      upgrade: "+5 Defense, +500 Health, +10 Poison Damage",
      defense: function () {
        return 25 + 5 * this.level;
      },
      health: function () {
        return 500 + 500 * this.level;
      },
      poisonMod: function () {
        return 15 + 10 * this.level;
      },
      onPoisonStack: function (stacks) {
        if (stacks == 1) autoBattle.trimp.maxHealth += this.health();
        if (autoBattle.enemy.poison.expired) return;
        autoBattle.trimp.health += this.health() / 2;
        if (autoBattle.trimp.health > autoBattle.trimp.maxHealth)
          autoBattle.trimp.health = autoBattle.trimp.maxHealth;
      },
      doStuff: function () {
        if (autoBattle.enemy.poison.time > 0) {
          autoBattle.trimp.maxHealth += this.health();
          autoBattle.trimp.defense += this.defense();
        }
        autoBattle.trimp.poisonMod += this.poisonMod();
      },
      startPrice: 5e6,
      priceMod: 10,
    },
    Metal_Suit: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 138,
      description: function () {
        return (
          "+" +
          prettify(this.defense()) +
          " Defense, +" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.resist()) +
          "% Bleed Resist. If Huffy has an item that can create a Bleed, gain +" +
          prettify(this.attack()) +
          " Attack."
        );
      },
      upgrade: "+30 Defense, +1000 Health, +20% Bleed Resist, +5 Attack",
      attack: function () {
        return 10 + 5 * this.level;
      },
      defense: function () {
        return -10 + this.level * 30;
      },
      health: function () {
        return -500 + this.level * 1000;
      },
      resist: function () {
        return 30 + 20 * this.level;
      },
      doStuff: function () {
        if (
          autoBattle.items.Rusty_Dagger.equipped ||
          autoBattle.items.Big_Cleaver.equipped
        )
          autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.defense += this.defense();
        autoBattle.trimp.bleedResist += this.resist();
      },
      priceMod: 10,
      startPrice: 6e6,
    },
    Nozzled_Goggles: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 140,
      description: function () {
        return (
          "The Enemy is always Shocked, taking at least " +
          prettify(this.shockMod() * 100) +
          "% more damage. +" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.resist()) +
          "% Poison Resist, +3 Maximum Poison Stacks."
        );
      },
      upgrade: "+20% PermaShock Damage, +500 Health, 20% Poison Resist",
      shockMod: function () {
        return 0.2 * this.level;
      },
      health: function () {
        return -500 + this.level * 1000;
      },
      resist: function () {
        return 20 * this.level;
      },
      doStuff: function () {
        var enemy = autoBattle.enemy;
        if (enemy.shock.time <= 0 || enemy.shock.mod < this.shockMod()) {
          enemy.shock.time = 9999999;
          enemy.shock.mod = this.shockMod();
        }
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.poisonResist += this.resist();
        autoBattle.trimp.poisonStack += 3;
      },
      startPrice: 7e6,
      priceMod: 10,
    },
    Sundering_Scythe: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 143,
      description: function () {
        return (
          "-" +
          prettify((1 - this.attackTime()) * 100) +
          "% Attack Time, +" +
          prettify(this.attack()) +
          " Attack, +" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal. Your Shocks last a maximum of 10 seconds, and your Bleeds can be reapplied when below 5 seconds."
        );
      },
      upgrade: "-5% Attack Time, +5 Attack, +250 Health, +5% Lifesteal",
      attackTime: function () {
        return 0.842 * Math.pow(0.95, this.level);
      },
      attack: function () {
        return 15 + 5 * this.level;
      },
      health: function () {
        return 500 + 250 * this.level;
      },
      lifesteal: function () {
        return 0.15 + 0.05 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.attackSpeed *= this.attackTime();
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.lifesteal += this.lifesteal();
      },
      startPrice: 15e6,
      priceMod: 10,
    },
    //Shank 145
    Plague_Bringer: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 148,
      description: function () {
        return (
          "Your Poisons tick +" +
          prettify((1 - this.tickMult()) * 100) +
          "% faster. +" +
          prettify(this.eachPoison()) +
          " Poison Damage for every percentage point of Bleed or Shock resist on the Enemy. Heal for " +
          prettify(this.healAmt()) +
          " per stack of Poison when your Poisons deal damage."
        );
      },
      upgrade:
        "+2% Poison Tick Rate, +0.05 Poison Damage per Enemy Resist, +5 Heal on Poison Tick",
      tickMult: function () {
        return 0.816 * Math.pow(0.98, this.level);
      },
      eachPoison: function () {
        return 0.05 + 0.05 * this.level;
      },
      healAmt: function () {
        return 5 + 5 * this.level;
      },
      poisonMod: function () {
        var res = autoBattle.enemy.bleedResist + autoBattle.enemy.shockResist;
        return Math.floor(res * this.eachPoison());
      },
      doStuff: function () {
        autoBattle.trimp.poisonMod += this.poisonMod();
        autoBattle.trimp.poisonTick *= this.tickMult();
        autoBattle.trimp.poisonHeal += this.healAmt();
      },
      startPrice: 70e6,
      priceMod: 10,
    },
    Very_Large_Slime: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 150,
      description: function () {
        return (
          "Can create a Poison for 20 seconds. +" +
          prettify(this.poisonChance()) +
          "% Poison Chance, +" +
          prettify(this.poisonMod()) +
          " Poison Damage, +" +
          prettify(this.defense()) +
          " Defense, +" +
          prettify(this.health()) +
          " Health. Every third hit against an Enemy with Max Poison Stacks adds another Max Stack (up to +" +
          prettify(this.maxStacks()) +
          " Max Stacks)."
        );
      },
      upgrade:
        "+15% Poison Chance, +20 Poison Damage, +50 Defense, +500 Health, +2 Max Stacks",
      poisonChance: function () {
        return 35 + 15 * this.level;
      },
      poisonMod: function () {
        return 10 + 20 * this.level;
      },
      defense: function () {
        return 50 + 50 * this.level;
      },
      health: function () {
        return 500 + 500 * this.level;
      },
      maxStacks: function () {
        return 8 + this.level * 2;
      },
      doStuff: function () {
        autoBattle.trimp.poisonChance += this.poisonChance();
        autoBattle.trimp.poisonMod += this.poisonMod();
        if (autoBattle.trimp.poisonTime < 20000)
          autoBattle.trimp.poisonTime = 20000;
        autoBattle.trimp.defense += this.defense();
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.poisonStack += Math.min(
          this.maxStacks(),
          Math.floor(autoBattle.enemy.poison.hitsAtMax / 3)
        );
      },
      startPrice: 100e6,
      priceMod: 10,
    },
    //Monkimp Paw, 155
    Grounded_Crown: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 160,
      description: function () {
        return (
          "+" +
          prettify(this.attack()) +
          " Attack, +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage, +" +
          prettify(this.defense()) +
          " Defense, +" +
          prettify(this.health()) +
          " Health. If the Enemy is Poisoned or Bleeding, Huffy loses 20% of his Max Health per second."
        );
      },
      upgrade: "+50 Attack, +50% Shock Damage, +50 Defense, +1000 Health",
      attack: function () {
        return 50 + 50 * this.level;
      },
      shockMod: function () {
        return 0.5 + 0.5 * this.level;
      },
      defense: function () {
        return 50 * this.level;
      },
      health: function () {
        return 500 + 1000 * this.level;
      },
      afterCheck: function () {
        if (
          autoBattle.enemy.poison.time > 0 ||
          autoBattle.enemy.bleed.time > 0
        ) {
          var mod = 20 / autoBattle.frameTime;
          autoBattle.trimp.health -=
            autoBattle.trimp.maxHealth * mod * autoBattle.trimp.damageTakenMult;
          if (autoBattle.trimp.health < 0.01) autoBattle.trimp.health = 0;
        }
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.shockMod += this.shockMod();
        autoBattle.trimp.defense += this.defense();
        autoBattle.trimp.maxHealth += this.health();
      },
      startPrice: 650e6,
      priceMod: 10,
    },
    Fearsome_Piercer: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 165,
      description: function () {
        return (
          "+" +
          prettify(this.attack()) +
          " Attack, +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal, +" +
          prettify(this.bleedMod() * 100) +
          "% Bleed Damage, +" +
          prettify(this.bleedChance()) +
          "% Bleed Chance. If you have an item that can cause a Bleed, the Enemy starts combat with 25% less Max Health."
        );
      },
      upgrade:
        "+75 Attack, +10% Lifesteal, +75% Bleed Damage, +50% Bleed Chance",
      attack: function () {
        return 125 + 75 * this.level;
      },
      lifesteal: function () {
        return 0.3 + 0.1 * this.level;
      },
      bleedMod: function () {
        return 0.25 + 0.75 * this.level;
      },
      bleedChance: function () {
        return 25 + 50 * this.level;
      },
      onEnemy: function () {
        if (
          autoBattle.items.Rusty_Dagger.equipped ||
          autoBattle.items.Big_Cleaver.equipped ||
          autoBattle.items.Bag_of_Nails.equipped
        ) {
          autoBattle.enemy.baseHealth *= 0.75;
          autoBattle.enemy.maxHealth *= 0.75;
          autoBattle.enemy.health = autoBattle.enemy.maxHealth;
        }
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.lifesteal += this.lifesteal();
        autoBattle.trimp.bleedMod += this.bleedMod();
        autoBattle.trimp.bleedChance += this.bleedChance();
      },
      startPrice: 1.5e9,
      priceMod: 10,
    },
    Bag_of_Nails: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 168,
      startPrice: 2.7e9,
      priceMod: 10,
      description: function () {
        return (
          "Can create a Bleed on the Enemy for 10 seconds. Enemies are unaffected by your Slow Aura, but deal 25% less damage while Bleeding. +" +
          prettify(this.attack()) +
          " Attack, +" +
          prettify(this.bleedMod() * 100) +
          "% Bleed Damage, +" +
          prettify(this.health()) +
          " Health."
        );
      },
      upgrade: "+100 Attack, +75% Bleed Damage, +500 Health",
      attack: function () {
        return 150 + this.level * 100;
      },
      bleedMod: function () {
        return 1.25 + 0.75 * this.level;
      },
      health: function () {
        return 500 + 500 * this.level;
      },
      doStuff: function () {
        if (autoBattle.enemy.bleed.time > 0) {
          autoBattle.enemy.attack *= 0.75;
          autoBattle.enemy.noSlow = true;
        } else autoBattle.enemy.noSlow = false;
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.bleedMod += this.bleedMod();
        autoBattle.trimp.maxHealth += this.health();
        if (autoBattle.trimp.bleedTime <= 10000)
          autoBattle.trimp.bleedTime = 10000;
      },
    },
    Blessed_Protector: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 170,
      description: function () {
        return (
          "+" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.defense()) +
          " Defense, +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal. Huffy gains 0.5% increased Attack for each % of his missing Health. When Huffy is below 50% Health, take 30% less damage from all sources. "
        );
      },
      upgrade: "+1000 Health, +100 Defense, +25% Lifesteal",
      health: function () {
        return 1000 + 1000 * this.level;
      },
      defense: function () {
        return 100 + 100 * this.level;
      },
      lifesteal: function () {
        return 0.25 + 0.25 * this.level;
      },
      afterCheck: function () {
        var healthPct = autoBattle.trimp.health / autoBattle.trimp.maxHealth;
        if (healthPct < 0.5) {
          autoBattle.trimp.damageTakenMult *= 0.7;
        }
        if (healthPct < 1) {
          var boost = 1 - healthPct;
          boost = 1 + boost * 0.5;
          autoBattle.trimp.attack *= boost;
        }
      },
      doStuff: function () {
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.defense += this.defense();
        autoBattle.trimp.lifesteal += this.lifesteal();
      },
      startPrice: 4e9,
      priceMod: 10,
    },
    The_Doomspring: {
      description: function () {
        var stack = prettify((1 - this.attackTime()) * 100);
        return (
          "+" +
          prettify(this.health()) +
          " Health, -" +
          stack +
          "% Attack Time. For every 15000 damage taken this battle, -" +
          stack +
          "% more Attack Time. Stacks up to " +
          this.stacks() +
          " times."
        );
      },
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 180,
      upgrade: "-5% Attack Time, +1500 Health, +1 stacks",
      attackTime: function () {
        return 0.842 * Math.pow(0.95, this.level);
      },
      health: function () {
        return 1500 + 1500 * this.level;
      },
      stacks: function () {
        return 2 + this.level;
      },
      doStuff: function () {
        var stacks = Math.floor(autoBattle.trimp.dmgTaken / 15000) + 1;
        var maxStacks = this.stacks();
        if (stacks > maxStacks) stacks = maxStacks;
        autoBattle.trimp.attackSpeed *= Math.pow(this.attackTime(), stacks);
        autoBattle.trimp.maxHealth += this.health();
      },
      dustType: "shards",
      startPrice: 22,
      priceMod: 15,
    },
    Snimp__Fanged_Blade: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 185,
      description: function () {
        return (
          "+" +
          prettify(this.attack()) +
          " Attack, +" +
          this.poisonStack() +
          " Max Poison Stacks. If the enemy is Poisoned, +" +
          prettify(this.bleedMod() * 100) +
          "% Bleed Damage. If the enemy is Bleeding, +" +
          prettify(this.poisonMod()) +
          " Poison Damage."
        );
      },
      upgrade:
        "+250 Attack, +5 Max Poison Stacks, +200% Bleed Damage, +250 Poison Damage",
      attack: function () {
        return 250 + 250 * this.level;
      },
      poisonMod: function () {
        return 250 * this.level;
      },
      bleedMod: function () {
        return 1 + 2 * this.level;
      },
      poisonStack: function () {
        return 5 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.poisonStack += this.poisonStack();
        if (autoBattle.enemy.poison.time > 0)
          autoBattle.trimp.bleedMod += this.bleedMod();
        if (autoBattle.enemy.bleed.time > 0)
          autoBattle.trimp.poisonMod += this.poisonMod();
      },
      dustType: "shards",
      startPrice: 159,
      priceMod: 15,
    },
    //Dopp signet 190
    Wrath_Crafted_Hatchet: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 195,
      description: function () {
        return (
          "+" +
          prettify(this.attack()) +
          " Attack, +" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.defense()) +
          " Defense, -" +
          prettify((1 - this.attackTime()) * 100) +
          "% Attack Time."
        );
      },
      upgrade: "+750 Attack, +2000 Health, +200 Defense, -5% Attack Time",
      attack: function () {
        return 1250 + 750 * this.level;
      },
      attackTime: function () {
        return 0.842 * Math.pow(0.95, this.level);
      },
      health: function () {
        return 2000 + 2000 * this.level;
      },
      defense: function () {
        return 200 + 200 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.attackSpeed *= this.attackTime();
        autoBattle.trimp.defense += this.defense();
      },
      dustType: "shards",
      startPrice: 400,
      priceMod: 15,
    },
    //basket of souls 200
    Goo_Golem: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 205,
      description: function () {
        return (
          "+" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.poisonMod()) +
          " Poison Damage, +" +
          prettify(this.poisonStack()) +
          " Max Poison Stacks. If the Enemy is Poisoned, all damage Huffy takes is stored in the Golem, and Huffy takes 10% of the Golem's stored damage every second."
        );
      },
      upgrade: "+1000 Health, +400 Poison Damage, +5 Max Poison Stacks",
      health: function () {
        return 2000 + 1000 * this.level;
      },
      poisonMod: function () {
        return 400 * this.level;
      },
      poisonStack: function () {
        return 5 + 5 * this.level;
      },
      active: function () {
        if (this.equipped && autoBattle.enemy.poison.time > 0) return true;
        return false;
      },
      doStuff: function () {
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.poisonMod += this.poisonMod();
        autoBattle.trimp.poisonStack += this.poisonStack();
        if (autoBattle.battleTime > autoBattle.trimp.lastGoo + 1000) {
          if (autoBattle.trimp.lastGoo == -1)
            autoBattle.trimp.lastGoo = autoBattle.battleTime;
          else autoBattle.trimp.lastGoo += 1000;
          var dmg = autoBattle.trimp.gooStored * 0.1;
          autoBattle.trimp.gooStored -= dmg;
          autoBattle.damageCreature(autoBattle.trimp, dmg, true);
        }
      },
      dustType: "shards",
      startPrice: 2500,
      priceMod: 15,
    },
    Omni_Enhancer: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 210,
      description: function () {
        return (
          "+" +
          prettify(this.attack()) +
          " Attack, +" +
          prettify(this.bleedMod() * 100) +
          "% Bleed Damage, +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage, +" +
          prettify(this.poisonMod()) +
          " Poison Damage, +1 Poison Stack Rate, and Poisons tick 10% faster."
        );
      },
      upgrade:
        "+2500 Attack, +300% Bleed Damage, +300% Shock Damage, +1000 Poison Damage",
      attack: function () {
        return 2500 + 2500 * this.level;
      },
      bleedMod: function () {
        return 4 + 3 * this.level;
      },
      shockMod: function () {
        return 4 + 3 * this.level;
      },
      poisonMod: function () {
        return 1000 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.bleedMod += this.bleedMod();
        autoBattle.trimp.shockMod += this.shockMod();
        autoBattle.trimp.poisonMod += this.poisonMod();
        autoBattle.trimp.poisonTick *= 0.9;
        autoBattle.trimp.poisonRate++;
      },
      dustType: "shards",
      startPrice: 6300,
      priceMod: 15,
    },
    //stormbringer 215
    Box_of_Spores: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 220,
      description: function () {
        return (
          "If the Enemy dies while Poisoned and not Bleeding, it drops " +
          this.dustMult() +
          "x more Dust."
        );
      },
      upgrade: "+1x Dust",
      dustMult: function () {
        return 4 + this.level;
      },
      dustType: "shards",
      startPrice: 60000,
      priceMod: 15,
    },
    //nullifium armor 225
    //handful of mold 230
    Haunted_Harpoon: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 235,
      description: function () {
        return (
          "+" +
          prettify(this.health()) +
          " Health. If the Enemy is Bleeding and has been alive for at least 5 seconds, Huffy gains " +
          prettify(this.attack()) +
          " Attack, and the Enemy takes an additional " +
          prettify(this.bleedTickMult() * 100) +
          "% of its Bleed damage every second."
        );
      },
      upgrade:
        "+10,000 Attack, +5000 Health, +100% of Bleed Damage taken per second",
      health: function () {
        return 5000 + 5000 * this.level;
      },
      bleedTickMult: function () {
        return 9 + this.level;
      },
      attack: function () {
        return 15000 + 10000 * this.level;
      },
      doStuff: function () {
        if (autoBattle.enemy.bleed.time > 0 && autoBattle.battleTime > 5000)
          autoBattle.trimp.attack += this.attack();
        autoBattle.trimp.maxHealth += this.health();
      },
      afterCheck: function () {
        if (autoBattle.enemy.bleed.time > 0 && autoBattle.battleTime > 5000) {
          var bdamage = autoBattle.getBleedDamage(
            autoBattle.enemy,
            autoBattle.trimp
          );
          var pct = this.bleedTickMult() * (autoBattle.frameTime / 1000);
          bdamage *= pct;
          autoBattle.damageCreature(autoBattle.enemy, bdamage);
        }
      },
      dustType: "shards",
      startPrice: 15e5,
      priceMod: 20,
    },
    //Final calc items
    //After all shock resist
    Stormbringer: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 215,
      description: function () {
        return (
          "The Enemy loses all Shock Resistance, adding it instead to Bleed Resistance. +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage, +" +
          prettify(this.poisonMod()) +
          " Poison Damage."
        );
      },
      upgrade: "+500% Shock Damage, +5000 Poison Damage",
      shockMod: function () {
        return 10 + 5 * this.level;
      },
      poisonMod: function () {
        return 5000 + 5000 * this.level;
      },
      doStuff: function () {
        autoBattle.enemy.bleedResist += autoBattle.enemy.shockResist;
        autoBattle.enemy.shockResist = 0;
        autoBattle.trimp.shockMod += this.shockMod();
        autoBattle.trimp.poisonMod += this.poisonMod();
      },
      dustType: "shards",
      startPrice: 20000,
      priceMod: 15,
    },
    Bad_Medkit: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 84,
      description: function () {
        return (
          "Causes Bleeds you generate from other items to last at least " +
          this.bleedTime() +
          " seconds. +" +
          prettify(this.bleedChance()) +
          "% Bleed Chance. +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal if the enemy is Bleeding."
        );
      },
      upgrade: "+1s Minimum Bleed Time, +4% Bleed Chance, +2.5% Lifesteal",
      bleedTime: function () {
        return 11 + 1 * this.level;
      },
      lifesteal: function () {
        return 0.175 + 0.025 * this.level;
      },
      bleedChance: function () {
        return 21 + this.level * 4;
      },
      doStuff: function () {
        if (
          autoBattle.trimp.bleedTime > 0 &&
          autoBattle.trimp.bleedTime < this.bleedTime() * 1000
        )
          autoBattle.trimp.bleedTime = this.bleedTime() * 1000;
        if (autoBattle.enemy.bleed.time > 0)
          autoBattle.trimp.lifesteal += this.lifesteal();
        autoBattle.trimp.bleedChance += this.bleedChance();
      },
      startPrice: 300,
    },
    Putrid_Pouch: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 78,
      description: function () {
        return (
          "-10% Attack Time and +" +
          prettify(this.defense()) +
          " Defense if the Enemy is Poisoned. Causes Poisons you generate from other items to last at least " +
          prettify(this.poisonTime() / 1000) +
          " seconds. +" +
          prettify(this.poisonChance()) +
          "% Poison Chance."
        );
      },
      upgrade: "+1s Poison Duration, +6% Poison Chance, +3 Defense",
      poisonTime: function () {
        return 19000 + this.level * 1000;
      },
      poisonChance: function () {
        return 14 + this.level * 6;
      },
      defense: function () {
        return 7 + 3 * this.level;
      },
      doStuff: function () {
        if (autoBattle.enemy.poison.time > 0) {
          autoBattle.trimp.attackSpeed *= 0.9;
          autoBattle.trimp.defense += this.defense();
        }
        var poisonTime = this.poisonTime();
        if (
          autoBattle.trimp.poisonTime > 0 &&
          autoBattle.trimp.poisonTime < poisonTime
        )
          autoBattle.trimp.poisonTime = poisonTime;
        autoBattle.trimp.poisonChance += this.poisonChance();
      },
      startPrice: 150,
      priceMod: 4,
    },
    Raincoat: {
      //After all bleed chance
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 75,
      description: function () {
        return (
          "If you have a chance to cause Bleeding, gain +" +
          prettify(this.defense()) +
          " Defense, +" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal, and +" +
          prettify(this.bleedDamage() * 100) +
          "% Bleed Damage."
        );
      },
      upgrade: "+2 defense, +20 health, +2.5% Lifesteal, +10% Bleed Damage",
      defense: function () {
        return 4 + this.level * 2;
      },
      health: function () {
        return 20 + 20 * this.level;
      },
      lifesteal: function () {
        return 0.125 + 0.025 * this.level;
      },
      bleedDamage: function () {
        return 0.2 + 0.1 * this.level;
      },
      doStuff: function () {
        var bleedChance = autoBattle.trimp.bleedChance;
        if (autoBattle.items.Sacrificial_Shank.equipped)
          bleedChance = Math.floor(bleedChance * 0.75);
        if (
          bleedChance > autoBattle.enemy.bleedResist &&
          autoBattle.trimp.bleedTime > 0 &&
          autoBattle.trimp.bleedMod > 0
        ) {
          autoBattle.trimp.defense += this.defense();
          autoBattle.trimp.maxHealth += this.health();
          autoBattle.trimp.lifesteal += this.lifesteal();
          autoBattle.trimp.bleedMod += this.bleedDamage();
        }
      },
      startPrice: 100,
      priceMod: 4,
    },
    Labcoat: {
      //after all poison chance
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 90,
      description: function () {
        return (
          "If you have a chance to cause Poison, gain +" +
          prettify(this.health()) +
          " Health, -" +
          prettify((1 - this.attackTime()) * 100) +
          "% Attack Time, and +" +
          prettify(this.poisonMod()) +
          " Poison Damage."
        );
      },
      upgrade: "+25 Health, -1% Attack Time, +1 Poison Damage",
      health: function () {
        return 25 + 25 * this.level;
      },
      attackTime: function () {
        return Math.pow(0.99, this.level);
      },
      poisonMod: function () {
        return 1 + this.level;
      },
      doStuff: function () {
        var poisonChance = autoBattle.trimp.poisonChance;
        if (autoBattle.items.Sacrificial_Shank.equipped)
          poisonChance = Math.floor(poisonChance * 0.75);
        if (
          poisonChance > autoBattle.enemy.poisonResist &&
          autoBattle.trimp.poisonMod > 0 &&
          autoBattle.trimp.poisonTime > 0
        ) {
          autoBattle.trimp.maxHealth += this.health();
          autoBattle.trimp.attackSpeed *= this.attackTime();
          autoBattle.trimp.poisonMod += this.poisonMod();
        }
      },
      startPrice: 1500,
      priceMod: 4.5,
    },
    Aegis: {
      //after all health
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 118,
      description: function () {
        return (
          "+" +
          this.defenseEffect() +
          " Defense. If Huffy's Health % is higher than Enemy Health %, gain +" +
          prettify(this.shockChance()) +
          "% Shock Chance, +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage, 15s Shock Time. Otherwise, this item's Defense is doubled and gain +" +
          prettify(this.lifestealEffect() * 100) +
          "% Lifesteal."
        );
      },
      upgrade:
        "+4 Defense, +10% Shock Chance, +10% Shock Damage, +10% Lifesteal",
      defenseEffect: function () {
        return 6 + 4 * this.level;
      },
      shockChance: function () {
        return 15 + 10 * this.level;
      },
      shockMod: function () {
        return 0.15 + 0.1 * this.level;
      },
      lifestealEffect: function () {
        return 0.05 + 0.1 * this.level;
      },
      doStuff: function () {
        var hufPct = autoBattle.trimp.health / autoBattle.trimp.maxHealth;
        var enemyPct = autoBattle.enemy.health / autoBattle.enemy.maxHealth;
        if (hufPct > enemyPct) {
          autoBattle.trimp.shockChance += this.shockChance();
          autoBattle.trimp.shockMod += this.shockMod();
          if (autoBattle.trimp.shockTime < 15000)
            autoBattle.trimp.shockTime = 15000;
          autoBattle.trimp.defense += this.defenseEffect();
        } else {
          autoBattle.trimp.lifesteal += this.lifestealEffect();
          autoBattle.trimp.defense += this.defenseEffect() * 2;
        }
      },
      priceMod: 8,
      startPrice: 65000,
    },
    Sacrificial_Shank: {
      //after all status chances
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 145,
      enemyReduced: 0,
      description: function () {
        return (
          "Multiply Huffy's and the Enemy's highest status effect chance (before resists) by 0.75. -" +
          prettify((1 - this.attackTime()) * 100) +
          "% Attack Time, +" +
          prettify(this.resist()) +
          " to all Resists, and +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal per 10% Huffy or Enemy status chance lost."
        );
      },
      upgrade:
        "-1% Attack Time, +1% Resists, +1% Lifesteal per 10% status chance lost",
      attackTime: function () {
        return Math.pow(0.99, this.level);
      },
      resist: function () {
        return 1 * this.level;
      },
      lifesteal: function () {
        return 0.01 * this.level;
      },
      onEnemy: function () {
        var toReduce = ["poisonChance", "bleedChance", "shockChance"];
        var totalReduce = 0;
        var highestElem = "";
        var highestChance = 0;
        for (var x = 0; x < toReduce.length; x++) {
          var name = toReduce[x];
          if (autoBattle.enemy[name] > highestChance) {
            highestChance = autoBattle.enemy[name];
            highestElem = name;
          }
        }
        var thisReduce = autoBattle.enemy[highestElem] * 0.25;
        if (thisReduce > 0) {
          autoBattle.enemy[highestElem] -= thisReduce;
          totalReduce += thisReduce;
        }
        this.enemyReduced = totalReduce;
      },
      doStuff: function () {
        var toReduce = ["poisonChance", "bleedChance", "shockChance"];
        var totalReduce = this.enemyReduced;
        var highestElem = "";
        var highestChance = 0;
        for (var x = 0; x < toReduce.length; x++) {
          var name = toReduce[x];
          if (autoBattle.trimp[name] > highestChance) {
            highestChance = autoBattle.trimp[name];
            highestElem = name;
          }
        }
        var thisReduce = autoBattle.trimp[highestElem] * 0.25;
        if (thisReduce > 0) {
          autoBattle.trimp[highestElem] -= thisReduce;
          totalReduce += thisReduce;
        }
        totalReduce = Math.floor(totalReduce / 10);
        if (totalReduce <= 0) return;
        autoBattle.trimp.attackSpeed *= Math.pow(
          this.attackTime(),
          totalReduce
        );
        autoBattle.trimp.lifesteal += this.lifesteal() * totalReduce;
        autoBattle.trimp.poisonResist += this.resist() * totalReduce;
        autoBattle.trimp.bleedResist += this.resist() * totalReduce;
        autoBattle.trimp.shockResist += this.resist() * totalReduce;
      },
      startPrice: 2500000,
      priceMod: 4,
    },
    Basket_of_Souls: {
      //after all additive lifesteal and health (before monkimp)
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 200,
      description: function () {
        return (
          "+" +
          prettify(this.health()) +
          " Health, +" +
          prettify(this.defense()) +
          " Defense, +" +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal, +" +
          prettify(this.bleedMod() * 100) +
          "% Bleed Damage, +" +
          prettify(this.shockMod() * 100) +
          "% Shock Damage. Multiplies Huffy's Max Health by his Lifesteal value, then multiplies his Lifesteal by 0.5."
        );
      },
      upgrade:
        "+1000 Health, +300 Defense, +100% Lifesteal, +200% Bleed Damage, +200% Shock Damage",
      health: function () {
        return 2000 + 1000 * this.level;
      },
      defense: function () {
        return 300 + 200 * this.level;
      },
      lifesteal: function () {
        return 2 + this.level;
      },
      bleedMod: function () {
        return 3 + 2 * this.level;
      },
      shockMod: function () {
        return 3 + 2 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.maxHealth += this.health();
        autoBattle.trimp.defense += this.defense();
        autoBattle.trimp.lifesteal += this.lifesteal();
        autoBattle.trimp.bleedMod += this.bleedMod();
        autoBattle.trimp.shockMod += this.shockMod();
        if (autoBattle.items.Monkimp_Paw.equipped)
          autoBattle.trimp.lifesteal *= 0.75; //monkimp paw special interaction
        autoBattle.trimp.maxHealth *= autoBattle.trimp.lifesteal;
        autoBattle.trimp.lifesteal *= 0.5;
      },
      dustType: "shards",
      startPrice: 1000,
      priceMod: 15,
    },
    Monkimp_Paw: {
      //after basket of souls
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 155,
      description: function () {
        return (
          "+" +
          prettify(this.attack()) +
          " Attack, removes a fourth of your total Lifesteal."
        );
      },
      upgrade: "+100 Attack",
      attack: function () {
        return 100 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.attack += this.attack();
        if (!autoBattle.items.Basket_of_Souls.equipped)
          autoBattle.trimp.lifesteal *= 0.75; //basket of souls special interaction
        if (autoBattle.trimp.lifesteal < 0) autoBattle.trimp.lifesteal = 0;
      },
      startPrice: 200e6,
      priceMod: 10,
    },
    Spiked_Gloves: {
      //after all attack
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 108,
      description: function () {
        return "+" + this.formatEffect() + "% Attack damage.";
      },
      upgrade: "+5% attack damage",
      formatEffect: function () {
        return prettify(this.effect() * 100);
      },
      effect: function () {
        return 0.2 + 0.05 * this.level;
      },
      doStuff: function () {
        autoBattle.trimp.attack *= 1 + this.effect();
      },
      startPrice: 10000,
      priceMod: 6,
    },
    //after all attack and health
    Nullifium_Armor: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 225,
      description: function () {
        return (
          "Huffy gains +" +
          prettify((this.statMult() - 1) * 100) +
          "% Health, and +" +
          prettify((this.statMult() - 1) * 100) +
          "% Attack. If the Enemy is not Poisoned, gain " +
          prettify(this.lifesteal() * 100) +
          "% Lifesteal."
        );
      },
      upgrade: "+50% Attack, Health, and Lifesteal",
      statMult: function () {
        return 4.5 + this.level * 0.5;
      },
      lifesteal: function () {
        return 1.5 + this.level * 0.5;
      },
      doStuff: function () {
        if (autoBattle.enemy.poison.time <= 0)
          autoBattle.trimp.lifesteal += this.lifesteal();
        autoBattle.trimp.maxHealth *= this.statMult();
        autoBattle.trimp.attack *= this.statMult();
      },
      dustType: "shards",
      startPrice: 200000,
      priceMod: 20,
    },
    Doppelganger_Signet: {
      //actual final attack item
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 190,
      description: function () {
        return "Summon a Doppelganger which grants you 50% damage reduction, 2x Attack, and +1 Poison Stack Rate while it is alive. Your Doppelganger will explode after taking damage equal to your Max Health or if it would kill the Enemy, redealing all damage dealt so far this fight, and shredding 50% Enemy Defense.";
      },
      onDeath: function () {
        var damageDealt = autoBattle.enemy.dmgTaken;
        autoBattle.damageCreature(autoBattle.enemy, damageDealt, false, true);
        autoBattle.enemy.defense *= 0.5;
        autoBattle.trimp.doppDown = true;
      },
      doStuff: function () {
        if (autoBattle.trimp.doppDown) return;
        autoBattle.trimp.attack *= 2;
        autoBattle.trimp.damageTakenMult *= 0.5;
        autoBattle.trimp.poisonRate++;
        if (
          autoBattle.trimp.dmgTaken >= autoBattle.trimp.maxHealth ||
          autoBattle.enemy.dmgTaken >= autoBattle.enemy.health
        )
          this.onDeath();
      },
      noUpgrade: true,
      dustType: "shards",
    },
    //Final Poison Damage item
    Myco_Mitts: {
      owned: false,
      equipped: false,
      hidden: false,
      level: 1,
      zone: 230,
      description: function () {
        return (
          "Huffy isn't excited about holding this item but can't deny the results. Multiplies the damage dealt by Poison ticks by " +
          this.poisonMult() +
          "x."
        );
      },
      upgrade: "+1x to Poison Damage multiplier",
      poisonMult: function () {
        return 2 + this.level;
      },
      doStuff: function () {
        autoBattle.trimp.poisonMod *= this.poisonMult();
      },
      startPrice: 5e5,
      priceMod: 20,
      dustType: "shards",
    },
  },
  bonuses: {
    Extra_Limbs: {
      description: function () {
        return "Huffy can equip 1 additional item.<br/><br/>";
      },
      level: 0,
      price: 100,
      priceMod: 100,
    },
  },
  oneTimers: {
    Master_of_Arms: {
      description: "Huffy gains +200 Health, +10 Attack, and +2 Poison Damage.",
      owned: false,
      requiredItems: 19,
    },
    Dusty_Tome: {
      description:
        "+5% Dust found on all levels per Spire Assault level cleared.",
      owned: false,
      requiredItems: 32,
    },
    Whirlwind_of_Arms: {
      description: "+1000 Health, +25 Attack, +10 Poison Damage.",
      owned: false,
      requiredItems: 34,
    },
    The_Ring: {
      description: "Unlock The Ring.",
      owned: false,
      requiredItems: 42,
      useShards: true,
      onPurchase: function () {
        document.getElementById("autoBattleRingBtn").style.display =
          "inline-block";
      },
    },
  },
  fight: function () {
    if (!this.trimp || !this.enemy) this.resetCombat();
    this.enemy.lastAttack += this.frameTime;
    this.trimp.lastAttack += this.frameTime;

    this.enemy.maxHealth = this.enemy.baseHealth;
    this.trimp.maxHealth = this.trimp.baseHealth;
    this.enemy.attackSpeed = this.enemy.baseAttackSpeed;
    this.trimp.attackSpeed = this.trimp.baseAttackSpeed;
    this.trimp.attack = this.trimp.baseAttack;
    this.enemy.attack = this.enemy.baseAttack;

    this.trimp.shockChance = 0;
    this.trimp.shockMod = 0;
    this.trimp.shockTime = 0;

    this.trimp.bleedChance = 0;
    this.trimp.bleedMod = 0;
    this.trimp.bleedTime = 0;

    this.trimp.poisonChance = 0;
    this.trimp.poisonTime = 0;
    this.trimp.poisonMod = 0;
    this.trimp.poisonStack = 2;
    this.trimp.poisonTick = 1000;
    this.trimp.poisonHeal = 0;
    this.trimp.poisonRate = 1;

    this.trimp.shockResist = 0;
    this.trimp.poisonResist = 0;
    this.trimp.bleedResist = 0;

    this.trimp.defense = 0;
    this.trimp.lifesteal = 0;
    this.trimp.damageTakenMult = 1;
    this.trimp.slowAura = 1;

    this.trimp.dustMult = 0;

    this.checkItems();

    var trimpAttackTime = this.trimp.attackSpeed;
    if (this.trimp.lastAttack >= trimpAttackTime) {
      this.trimp.lastAttack -= trimpAttackTime;
      this.attack(this.trimp, this.enemy);
    }
    this.checkPoison(this.trimp);
    if (this.trimp.bleed.time > 0) this.trimp.bleed.time -= this.frameTime;
    if (this.trimp.shock.time > 0) this.trimp.shock.time -= this.frameTime;
    if (this.enemy.health <= 0) {
      this.enemyDied();
      return;
    }
    if (this.trimp.health <= 0) {
      this.trimpDied();
      return;
    }
    if (!this.enemy.noSlow) this.enemy.attackSpeed *= this.trimp.slowAura;
    var enemyAttackTime = this.enemy.attackSpeed;
    if (this.enemy.lastAttack >= enemyAttackTime) {
      this.enemy.lastAttack -= enemyAttackTime;
      this.attack(this.enemy, this.trimp);
    }
    if (this.enemy.explodeFreq != -1) {
      this.enemy.lastExplode += this.frameTime;
      if (this.enemy.lastExplode >= this.enemy.explodeFreq) {
        this.enemy.lastExplode -= this.enemy.explodeFreq;
        var dmg =
          this.enemy.explodeDamage * this.getAttack(this.enemy) -
          this.trimp.defense;
        this.damageCreature(this.trimp, dmg);
      }
    }
    this.checkPoison(this.enemy);
    if (this.enemy.bleed.time > 0) this.enemy.bleed.time -= this.frameTime;
    if (this.enemy.shock.time > 0 && this.enemy.shock.time != 9999999)
      this.enemy.shock.time -= this.frameTime;
    if (this.trimp.health > this.trimp.maxHealth)
      this.trimp.health = this.trimp.maxHealth;
    if (this.enemy.health > this.enemy.maxHealth)
      this.enemy.health = this.enemy.maxHealth;
    if (this.trimp.health <= 0) {
      this.trimpDied();
      return;
    }
    if (this.enemy.health <= 0) {
      this.enemyDied();
      return;
    }
  },
  checkItems: function () {
    if (this.oneTimers.Master_of_Arms.owned) {
      this.trimp.maxHealth += 200;
      this.trimp.attack += 10;
      this.trimp.poisonMod += 2;
    }
    if (this.oneTimers.Whirlwind_of_Arms.owned) {
      this.trimp.maxHealth += 1000;
      this.trimp.attack += 25;
      this.trimp.poisonMod += 10;
    }
    for (var x = 0; x < this.rings.mods.length; x++) {
      var modObj = this.ringStats[this.rings.mods[x]];
      modObj.doStuff(this.getRingStatAmt(modObj));
    }
    var ringDmg = this.getRingStatusDamage();
    if (ringDmg > 0) {
      ringDmg /= 100;
      this.trimp.bleedMod += ringDmg;
      this.trimp.shockMod += ringDmg;
      this.trimp.poisonMod += this.getRingPoisonDamage();
    }
    var ringChance = this.getRingStatusChance();
    if (ringChance > 0) {
      this.trimp.bleedChance += ringChance;
      this.trimp.shockChance += ringChance;
      this.trimp.poisonChance += ringChance;
    }
    for (var item in this.items) {
      var itemObj = this.items[item];
      if (!itemObj.equipped) continue;
      if (itemObj.doStuff) itemObj.doStuff();
    }

    if (this.items.Sundering_Scythe.equipped && this.trimp.shockTime > 10000)
      this.trimp.shockTime = 10000;
    if (this.items.Blessed_Protector.equipped)
      this.items.Blessed_Protector.afterCheck(); //after anything that might hurt huffy
    if (this.items.Grounded_Crown.equipped)
      this.items.Grounded_Crown.afterCheck(); //just deals damage
    if (this.items.Haunted_Harpoon.equipped)
      this.items.Haunted_Harpoon.afterCheck(); //after anything that might increase the damage of huffy's bleeds

    this.trimp.attackSpeed *= this.enemy.slowAura;
    if (this.trimp.attackSpeed <= 500) {
      this.trimp.slowAura += (500 - this.trimp.attackSpeed) / 1000;
      this.trimp.attackSpeed = 500;
    }
  },
  damageCreature: function (creature, dmg, fromGoo, ignoreEth) {
    dmg *= creature.damageTakenMult;
    if (creature.isEthereal && !ignoreEth) creature.health += dmg;
    else {
      if (
        !fromGoo &&
        creature.isTrimp &&
        this.items.Goo_Golem.equipped &&
        this.items.Goo_Golem.active()
      ) {
        creature.gooStored += dmg;
      } else {
        creature.health -= dmg;
        creature.dmgTaken += dmg;
      }
    }
    return dmg;
  },
  checkPoison: function (creature) {
    var opponent = creature.isTrimp ? this.enemy : this.trimp;
    if (creature.poison.time > 0) {
      creature.poison.lastTick += this.frameTime;
      var tickTime = opponent.poisonTick;
      if (creature.poison.lastTick >= tickTime) {
        var shockMod = 1;
        if (creature.shock.time > 0) {
          shockMod += creature.shock.mod;
        }
        creature.poison.lastTick -= tickTime;
        creature.poison.time -= tickTime;
        var dmg = creature.poison.mod * creature.poison.stacks * shockMod;
        dmg = this.damageCreature(creature, dmg);
        if (opponent.poisonHeal) {
          var healFor = opponent.poisonHeal * creature.poison.stacks;
          if (this.items.The_Globulator.equipped) healFor *= 2;
          this.trimp.health += healFor;
          if (this.trimp.health > this.trimp.maxHealth)
            this.trimp.health = this.trimp.maxHealth;
        }
        if (creature.poison.time <= 0) {
          creature.poison.time = 0;
          creature.poison.mod = 0;
          creature.poison.lastTick = 0;
          creature.poison.stacks = 0;
          creature.poison.expired = true;
          creature.poison.hitsAtMax = 0;
        }
      }
    }
  },
  getAttack: function (fighterObj) {
    if (fighterObj.isTrimp) return fighterObj.attack;
    return fighterObj.attack * this.getEnrageMult() * this.getBerserkMult();
  },
  getBerserkMult: function () {
    if (this.enemy.berserkMod == -1) return 1;
    return Math.pow(
      this.enemy.berserkMod,
      Math.floor(this.enemy.berserkStack / this.enemy.berserkEvery)
    );
  },
  rollDamage: function (attacker, luck = false) {
    var baseAttack = this.getAttack(attacker);
    var attack = baseAttack * 0.2;
    var roll = Math.floor(Math.random() * 201);
    if (luck) {
      roll = 100 + luck * 100;
    }
    roll -= 100;
    roll /= 100;
    return baseAttack + attack * roll;
  },
  attack: function (attacker, defender, luck = 0) {
    var damage = this.rollDamage(attacker, luck);
    var shockMod = 1;
    if (defender.shock.time > 0) {
      shockMod = 1 + defender.shock.mod;
      damage *= shockMod;
    }
    damage -= defender.defense;
    if (damage < 0) damage = 0;
    damage = this.damageCreature(defender, damage);
    var atkLifesteal = attacker.lifesteal - defender.lifestealResist;
    if (atkLifesteal > 0) {
      attacker.health += damage * atkLifesteal;
      if (attacker.health > attacker.maxHealth)
        attacker.health = attacker.maxHealth;
    }
    if (attacker.bleed.time > 0) {
      var bdamage = this.getBleedDamage(attacker, defender);
      bdamage = this.damageCreature(attacker, bdamage);
      var defLifesteal = defender.lifesteal - attacker.lifestealResist;
      if (defLifesteal > 0) {
        var healAmt = bdamage * defLifesteal;
        if (defender.isTrimp && this.items.Recycler.equipped) healAmt *= 2;
        defender.health += healAmt;
        if (defender.health > defender.maxHealth)
          defender.health = defender.maxHealth;
      }
      if (attacker.bleed.time <= 0) {
        attacker.bleed.time = 0;
        attacker.bleed.mod = 0;
      }
    }
    var bleedChance = attacker.bleedChance - defender.bleedResist;
    if (
      bleedChance > 0 &&
      attacker.bleedMod > 0 &&
      attacker.bleedTime > 0 &&
      (defender.bleed.time <= 0 ||
        (this.items.Sundering_Scythe.equipped && defender.bleed.time <= 5000))
    ) {
      var roll = Math.floor(Math.random() * 100);
      if (roll < bleedChance) {
        if (this.items.Bloodstained_Gloves.equipped)
          this.items.Bloodstained_Gloves.onBleed();
        if (this.items.Bag_of_Nails.equipped) this.enemy.noSlow = true;
        if (defender.bleed.mod < attacker.bleedMod)
          defender.bleed.mod = 1 + attacker.bleedMod;
        if (defender.bleed.time < attacker.bleedTime)
          defender.bleed.time = attacker.bleedTime;
      }
    }
    var poisonChance = attacker.poisonChance - defender.poisonResist;
    if (poisonChance > 0 && attacker.poisonMod > 0 && attacker.poisonTime > 0) {
      var roll = Math.floor(Math.random() * 100);
      if (roll < poisonChance) {
        if (defender.poison.time < attacker.poisonTime)
          defender.poison.time = attacker.poisonTime;
        var stackRate = attacker.poisonRate;
        for (var x = 0; x < stackRate; x++) {
          defender.poison.mod = attacker.poisonMod;
          if (defender.poison.stacks < attacker.poisonStack) {
            defender.poison.stacks++;
            if (attacker.isTrimp && this.items.The_Globulator.equipped)
              this.items.The_Globulator.onPoisonStack(defender.poison.stacks);
          } else defender.poison.hitsAtMax++;
        }
      }
    }
    var shockChance = attacker.shockChance - defender.shockResist;
    if (
      shockChance > 0 &&
      attacker.shockMod > 0 &&
      attacker.shockTime > 0 &&
      (defender.shock.time <= 0 ||
        (defender.shock.time == 9999999 &&
          attacker.shockMod > defender.shock.mod))
    ) {
      var roll = Math.floor(Math.random() * 100);
      if (roll < shockChance) {
        if (attacker.isTrimp && this.items.Eelimp_in_a_Bottle.equipped)
          defender.lastAttack = 0;
        defender.shock.time = attacker.shockTime;
        defender.shock.mod = attacker.shockMod;
        defender.shock.count++;
      }
    }
    if (attacker.berserkMod != -1) attacker.berserkStack++;
    if (attacker.ethChance > 0) {
      this.total += 1;
      if (this.setEthChance) {
        if (this.ethRolls.length === 0) {
          this.ethRolls = rollNewRolls(attacker.ethChance);
          // console.log(this.ethRolls);
        }
        let val = this.ethRolls.pop();
        if (val) {
          // console.log(this.ethRolls);
          attacker.isEthereal = true;
          this.eth += 1;
        } else attacker.isEthereal = false;
      } else {
        var ethRoll = Math.floor(Math.random() * 100);
        // console.log(ethRoll);
        // console.log(attacker.ethChance);
        if (ethRoll < attacker.ethChance) {
          attacker.isEthereal = true;
          this.eth += 1;
        } else attacker.isEthereal = false;
      }
      // if (this.total % 1000 === 0)
      // console.log(this.eth/this.total);
    }
  },
  getBleedDamage: function (attacker, defender) {
    var attackerShock = 1;
    if (attacker.shock.time > 0) {
      attackerShock = 1 + attacker.shock.mod;
    }
    var bdamage = this.getAttack(defender) * attacker.bleed.mod * attackerShock;
    bdamage -= attacker.defense;
    return bdamage;
  },
  resetCombat: function (resetStats) {
    this.trimp = this.template();
    this.trimp.isTrimp = true;
    this.enemy = this.template();
    this.battleTime = 0;
    this.checkItems();
    this.trimp.health = this.trimp.maxHealth;
    this.enemy.level = this.enemyLevel;
    var atkSpdLevel = Math.min(this.enemyLevel, 29);
    this.enemy.baseAttackSpeed *= Math.pow(0.98, atkSpdLevel);
    if (this.enemyLevel >= 30) {
      atkSpdLevel = this.enemyLevel - 29;
      this.enemy.slowAura = Math.pow(1.01, atkSpdLevel);
    }
    this.enemy.baseHealth *= Math.pow(1.205, this.enemyLevel);
    this.enemy.baseAttack += 2 * (this.enemyLevel - 1);
    this.enemy.baseAttack *= Math.pow(1.04, this.enemyLevel);
    if (this.enemyLevel >= 50) {
      var newLev = this.enemyLevel - 49;
      this.enemy.baseHealth *= Math.pow(1.1, newLev);
      this.enemy.baseAttack *= Math.pow(1.1, newLev);
    }
    this.enemy.defense += 0.5 * this.enemyLevel;
    this.enemy.poisonResist += this.enemyLevel;
    this.enemy.bleedResist += this.enemyLevel;
    this.enemy.shockResist += this.enemyLevel;
    if (this.enemyLevel >= 15)
      this.enemy.lifestealResist += 0.03 * (this.enemy.level - 14);
    if (this.enemyLevel >= 30) this.enemy.enrageMult = 1.5;
    this.setProfile();
    this.enemy.maxHealth = this.enemy.baseHealth;
    this.enemy.health = this.enemy.baseHealth;
    if (this.items.Fearsome_Piercer.equipped)
      this.items.Fearsome_Piercer.onEnemy();
    if (this.items.Sacrificial_Shank.equipped)
      this.items.Sacrificial_Shank.onEnemy();

    this.fight();
    if (resetStats) this.resetStats();
  },
  setProfile: function () {
    this.profile = "";
    if (this.enemyLevel == 1) return;
    var seed = this.seed;

    seed += 100 * this.enemyLevel;
    if (this.enemyLevel >= 51) seed += 3125; //Generated with Shold brain RNG
    var doubleResist = true;
    if (this.enemyLevel > 50) {
      doubleResist = getRandomIntSeeded(seed++, 0, 100);
      doubleResist = doubleResist < 20;
    }
    if (this.enemyLevel <= 50) doubleResist = true;
    var effects = ["Healthy", "Fast", "Strong", "Defensive"];
    if (this.enemyLevel > 5) {
      effects.push("Poisoning", "Bloodletting", "Shocking", "Lifestealing");
    }
    if (this.enemyLevel > 10) {
      effects.push("Poison Resistant", "Shock Resistant", "Bleed Resistant");
    }
    if (this.enemyLevel > 20) {
      effects.push("Enraging");
    }
    if (this.enemyLevel > 50) {
      effects.push("Explosive", "Berserking", "Slowing", "Ethereal");
    }
    var effectsCount;
    if (this.enemyLevel < 25)
      effectsCount = Math.ceil((this.enemyLevel + 1) / 5);
    else effectsCount = 4 + Math.ceil((this.enemyLevel - 19) / 10);
    var selectedEffects = [];
    var selectedEffectsCount = [];
    var maxEffectStack = 1;
    maxEffectStack += Math.floor(this.enemyLevel / 10);
    var healthMult = 1;
    var attackMult = 1;
    for (var x = 0; x < effectsCount; x++) {
      var roll = getRandomIntSeeded(seed++, 0, effects.length);
      var effect = effects[roll];
      if (!doubleResist && effect.search("Resistant") != -1) {
        var offset = this.enemyLevel % 3;
        roll = getRandomIntSeeded(seed++, 0, 100);
        if (roll >= 40) {
          if (offset == 0) effect = "Poison Resistant";
          if (offset == 1) effect = "Shock Resistant";
          if (offset == 2) effect = "Bleed Resistant";
        }
      }
      var checkSelected = selectedEffects.indexOf(effect);
      if (checkSelected == -1) {
        selectedEffects.push(effect);
        selectedEffectsCount.push(1);
        checkSelected = selectedEffects.length - 1;
      } else {
        selectedEffectsCount[checkSelected]++;
      }
      if (selectedEffectsCount[checkSelected] >= maxEffectStack) {
        effects.splice(effects.indexOf(effect), 1);
      }
      var totalStacks = selectedEffectsCount[checkSelected];
      var repeatMod = 1;
      if (totalStacks > 1) {
        repeatMod *= Math.pow(0.5, totalStacks - 1);
      }
      switch (effect) {
        case "Healthy":
          var mod = this.enemyLevel / 30;
          healthMult += Math.min(1, mod);
          if (selectedEffectsCount[checkSelected] >= 4)
            effects.splice(effects.indexOf(effect), 1);
          break;
        case "Strong":
          var mod = this.enemyLevel / 30;
          attackMult += Math.min(1, mod);
          if (selectedEffectsCount[checkSelected] >= 4)
            effects.splice(effects.indexOf(effect), 1);
          break;
        case "Fast":
          var mod = Math.pow(0.98, this.enemyLevel);
          this.enemy.baseAttackSpeed *= Math.max(0.5, mod);
          if (selectedEffectsCount[checkSelected] >= 2)
            effects.splice(effects.indexOf(effect), 1);
          break;
        case "Poisoning":
          this.enemy.poisonChance += Math.ceil(this.enemyLevel * 3 * repeatMod);
          this.enemy.poisonMod += Math.ceil((this.enemyLevel / 5) * repeatMod);
          if (this.enemyLevel >= 30)
            this.enemy.poisonMod += this.enemyLevel - 29;
          if (totalStacks == 1)
            this.enemy.poisonStack += Math.floor(this.enemyLevel / 10);
          else this.enemy.poisonStack++;
          this.enemy.poisonTime = 2500 + Math.ceil(this.enemyLevel / 5) * 2500;
          break;
        case "Bloodletting":
          this.enemy.bleedChance += Math.ceil(this.enemyLevel * 3 * repeatMod);
          this.enemy.bleedMod += Math.ceil(
            Math.min(2, this.enemyLevel / 20) * repeatMod
          );
          this.enemy.bleedTime = 8000;
          break;
        case "Shocking":
          this.enemy.shockChance += Math.ceil(this.enemyLevel * 3 * repeatMod);
          this.enemy.shockMod += Math.ceil(
            Math.min(2.5, this.enemyLevel / 15) * repeatMod
          );
          this.enemy.shockTime = 8000;
          break;
        case "Poison Resistant":
          this.enemy.poisonResist += 10 * this.enemyLevel;
          effects.splice(effects.indexOf(effect), 1);
          if (!doubleResist || selectedEffects.indexOf("Bleed Resistant") != -1)
            effects.splice(effects.indexOf("Shock Resistant"), 1);
          if (!doubleResist || selectedEffects.indexOf("Shock Resistant") != -1)
            effects.splice(effects.indexOf("Bleed Resistant"), 1);
          break;
        case "Bleed Resistant":
          this.enemy.bleedResist += 10 * this.enemyLevel;
          effects.splice(effects.indexOf(effect), 1);
          if (
            !doubleResist ||
            selectedEffects.indexOf("Poison Resistant") != -1
          )
            effects.splice(effects.indexOf("Shock Resistant"), 1);
          if (!doubleResist || selectedEffects.indexOf("Shock Resistant") != -1)
            effects.splice(effects.indexOf("Poison Resistant"), 1);
          break;
        case "Shock Resistant":
          this.enemy.shockResist += 10 * this.enemyLevel;
          effects.splice(effects.indexOf(effect), 1);
          if (!doubleResist || selectedEffects.indexOf("Bleed Resistant") != -1)
            effects.splice(effects.indexOf("Poison Resistant"), 1);
          if (
            !doubleResist ||
            selectedEffects.indexOf("Poison Resistant") != -1
          )
            effects.splice(effects.indexOf("Bleed Resistant"), 1);
          break;
        case "Defensive":
          this.enemy.defense += Math.ceil(
            this.enemy.level * 0.75 * Math.pow(1.05, this.enemy.level)
          );
          break;
        case "Lifestealing":
          this.enemy.lifesteal += Math.min(1, this.enemyLevel / 50);
          break;
        case "Enraging":
          this.enemy.enrageFreq -= 10;
          this.enemy.enrageMult += 0.1;
          if (selectedEffectsCount[checkSelected] >= 2)
            effects.splice(effects.indexOf(effect), 1);
          break;
        case "Slowing":
          this.enemy.slowAura += 0.1;

          break;
        case "Explosive":
          var count = selectedEffectsCount[checkSelected];
          if (count >= 3) effects.splice(effects.indexOf(effect), 1);
          if (count == 1) {
            this.enemy.explodeDamage = 1.5;
            this.enemy.explodeFreq = 20000;
          } else {
            this.enemy.explodeDamage += 0.3;
            this.enemy.explodeFreq -= 5000;
          }
          effects.splice(effects.indexOf("Berserking"));
          effects.splice(effects.indexOf("Ethereal"));
          break;
        case "Berserking":
          var count = selectedEffectsCount[checkSelected];
          if (count >= 3) effects.splice(effects.indexOf(effect), 1);
          if (count == 1) {
            this.enemy.berserkMod = 1.05;
            this.enemy.berserkEvery = 4;
          } else {
            this.enemy.berserkMod += 0.05;
            this.enemy.berserkEvery--;
          }
          effects.splice(effects.indexOf("Explosive"));
          effects.splice(effects.indexOf("Ethereal"));
          break;
        case "Ethereal":
          var count = selectedEffectsCount[checkSelected];
          if (count >= 3) effects.splice(effects.indexOf(effect), 1);
          // console.log("this is getting updated");
          if (count == 1) {
            this.enemy.ethChance = 10;
          } else {
            this.enemy.ethChance += 5;
          }
          // console.log(this.enemy.ethChance);
          effects.splice(effects.indexOf("Explosive"));
          effects.splice(effects.indexOf("Berserking"));
          break;
      }
    }
    this.enemy.baseHealth *= healthMult;
    this.enemy.baseAttack *= attackMult;
    for (var x = 0; x < selectedEffects.length; x++) {
      this.profile += selectedEffects[x];
      if (selectedEffectsCount[x] > 1)
        this.profile += " x" + selectedEffectsCount[x] + "";
      this.profile += ", ";
    }
    this.profile = this.profile.substring(0, this.profile.length - 2);
  },
  trimpDied: function () {
    this.sessionTrimpsKilled++;
    this.lootAvg.counter += this.battleTime;
    this.onTrimpDied(); // notify controller
    this.resetCombat();
    //this.notes += "Trimp Died. "
  },
  getDustMult: function () {
    var amt = 1;
    if (this.items.Lifegiving_Gem.equipped) {
      amt *= 1 + this.items.Lifegiving_Gem.dustIncrease();
    }
    amt += this.trimp.dustMult;
    if (this.oneTimers.Dusty_Tome.owned) {
      amt *= 1 + 0.05 * (this.maxEnemyLevel - 1);
    }
    if (u2Mutations.tree.Dust.purchased) {
      var mutMult = 1.25;
      if (u2Mutations.tree.Dust2.purchased) {
        mutMult += 0.25;
      }
      amt *= mutMult;
    }
    if (
      this.items.Box_of_Spores.equipped &&
      this.enemy.bleed.time <= 0 &&
      this.enemy.poison.time >= 0
    ) {
      amt *= this.items.Box_of_Spores.dustMult();
    }
    if (game.global.fluffyExp2 >= 1466015503701000) amt *= 5; //don't even look at this line, just move on
    return amt;
  },
  getEnrageMult: function () {
    var enrages = Math.floor(this.battleTime / (this.enemy.enrageFreq * 1000));
    if (enrages < 1) return 1;
    return Math.pow(this.enemy.enrageMult, enrages);
  },
  getDustReward: function () {
    var amt =
      (1 + (this.enemy.level - 1) * 5) * Math.pow(1.19, this.enemy.level - 1);
    if (this.enemy.level >= 50) amt *= Math.pow(1.1, this.enemy.level - 49);
    amt *= this.getDustMult();
    return amt;
  },
  enemyDied: function () {
    //this.notes += "Enemy Died. "
    this.sessionEnemiesKilled++;
    var amt = this.getDustReward();
    this.dust += amt;
    game.stats.saDust.value += amt;
    if (this.enemyLevel > 50) {
      this.shardDust += amt;
      if (this.shardDust >= 1e9) {
        var shardAmt = Math.floor(this.shardDust / 1e9);
        this.shards += shardAmt;
        this.shardDust -= 1e9 * shardAmt;
        game.stats.saShards.value += shardAmt;
      }
    }
    this.lootAvg.accumulator += amt;
    this.lootAvg.counter += this.battleTime;
    /*if (this.enemy.level == this.maxEnemyLevel && this.speed == 1) {
			this.enemiesKilled++;
			if (this.enemiesKilled >= this.nextLevelCount()) {
				this.maxEnemyLevel++;
				if (this.autoLevel) this.enemyLevel++;
				this.enemiesKilled = 0;
				this.resetStats();
			}
		}*/
    this.onEnemyDied(); // notify controller
    this.resetCombat();
  },
  nextLevelCount: function () {
    if (this.enemyLevel < 20) return 10 * this.enemyLevel;
    return 190 + 15 * (this.enemyLevel - 19);
  },
  update: function () {
    this.fight();
    this.battleTime += this.frameTime;
  },
  getDustPs: function () {
    var dps = 0;
    if (this.lootAvg.accumulator == 0) {
      if (!this.enemy) return 0;
      if (this.sessionTrimpsKilled > 0) return 0;
      if (this.enemy.health >= this.enemy.maxHealth) return 0;
      if (this.enemy.health <= 0 || this.trimp.health <= 0) return 0;
      var enPct = this.enemy.health / this.enemy.maxHealth;
      var tpPct = this.trimp.health / this.trimp.maxHealth;
      if (enPct > tpPct) return 0;
      var reward = this.getDustReward();
      dps = 1000 * ((reward * (1 - enPct)) / this.battleTime);
    } else dps = 1000 * (this.lootAvg.accumulator / this.lootAvg.counter);
    if (dps < 0.01) dps = 0;
    return dps;
  },
  resetStats: function () {
    this.sessionEnemiesKilled = 0;
    this.sessionTrimpsKilled = 0;
    this.lootAvg.accumulator = 0;
    this.lootAvg.counter = 0;
    this.battleTime = 0;
  },
  //popup stuff
  equip: function (item) {
    var itemObj = this.items[item];
    if (!itemObj) return;
    itemObj.equipped = !itemObj.equipped;
    // this.resetCombat(true);
  },
  countEquippedItems: function () {
    var count = 0;
    for (var ck in this.items) {
      if (this.items[ck].equipped) count++;
    }
    return count;
  },
  countOwnedItems: function () {
    var count = 0;
    for (var ck in this.items) {
      if (this.items[ck].owned) count++;
    }
    return count;
  },
  getBonusCost: function (what) {
    var bonus = this.bonuses[what];
    return Math.ceil(bonus.price * Math.pow(bonus.priceMod, bonus.level));
  },
  upgradeCost: function (item) {
    var itemObj = this.items[item];
    if (!itemObj) return;
    var priceMod = 3;
    if (itemObj.priceMod) priceMod = itemObj.priceMod;
    var startPrice = 5;
    if (itemObj.startPrice) startPrice = itemObj.startPrice;
    return startPrice * Math.pow(priceMod, itemObj.level - 1);
  },
  upgrade: function (item) {
    var itemObj = this.items[item];
    if (!itemObj) return;
    var cost = this.upgradeCost(item);
    var currency =
      this.items[item].dustType == "shards" ? this.shards : this.dust;
    if (currency < cost) return;
    this.saveLastAction("upgrade", item);
    if (this.items[item].dustType == "shards") this.shards -= cost;
    else this.dust -= cost;

    itemObj.level++;
  },
  levelDown: function () {
    if (this.enemyLevel > 1) {
      this.enemyLevel--;
      this.autoLevel = false;
      this.resetCombat(true);
    }
    this.updatePopupBtns();
  },
  levelUp: function () {
    if (this.enemyLevel < this.maxEnemyLevel) {
      this.enemyLevel++;
      this.resetCombat(true);
    }
    this.updatePopupBtns();
  },
  toggleAutoLevel: function () {
    this.autoLevel = !this.autoLevel;
    if (this.autoLevel && this.enemyLevel != this.maxEnemyLevel) {
      this.enemyLevel = this.maxEnemyLevel;
      this.resetCombat(true);
    }
  },
  hide: function (itemName) {
    this.items[itemName].hidden = true;
    if (this.items[itemName].equipped) this.items[itemName].equipped = false;
  },
  restore: function (itemName) {
    this.items[itemName].hidden = false;
  },
  renamePresetTooltip: function (which) {
    var text =
      "Rename Preset " +
      which +
      "<br/><input style='width: 75%; margin-left: 12.5%' id='abPresetNameInput' value='" +
      this.presets.names[which - 1] +
      "'/>";
    return text;
  },
  cleanName: function (name) {
    return name.split("__").join("-").split("_").join(" ");
  },
  savePresetName: function (which) {
    var input = document.getElementById("abPresetNameInput");
    if (!input) return;
    var value = input.value;
    if (value.length < 1) return;
    value = htmlEncode(value.substring(0, 25));
    this.presets.names[which - 1] = value;
  },
  getFreshRings: function () {
    return {
      level: 1,
      mods: [],
    };
  },

  getRingStatusDamage: function () {
    if (!this.oneTimers.The_Ring.owned) return 0;
    return (
      this.rings.level * 25 * Math.pow(1.5, Math.floor(this.rings.level / 10))
    );
  },
  getRingPoisonDamage: function () {
    if (!this.oneTimers.The_Ring.owned) return 0;
    return (
      this.rings.level * 15 * Math.pow(5, Math.floor(this.rings.level / 10))
    );
  },
  getRingStatusChance: function () {
    if (this.rings.level < 10) return 0;
    var calcLevel = this.rings.level - 9;
    return calcLevel * 20 * Math.pow(1.25, Math.floor(calcLevel / 10));
  },
  getRingStatAmt: function (modObj) {
    return (
      modObj.baseGain *
      this.rings.level *
      Math.pow(modObj.perTen, Math.floor(this.rings.level / 10))
    );
  },
  getRingSlots: function () {
    var amt = Math.floor((this.rings.level - 5) / 10) + 1;
    if (amt > 2) amt = 2;
    return amt;
  },
  levelRing: function () {
    var cost = this.getRingLevelCost();
    if (this.shards < cost) return;
    this.saveLastAction("ring", null, cost);
    this.shards -= cost;
    this.rings.level++;
    var slots = this.getRingSlots();
    if (this.rings.mods.length < slots) {
      var availableMods = this.getAvailableRingMods();
      var randomMod =
        availableMods[Math.floor(Math.random() * availableMods.length)];
      this.rings.mods.push(randomMod);
    }
  },
  getAvailableRingMods: function () {
    var availableMods = [];
    var keys = Object.keys(autoBattle.ringStats);
    for (var x = 0; x < keys.length; x++) {
      if (this.rings.mods.indexOf(keys[x]) == -1) availableMods.push(keys[x]);
    }
    return availableMods;
  },
  changeRing: function (elem, slot, useValue) {
    var availableMods = this.getAvailableRingMods();
    if (!useValue) useValue = elem.value;
    if (availableMods.indexOf(useValue) == -1) return;
    if (slot > this.getRingSlots() - 1) return;
    this.rings.mods[slot] = useValue;
    this.resetCombat();
  },
  getRingLevelCost: function () {
    return Math.ceil(15 * Math.pow(2, this.rings.level));
  },
  ringStats: {
    attack: {
      formatEffect: function (amt) {
        return "+ " + prettify(amt) + " Attack";
      },
      name: "Attack",
      doStuff: function (amt) {
        autoBattle.trimp.attack += amt;
      },
      baseGain: 50,
      perTen: 5,
    },
    health: {
      formatEffect: function (amt) {
        return "+ " + prettify(amt) + " Health";
      },
      name: "Health",
      doStuff: function (amt) {
        autoBattle.trimp.maxHealth += amt;
      },
      baseGain: 200,
      perTen: 5,
    },
    defense: {
      formatEffect: function (amt) {
        return "+ " + prettify(amt) + " Defense";
      },
      name: "Defense",
      doStuff: function (amt) {
        autoBattle.trimp.defense += amt;
      },
      baseGain: 25,
      perTen: 2.5,
    },
    lifesteal: {
      formatEffect: function (amt) {
        return "+ " + prettify(amt) + "% Lifesteal";
      },
      name: "Lifesteal",
      doStuff: function (amt) {
        amt /= 100;
        autoBattle.trimp.lifesteal += amt;
      },
      baseGain: 2.5,
      perTen: 4,
    },
    dustMult: {
      formatEffect: function (amt) {
        return "+ " + prettify(amt) + "% Dust Mult";
      },
      name: "Dust Mult",
      doStuff: function (amt) {
        amt /= 100;
        autoBattle.trimp.dustMult += amt;
      },
      baseGain: 5,
      perTen: 2,
    },
  },
  getCurrencyName: function (item) {
    var curName = this.items[item].dustType
      ? this.items[item].dustType
      : "dust";
    return curName.charAt(0).toUpperCase() + curName.slice(1);
  },
  hideMode: false,

  // Function to simulate max/min luck.
  oneFight: function (luck) {
    this.resetCombat();

    while (this.trimp.health > 0 || this.enemy.health > 0) {
      this.battleTime += this.frameTime;
      this.enemy.maxHealth = this.enemy.baseHealth;
      this.trimp.maxHealth = this.trimp.baseHealth;
      this.enemy.attackSpeed = this.enemy.baseAttackSpeed;
      this.trimp.attackSpeed = this.trimp.baseAttackSpeed;
      this.trimp.attack = this.trimp.baseAttack;
      this.enemy.attack = this.enemy.baseAttack;
      this.trimp.shockChance = 0;
      this.trimp.shockMod = 0;
      this.trimp.shockTime = 0;

      this.trimp.bleedChance = 0;
      this.trimp.bleedMod = 0;
      this.trimp.bleedTime = 0;

      this.trimp.poisonChance = 0;
      this.trimp.poisonTime = 0;
      this.trimp.poisonMod = 0;
      this.trimp.poisonStack = 2;
      this.trimp.poisonTick = 1000;
      this.trimp.poisonHeal = 0;

      this.trimp.shockResist = 0;
      this.trimp.poisonResist = 0;
      this.trimp.bleedResist = 0;

      this.trimp.defense = 0;
      this.trimp.lifesteal = 0;
      this.trimp.damageTakenMult = 1;
      this.trimp.slowAura = 1;
      this.trimp.dustMult = 0;

      this.checkItems();

      for (let mod of ["bleed", "poison", "shock"]) {
        let chance = mod + "Chance";
        let res = mod + "Resist";
        let tchance = this.trimp[chance] - this.enemy[res];
        if (tchance > 0 && tchance < 100) {
          this.trimp[chance] = this.enemy[res] + 100 * luck;
        }

        let echance = this.enemy[chance] - this.trimp[res];
        if (echance > 0 && echance < 100) {
          this.enemy[chance] = this.trimp[res] + -100 * luck;
        }
      }

      if (this.enemy.ethChance > 0) {
        this.enemy.ethChance = luck === -1 ? 100 : 0;
      }

      var trimpAttackTime = this.trimp.attackSpeed;
      this.enemy.lastAttack += this.frameTime;
      this.trimp.lastAttack += this.frameTime;
      if (this.trimp.lastAttack >= trimpAttackTime) {
        this.trimp.lastAttack -= trimpAttackTime;
        this.attack(this.trimp, this.enemy, luck);
      }

      this.checkPoison(this.trimp);
      if (this.trimp.bleed.time > 0) this.trimp.bleed.time -= this.frameTime;
      if (this.trimp.shock.time > 0) this.trimp.shock.time -= this.frameTime;
      if (this.enemy.health <= 0) {
        this.enemyDied();
        return this.enemy;
      }
      if (this.trimp.health <= 0) {
        this.trimpDied();
        return this.trimp;
      }
      var enemyAttackTime = this.enemy.attackSpeed;
      if (this.enemy.lastAttack >= enemyAttackTime) {
        this.enemy.lastAttack -= enemyAttackTime;
        this.attack(this.enemy, this.trimp, luck * -1);
      }

      if (!this.enemy.noSlow) this.enemy.attackSpeed *= this.trimp.slowAura;
      var enemyAttackTime = this.enemy.attackSpeed;
      if (this.enemy.lastAttack >= enemyAttackTime) {
        this.enemy.lastAttack -= enemyAttackTime;
        this.attack(this.enemy, this.trimp);
      }
      if (this.enemy.explodeFreq != -1) {
        this.enemy.lastExplode += this.frameTime;
        if (this.enemy.lastExplode >= this.enemy.explodeFreq) {
          this.enemy.lastExplode -= this.enemy.explodeFreq;
          var dmg =
            this.enemy.explodeDamage * this.getAttack(this.enemy) -
            this.trimp.defense;
          this.damageCreature(this.trimp, dmg);
        }
      }

      this.checkPoison(this.enemy);
      if (this.enemy.bleed.time > 0) this.enemy.bleed.time -= this.frameTime;
      if (this.enemy.shock.time > 0 && this.enemy.shock.time != 9999999)
        this.enemy.shock.time -= this.frameTime;
      if (this.trimp.health > this.trimp.maxHealth)
        this.trimp.health = this.trimp.maxHealth;
      if (this.enemy.health > this.enemy.maxHealth)
        this.enemy.health = this.enemy.maxHealth;
      if (this.trimp.health <= 0) {
        this.trimpDied();
        return this.trimp;
      }
      if (this.enemy.health <= 0) {
        this.enemyDied();
        return this.enemy;
      }
    }
    return "error?";
  },
};

// Functions from other trimps scripts.
const prettify = (num) => {
  return num.toLocaleString("en-US", {
    maximumSignificantDigits: 4,
    notation: "compact",
    compactDisplay: "short",
  });
};

const seededRandom = (seed) => {
  let x = Math.sin(seed++) * 10000;
  return parseFloat((x - Math.floor(x)).toFixed(7));
};

const getRandomIntSeeded = (seed, minIncl, maxExcl) => {
  let toReturn = Math.floor(seededRandom(seed) * (maxExcl - minIncl)) + minIncl;
  return toReturn === maxExcl ? minIncl : toReturn;
};

// Custom functions.
const rollNewRolls = (chance) => {
  chance += autoBattle.leftoverChance;
  let accurate = 100 / chance;
  let rounded = Math.floor(accurate);
  autoBattle.leftoverChance = accurate - rounded;

  let roll = Math.floor(Math.random() * rounded);
  let rolls = new Array(rounded).fill(0);
  rolls[roll] = 1;
  return rolls;
};
