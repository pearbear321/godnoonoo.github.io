import { autoBattle } from "./object.js";
import { LZString } from "./lz-string.js";

document.addEventListener("DOMContentLoaded", function () {
	setup();
	getElements();
});

let AB = autoBattle;
let LZ = LZString;
let startTime;
let formatter = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 3 });

function format(num) {
	num = formatter.format(num);
	return num.replaceAll(",", " ");
}

let elements;

function getElements() {
	let ele = {
		buildCost: document.getElementById("buildCost"),
		timeSpent: document.getElementById("timeSpent"),
		processedTime: document.getElementById("processedTime"),
		enemiesKilled: document.getElementById("enemiesKilled"),
		trimpsKilled: document.getElementById("trimpsKilled"),
		clearingTime: document.getElementById("clearingTime"),
		dustPs: document.getElementById("dustPs"),
		averageFightTime: document.getElementById("averageFightTime"),
		averageKillTime: document.getElementById("averageKillTime"),
	};
	elements = ele;
}

const startSimulation = () => {
	AB.bonuses.Extra_Limbs.level = 100; // TODO: make this better if needed?
	setActiveItems();
	setActiveOneTimers();
	setLevels();
	calcBuildCost();
	runSimulation(100000);
	wrapup();
};

const enemyCount = (level) => {
	if (level < 20) return 10 * level;
	return 190 + 15 * (level - 19);
};

const wrapup = () => {
	const endTime = Date.now();
	const time = endTime - startTime;
	const WR =
		AB.sessionEnemiesKilled /
		(AB.sessionEnemiesKilled + AB.sessionTrimpsKilled);
	const toKill = enemyCount(AB.enemyLevel);
	const base_dust = AB.getDustPs();

	elements.timeSpent.innerHTML = time + " ms";

	let timeSpent = AB.lootAvg.counter;
	elements.processedTime.innerHTML = timeSpent + " ms";

	let enemiesKilled = AB.sessionEnemiesKilled;
	elements.enemiesKilled.innerHTML = enemiesKilled;

	let trimpsKilled = AB.sessionTrimpsKilled;
	elements.trimpsKilled.innerHTML = trimpsKilled + " [" + 100 * WR + "%]";
	elements.clearingTime.innerHTML =
		format(
			((toKill / AB.sessionEnemiesKilled) * AB.lootAvg.counter) / 1000
		) + " s";
	elements.dustPs.innerHTML = format(base_dust) + " D/s";

	let fightTime = timeSpent / (enemiesKilled + trimpsKilled);
	elements.averageFightTime.innerHTML = format(fightTime) + " ms";

	fightTime = timeSpent / enemiesKilled;
	elements.averageKillTime.innerHTML = format(fightTime) + " ms";
};

function setup() {
	makeEquipBtns();
	makeOneTimersBtns();
	addListeners();
}

const prettify = (num) => {
	return num.toLocaleString("en-GB", {
		maximumSignificantDigits: 4,
		notation: "compact",
		compactDisplay: "short",
	});
};

function makeEquipBtns() {
	let equipDiv = document.getElementById("equipDiv");
	let items = orderByUnlock();
	for (let i = 0; i < items.length; i++) {
		let item = items[i];
		let div = document.createElement("div");
		div.className = "equipInpDiv";
		equipDiv.appendChild(div);

		let span = document.createElement("span");
		let name = item.replaceAll("_", " ");
		span.textContent = name;
		div.appendChild(span);

		let inpDiv = document.createElement("div");
		inpDiv.className = "inputAndCheckDivInp";
		div.appendChild(inpDiv);

		let input = document.createElement("input");
		input.type = "number";
		input.value = 1;
		input.className = "equipInput";
		input.id = item + "_Input";
		addChangeForEquip(input);
		inpDiv.appendChild(input);

		let checkBox = document.createElement("input");
		checkBox.type = "checkBox";
		checkBox.id = item + "_CheckBox";
		addChangeForCheckBox(checkBox);
		inpDiv.appendChild(checkBox);
	}
}

function makeOneTimersBtns() {
	let parDir = document.getElementById("oneTimersDiv");
	for (const oneTimer in AB.oneTimers) {
		if (Object.hasOwnProperty.call(AB.oneTimers, oneTimer)) {
			let div = document.createElement("div");
			div.className = "oneTimersInpDiv";
			parDir.appendChild(div);

			let span = document.createElement("span");
			let name = oneTimer.replaceAll("_", " ");
			span.textContent = name;
			div.appendChild(span);

			let checkBox = document.createElement("input");
			checkBox.type = "checkBox";
			checkBox.className = "oneTimerInput";
			checkBox.id = oneTimer + "_Input";
			div.appendChild(checkBox);
		}
	}
}

function addChangeForEquip(item) {
	item.addEventListener("change", (event) => {
		let value = event.target.value;
		if (parseInt(Number(value)) >= 1) {
			let name = item.id.replace("_Input", "");
			value = Number(value).toString();
			event.target.value = value;
			AB.items[name].level = value;
		} else {
			event.target.value = 1;
		}
		calcBuildCost();
	});
}

function addChangeForCheckBox(checkBox) {
	checkBox.addEventListener("change", (event) => {
		let lvl = document.getElementById(
			checkBox.id.replace("_CheckBox", "_Input")
		);
		let name = checkBox.id.replace("_CheckBox", "");
		if (parseInt(lvl.value) > 0) {
			AB.equip(name);
		}
		calcBuildCost();
	});
}

function isInt(value) {
	return (
		!isNaN(value) &&
		parseInt(Number(value)) === value &&
		!isNaN(parseInt(value, 10))
	);
}

function setActiveItems() {
	clearItems();
	setItems();
}

function clearItems() {
	for (const item in AB.items) {
		AB.items[item].owned = false;
		if (AB.items[item].equipped) AB.equip(item);
		AB.items[item].hidden = false;
		AB.items[item].level = 1;
	}
}

function setItems() {
	let items = document.querySelectorAll("input.equipInput");
	let ogItems = AB.items;
	for (const ogItem in ogItems) {
		items.forEach((item) => {
			let name = item.id.replace("_Input", "");
			let val = parseInt(item.value);
			if (ogItem === name && val > 0) {
				AB.items[name].owned = true;
				AB.items[name].level = val;
				if (item.nextSibling.checked) {
					AB.equip(name);
				}
			}
		});
	}
}

function setActiveOneTimers() {
	clearOneTimers();
	setOneTimers();
}

function clearOneTimers() {
	for (const oneTimer in AB.oneTimers) {
		if (Object.hasOwnProperty.call(AB.oneTimers, oneTimer)) {
			AB.oneTimers[oneTimer].owned = false;
		}
	}
}

function setOneTimers() {
	let oneTimers = document.querySelectorAll("input.oneTimerInput");
	oneTimers.forEach((oneTimer) => {
		if (oneTimer.checked) {
			let name = oneTimer.id.replace("_Input", "");
			AB.oneTimers[name].owned = true;
		}
	});
}

function calcBuildCost() {
	setActiveItems();
	let cost = 0;
	for (let item in AB.items) {
		if (AB.items[item].equipped) {
			cost +=
				(AB.items[item].startPrice || 5) *
				((1 -
					Math.pow(
						AB.items[item].priceMod || 3,
						AB.items[item].level - 1
					)) /
					(1 - (AB.items[item].priceMod || 3)));
		}
	}
	elements.buildCost.innerHTML = prettify(cost);
}

function setLevels() {
	let curr = document.getElementById("currentLevel");
	AB.enemyLevel = parseInt(curr.value);
	let maxLvl = document.getElementById("highestLevel");
	AB.maxEnemyLevel = parseInt(maxLvl.value);
}

function setItemsInHtml(itemsList, oneTimersList, currentLevel, maxLevel) {
	let itemBoxes = document.querySelectorAll("input.equipInput");
	itemBoxes.forEach((box) => {
		box.value = 1;
		let item = box.id.replace("_Input", "");
		if (itemsList.hasOwnProperty(item)) {
			box.value = itemsList[item].level;
			if (itemsList[item].equipped) {
				box.nextSibling.checked = true;
			}
		}
	});

	let OTBoxes = document.querySelectorAll("input.oneTimerInput");
	OTBoxes.forEach((box) => {
		let OT = box.id.replace("_Input", "");
		if (oneTimersList.hasOwnProperty(OT)) {
			if (oneTimersList[OT]) box.checked = true;
		}
	});

	let target = document.getElementById("currentLevel");
	target.value = parseInt(currentLevel);

	target = document.getElementById("highestLevel");
	target.value = maxLevel;
}

function orderByUnlock() {
	let order = AB.getItemOrder();
	let sorted = [];
	let n = order.length;
	for (let i = 0; i < n; i++) {
		let item = order[i];
		sorted.push(item.name);
	}
	return sorted;
}

function addListeners() {
	let target;
	// Start button
	document
		.getElementById("startButton")
		.addEventListener("click", startSimulation);

	// SA level
	target = document.getElementById("currentLevel");
	target.value = AB.enemyLevel;
	target.addEventListener("change", (event) => {
		let value = parseInt(event.target.value);
		let maxLvl = document.getElementById("highestLevel");
		if (value < 1) {
			value = 1;
			event.target.value = value;
		}
		if (parseInt(maxLvl.value) < value) {
			maxLvl.value = value;
		}
	});

	// SA highest level
	target = document.getElementById("highestLevel");
	target.value = AB.maxEnemyLevel;
	target.addEventListener("change", (event) => {
		let value = parseInt(event.target.value);
		if (value < 1) event.target.value = 1;
	});

	// Input for save
	target = document.getElementById("saveInput");
	target.addEventListener("paste", (event) => {
		onSavePaste(event);
	});

	// Calculator buttons
	document
		.getElementById("bestUpgradesButton")
		.addEventListener("click", findBestDpsUpgrade);

	document
		.getElementById("theoreticalWin")
		.addEventListener("click", maxLuck);
}

function findBestDpsUpgrade() {
	setActiveItems();
	setActiveOneTimers();
	setLevels();

	if (getEquippedItems().length) {
		let speed = 200069;
		runSimulation(speed);
		let currDps = AB.getDustPs();
		let items = getEquippedItems();
		let dustForItems = [];
		for (const ind in items) {
			let name = items[ind].name;
			let newDps = dustWithUpgrade(name, speed);
			let increase = newDps - currDps;

			// How long until upgrade is paid back.
			let upgradeCost = AB.upgradeCost(items[ind].name);
			let time = upgradeCost / increase;
			if (time < 0 ) {
				time = Infinity;
			}

			dustForItems.push({
				name: name,
				increase: increase,
				time: time,
			});
		}

		// Find the best upgrade.
		let bestUpgrade = dustForItems.reduce((a, b) =>
			a.increase > b.increase ? a : b
		);

		// Find the lowest payback time.
		let bestPayback = dustForItems.reduce((a, b) =>
			a.time < b.time ? a : b
		);

		let div = document.getElementById("bestUpgradesDiv");
		// Clear earlier data.
		while (div.firstChild) {
			div.removeChild(div.lastChild);
		}

		let ldiv = document.createElement("div");
		let mdiv = document.createElement("div");
		let rdiv = document.createElement("div");
		div.appendChild(ldiv);
		div.appendChild(mdiv);
		div.appendChild(rdiv);

		let text = document.createElement("span");
		text.innerHTML = "Item +1 level";
		ldiv.appendChild(text);

		let text2 = document.createElement("span");
		text2.innerHTML = "~+DpS";
		mdiv.appendChild(text2);

		let text3 = document.createElement("span");
		text3.innerHTML = "Time until profit";
		rdiv.appendChild(text3);

		dustForItems.forEach((item) => {
			let name = item.name.replaceAll("_", " ");
			let span1 = document.createElement("span");
			let span2 = document.createElement("span");
			let span3 = document.createElement("span");
			span1.innerHTML = name;
			span2.innerHTML = prettify(item.increase);
			span3.innerHTML = prettify(item.time / 3600) + " h";
			ldiv.appendChild(span1);
			mdiv.appendChild(span2);
			rdiv.appendChild(span3);

			if (item.name === bestUpgrade.name) {
				// bold the best upgradeCost
				span2.style.fontWeight = "bold";
			}

			if (item.name === bestPayback.name) {
				// add astrix to the best payback time
				span3.style.fontWeight = "bold";
			}
		});
	}
}

function getEquippedItems() {
	let equipped = [];
	for (const item in AB.items) {
		if (AB.items[item].equipped) {
			equipped.push({ name: item, data: AB.items[item] });
		}
	}
	return equipped;
}

function onSavePaste(event) {
	let paste = event.clipboardData.getData("text");
	let save = JSON.parse(LZ.decompressFromBase64(paste));
	let items = save.global.autoBattleData.items;
	let oneTimers = save.global.autoBattleData.oneTimers;
	let currentLevel = save.global.autoBattleData.enemyLevel;
	let maxLevel = save.global.autoBattleData.maxEnemyLevel;
	setItemsInHtml(items, oneTimers, currentLevel, maxLevel);
	calcBuildCost();
}

function dustWithUpgrade(name, speed) {
	AB.items[name].level += 1;
	runSimulation(speed);
	AB.items[name].level -= 1;
	return AB.getDustPs();
}

function runSimulation(speed = 100000) {
	AB.speed = speed;
	AB.resetCombat();
	AB.resetStats();

	startTime = Date.now();
	AB.update();
}

function maxLuck() {
	setActiveItems();
	setActiveOneTimers();
	setLevels();
	let whoDied = AB.oneFight();
	let span = document.getElementById("theoreticalWinSpan");
	if (span) {
		span.innerHTML = "You can theoretically win: " + !whoDied.isTrimp;
	} else {
		let parent = document.getElementById("theoreticalWin").parentElement;
		let span = document.createElement("span");
		span.id = "theoreticalWinSpan";
		span.innerHTML = "You can theoretically win: " + !whoDied.isTrimp;
		parent.appendChild(span);
	}
}