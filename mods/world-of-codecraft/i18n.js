// World of Codecraft: French and English, picked automatically.
// The language is detected once per start from the system (WOCC_LANG if set, else macOS
// AppleLanguages, else LC_ALL / LC_MESSAGES / LANG): French when it starts with "fr", English
// otherwise. It is shared with every copy of the mod (shared "wocc.lang"), so the header, the board,
// the pane headers and the village all speak the same language. Force it with WOCC_LANG=fr|en in the
// environment Herdr starts from, or with "lang": "fr" | "en" in a block's props.

import { exec, shared, setShared, props } from "herdr";

const KEY = "wocc.lang";
let asked = false;

/** "fr" or "en". */
export function lang() {
  const p = props()?.lang;
  if (p === "fr" || p === "en") return p;
  return shared(KEY) === "fr" ? "fr" : "en";
}

/** Detects the system language once per start (call it from init). */
export function detectLang(cx) {
  if (asked) return;
  asked = true;
  cx.spawn(async () => {
    try {
      const r = await exec("sh", ["-c",
        'if [ -n "$WOCC_LANG" ]; then echo "$WOCC_LANG"; exit; fi; ' +
        '(defaults read -g AppleLanguages 2>/dev/null | sed -n 2p | tr -d " \\"(),"); ' +
        'echo "${LC_ALL:-${LC_MESSAGES:-$LANG}}"']);
      const first = (r.stdout ?? "").split("\n").map((s) => s.trim()).find(Boolean) ?? "";
      const l = /^fr/i.test(first) ? "fr" : "en";
      if (shared(KEY) !== l) setShared(KEY, l);
    } catch {}
  });
}

/** Every visible string, by key. A function takes the values it needs. */
const S = {
  en: {
    village: "Valbrume",
    villageOf: (v) => `village of ${v}`,
    pct: (n) => `${n}%`,
    // races and classes
    race: { elfe: "Elf", orque: "Orc", humain: "Human", "mort-vivant": "Undead", nain: "Dwarf" },
    cls: { mage: "mage", artificier: "artificer", guerrier: "warrior", pretre: "priest", rodeur: "ranger", voleur: "rogue" },
    hero: (race, cls) => `${race} ${cls}`,
    // states
    quest: {
      working: { mot: "On a quest", fr: "sets out on a quest" },
      blocked: { mot: "Help needed!", fr: "needs help" },
      done: { mot: "Quest to turn in", fr: "has finished the quest" },
      idle: { mot: "Idle", fr: "wanders the village" },
    },
    board: { blocked: "need help", done: "to turn in", working: "on a quest", idle: "resting" },
    hours: ["Matins", "Lauds", "Terce", "Sext", "None", "Vespers", "Compline"],
    days: "d",
    home: "Home",
    district: (n, name) => `District ${n} · ${name}`,
    // header
    accountNone: (label, acc) => `${label}: no reading for Claude account ${acc}`,
    account: (acc) => `account ${acc}`,
    five: (p) => `5h: ${p}%`,
    quotaTip: (label, acc, rem, fair, five, fiveLeft, stale) =>
      `${label} = Claude account ${acc}\n${rem}% left this week (fair in ${fair})${five != null ? `\n5-hour window: ${five}% left${fiveLeft ? ` (${fiveLeft})` : ""}` : ""}${stale ? "\nReading older than 30 min" : ""}`,
    gold: "Gold", wood: "Wood",
    waitingMany: (n, blocked) => `${n} ${blocked ? "waiting" : "quests to turn in"}`,
    waitingOne: (name, blocked) => `${name} ${blocked ? "is waiting" : "is done"}`,
    waitingTip: (title, blocked) => `${title} ${blocked ? "awaits your orders" : "is back from a quest"} (click: go there)`,
    questTab: (name) => `Quest: ${name}`,
    ctx: (n) => `ctx ${n}%`,
    context: "ctx",
    contextTip: (n, model) => `Selected hero's context window: ${n}% used${model ? ` (${model})` : ""}\nFrom the Claude status line`,
    statTip: "Model and context window used (from the Claude status line)",
    hourTip: (hour, night) => `${hour} (canonical hour) · ${night ? "night" : "day"}`,
    heroesAtWork: "heroes at work",
    heroesTip: (busy, all) => `${busy} heroes at work, ${all} agents in the village`,
    untilFair: "until the fair",
    fairTip: "The fair: the weekly reset of the Claude quotas",
    immersion: "Immersion", workshop: "Workshop",
    immersionTip: "Immersive mode: the village fills the window, the terminal goes below (ctrl-shift-i)",
    workshopTip: "Back to the workshop: the terminal fills the window, the village goes below (ctrl-shift-i)",
    // board
    questN: (n) => `Quest #${n}`,
    questTip: (n, name, panes) => `Quest ${n}: ${name}${panes > 1 ? ` (${panes} sessions)` : ""} (click: show it)`,
    goThere: "(click: go there)",
    sessions: (n) => `${n} ${n === 1 ? "session" : "sessions"}`,
    heroes: (n) => `${n} ${n === 1 ? "hero" : "heroes"}`,
    sessionsHere: (s) => `${s} in this district`,
    districts: "Districts",
    newQuest: "Quest", newQuestTip: "Start a new quest (a new tab in this district)",
    newDistrict: "District", newDistrictTip: "Found a new district (a new space)",
    // command panel
    map: (v) => `Map of ${v}`,
    maps: { valbrume: "Valbrume", port: "Port Salin" },
    mapPrevTip: "Previous map", mapNextTip: "Next map",
    looks: { ete: "Summer", hiver: "Winter" },
    lookPrevTip: "Previous season", lookNextTip: "Next season",
    selected: "Selected unit",
    noUnit: "No unit selected",
    clickHero: "Click a hero in the village",
    onGuard: "On guard",
    go: "Go", goTip: "Go to this hero",
    next: "Next", nextTip: "Next hero",
    reroll: "Race", rerollTip: "Give this hero another race at random (its class stays)",
    // pane header
    scroll: "Scroll",
    splitR: "Split right", splitD: "Split down", zoom: "Zoom", close: "Close",
    // places
    building: { grange: "Barn and fields", tour: "Mage Tower", atelier: "Forge Workshop", hotel: "Town Hall", taverne: "Tavern", temple: "Temple of Dawn", caserne: "Barracks", phare: "Lighthouse" },
    market: "Market",
    villageTag: "Village",
    gate: "Gate",
    crier: "Town Crier",
    recruit: { tour: "a Claude hero (mage or artificer)", atelier: "a Claude hero (mage or artificer)", caserne: "a warrior (terminal)" },
    recruitTip: (name, what) => `${name}\nDouble-click: recruit ${what}`,
    mapTip: "Village map (click: move the view there)",
    // chronicle
    arrives: (title, prog) => `${title} (${prog}) arrives in the village`,
    leaves: (title) => `${title} leaves Valbrume`,
    hearYe: (n, b) => `Hear ye! ${n} ${n === 1 ? "hero" : "heroes"} in the village${b ? `, ${b} awaiting your orders` : ""}`,
    quoted: (s) => ` "${s}"`,
    unitTip: (title, prog, where, word) => `${title} · ${prog}\n${where}\n${word} (click: go there)`,
    onGuardTerm: "On guard (terminal)",
    help: ["Help!", "Help!", "Orders?", "Over here!"],
    demoTabs: ["PR review", "tests", "migration", "docs", "rest", "map", "triage", "build", "refactor", "fix"],
    // scenes
    ouch: "Ouch!", sealed: "Sealed!", sent: "Message sent!", testsOk: "Tests passed!", testsKo: "Tests failing",
    // the daily raid boss (the epithets, per species, in the same order in both languages; tier 0, Elite, Legendary)
    bossName: (name, ep, tier) => `${tier ? `${["", "Elite", "Legendary"][tier]} ` : ""}${name} ${ep}`,
    epithets: {
      troll: ["the Mossback", "the Bridge-Breaker", "the Bog-Born", "the Gnarled", "the Unwashed", "the Stonehide", "the Hungry", "the Rootgnawer"],
      golem: ["the Rusted", "the Iron-Hearted", "the Clanking", "the Unbroken", "the Forge-Born", "the Ironclad", "the Grinding", "the Boltheart"],
      spectre: ["the Pale", "the Wailing", "the Restless", "the Hollow", "the Grave-Cold", "the Mist-Walker", "the Forsaken", "the Whisperer"],
      gobelin: ["the Sneaky", "the Sticky-Fingered", "the Loud", "the Greedy", "the Bitey", "the Trap-Maker", "the Coin-Pincher", "the Rotten-Toothed"],
    },
    tiers: ["", "Elite", "Legendary"],
    tierTip: (tier, n) => `${["", "Elite", "Legendary"][tier]}: your ${n}-day streak is at stake`,
    hp: (hp, max) => `${hp}/${max}`,
    slain: "Slain!",
    bossTip: (name, hp, max, reset) => `Today's raid boss: ${name}\nHP ${hp}/${max} (each subagent tool call deals 1)\nNew boss in ${reset}`,
    bossSlainTip: (name, by, reset) => `${name} was slain${by ? ` by ${by}` : ""}\nNo more raids today: new boss in ${reset}`,
    bossSlain: (name, by) => `${name} is slain by ${by}!`,
    slainN: (n) => `${n} slain`,
    streak: (n) => `streak ${n} ${n === 1 ? "day" : "days"}`,
    trophyTip: (total, streak) => `Raid bosses slain: ${total}\nDaily streak: ${streak} ${streak === 1 ? "day" : "days"} (consecutive days with a kill)`,
    resetTip: "Click: reset today's boss to full HP",
    resetBoss: "Reset boss?", yes: "Yes", no: "No",
    // village life
    treasury: (p, v) => `${v} treasury: ${p}% of account A left this week`,
    fair: (t) => `The fair: reset in ${t}`,
  },
  fr: {
    village: "Valbrume",
    villageOf: (v) => `village de ${v}`,
    pct: (n) => `${n} %`,
    race: { elfe: "elfe", orque: "orque", humain: "humain", "mort-vivant": "mort-vivant", nain: "nain" },
    cls: { mage: "mage", artificier: "artificier", guerrier: "soldat", pretre: "prêtre", rodeur: "rôdeur", voleur: "voleur" },
    hero: (race, cls) => `${cls} ${race}`,
    quest: {
      working: { mot: "En quête", fr: "part en quête" },
      blocked: { mot: "Aide requise !", fr: "a besoin d'aide" },
      done: { mot: "Quête à rendre", fr: "a terminé sa quête" },
      idle: { mot: "Au repos", fr: "flâne dans le village" },
    },
    board: { blocked: "aide", done: "à rendre", working: "en quête", idle: "repos" },
    hours: ["Matines", "Laudes", "Tierce", "Sexte", "Nones", "Vêpres", "Complies"],
    days: "j",
    home: "Logis",
    district: (n, name) => `Quartier ${n} · ${name}`,
    accountNone: (label, acc) => `${label} : pas de relevé du compte Claude ${acc}`,
    account: (acc) => `compte ${acc}`,
    five: (p) => `5 h : ${p} %`,
    quotaTip: (label, acc, rem, fair, five, fiveLeft, stale) =>
      `${label} = compte Claude ${acc}\nIl reste ${rem} % cette semaine (foire dans ${fair})${five != null ? `\nFenêtre 5 h : ${five} % restants${fiveLeft ? ` (${fiveLeft})` : ""}` : ""}${stale ? "\nRelevé de plus de 30 min" : ""}`,
    gold: "Or", wood: "Bois",
    waitingMany: (n, blocked) => `${n} ${blocked ? "attendent" : "quêtes à rendre"}`,
    waitingOne: (name, blocked) => `${name} ${blocked ? "attend" : "a fini"}`,
    waitingTip: (title, blocked) => `${title} ${blocked ? "attend tes ordres" : "revient de quête"} — clic : y aller`,
    questTab: (name) => `Quête : ${name}`,
    ctx: (n) => `ctx ${n} %`,
    context: "ctx",
    contextTip: (n, model) => `Contexte du héros choisi : ${n} % utilisés${model ? ` (${model})` : ""}\nD'après la ligne d'état de Claude`,
    statTip: "Modèle et contexte utilisé (d'après la ligne d'état de Claude)",
    hourTip: (hour, night) => `${hour} (heure canoniale) · ${night ? "nuit" : "jour"}`,
    heroesAtWork: "héros à l'œuvre",
    heroesTip: (busy, all) => `${busy} héros travaillent, ${all} agents au village`,
    untilFair: "avant la foire",
    fairTip: "La foire : réinitialisation hebdomadaire des quotas Claude",
    immersion: "Immersion", workshop: "Atelier",
    immersionTip: "Mode immersif : le village occupe la fenêtre, le terminal passe en bas (ctrl-shift-i)",
    workshopTip: "Retour à l'atelier : le terminal occupe la fenêtre, le village passe en bas (ctrl-shift-i)",
    questN: (n) => `Quête n° ${n}`,
    questTip: (n, name, panes) => `Quête ${n} : ${name}${panes > 1 ? ` (${panes} sessions)` : ""} — clic : l'afficher`,
    goThere: "— clic : y aller",
    sessions: (n) => `${n} ${n === 1 ? "session" : "sessions"}`,
    heroes: (n) => `${n} héros`,
    sessionsHere: (s) => `${s} dans ce quartier`,
    districts: "Quartiers",
    newQuest: "Quête", newQuestTip: "Afficher une nouvelle quête (nouvel onglet dans ce quartier)",
    newDistrict: "Quartier", newDistrictTip: "Fonder un nouveau quartier (nouvel espace)",
    map: (v) => `Carte de ${v}`,
    maps: { valbrume: "Valbrume", port: "Port-Salin" },
    mapPrevTip: "Carte précédente", mapNextTip: "Carte suivante",
    looks: { ete: "Été", hiver: "Hiver" },
    lookPrevTip: "Saison précédente", lookNextTip: "Saison suivante",
    selected: "Unité choisie",
    noUnit: "Aucune unité choisie",
    clickHero: "Clic sur un héros du village",
    onGuard: "De garde",
    go: "Aller", goTip: "Aller à ce héros",
    next: "Suivant", nextTip: "Héros suivant",
    reroll: "Race", rerollTip: "Donner une autre race au hasard à ce héros (sa classe reste)",
    scroll: "Parchemin",
    splitR: "Fendre à droite", splitD: "Fendre en bas", zoom: "Agrandir", close: "Fermer",
    building: { grange: "Grange et champs", tour: "Tour des mages", atelier: "Atelier-forge", hotel: "Hôtel de ville", taverne: "Taverne", temple: "Temple de l'Aube", caserne: "Caserne", phare: "Phare" },
    market: "Marché",
    villageTag: "Village",
    gate: "Porte",
    crier: "Crieur",
    recruit: { tour: "un héros Claude (mage ou artificier)", atelier: "un héros Claude (mage ou artificier)", caserne: "un soldat (terminal)" },
    recruitTip: (name, what) => `${name}\nDouble-clic : recruter ${what}`,
    mapTip: "Carte du village — clic : y déplacer la vue",
    arrives: (title, prog) => `${title} (${prog}) arrive au village`,
    leaves: (title) => `${title} quitte Valbrume`,
    hearYe: (n, b) => `Oyez ! ${n} héros au village${b ? `, ${b} attendent tes ordres` : ""}`,
    quoted: (s) => ` « ${s} »`,
    unitTip: (title, prog, where, word) => `${title} · ${prog}\n${where}\n${word} — clic : y aller`,
    onGuardTerm: "De garde (terminal)",
    help: ["À l'aide !", "À l'aide !", "Tes ordres ?", "Par ici !"],
    demoTabs: ["revue PR", "tests", "migration", "doc", "repos", "carte", "tri", "build", "refonte", "correctif"],
    ouch: "Aïe !", sealed: "Scellé !", sent: "Message envoyé !", testsOk: "Tests réussis !", testsKo: "Tests en échec",
    bossName: (name, ep, tier) => `${name} ${ep}${tier ? ` (${["", "élite", "légendaire"][tier]})` : ""}`,
    epithets: {
      troll: ["le Moussu", "le Brise-Pont", "le Né-des-Marais", "le Noueux", "le Crasseux", "Peau-de-Pierre", "l'Affamé", "le Ronge-Racines"],
      golem: ["le Rouillé", "Cœur-de-Fer", "le Cliquetant", "l'Inébranlable", "le Né-de-la-Forge", "le Bardé", "le Grinçant", "Cœur-de-Boulon"],
      spectre: ["le Blême", "le Gémissant", "l'Errant", "le Creux", "Froid-de-Tombe", "Marche-Brume", "le Maudit", "le Murmurant"],
      gobelin: ["le Sournois", "Doigts-Collants", "le Braillard", "le Rapace", "le Mordeur", "Pose-Pièges", "Pince-Écus", "Dent-Pourrie"],
    },
    tiers: ["", "Élite", "Légendaire"],
    tierTip: (tier, n) => `${["", "Élite", "Légendaire"][tier]} : ta série de ${n} jours est en jeu`,
    hp: (hp, max) => `${hp}/${max}`,
    slain: "Terrassé !",
    bossTip: (name, hp, max, reset) => `Boss de raid du jour : ${name}\nPV ${hp}/${max} (chaque outil d'un sous-agent en ôte 1)\nNouveau boss dans ${reset}`,
    bossSlainTip: (name, by, reset) => `${name} a été terrassé${by ? ` par ${by}` : ""}\nPlus de raid aujourd'hui : nouveau boss dans ${reset}`,
    bossSlain: (name, by) => `${name} est terrassé par ${by} !`,
    slainN: (n) => `${n} vaincu${n > 1 ? "s" : ""}`,
    streak: (n) => `série ${n} j`,
    trophyTip: (total, streak) => `Boss de raid terrassés : ${total}\nSérie : ${streak} jour${streak > 1 ? "s" : ""} d'affilée avec une victoire`,
    resetTip: "Clic : rendre au boss du jour tous ses PV",
    resetBoss: "Relancer le boss ?", yes: "Oui", no: "Non",
    treasury: (p, v) => `Trésor de ${v} : ${p} % du compte A cette semaine`,
    fair: (t) => `La foire : réinitialisation dans ${t}`,
  },
};

/** The string (or the function's result) for a key in the current language. */
export function t(key, ...args) {
  const v = S[lang()][key] ?? S.en[key];
  return typeof v === "function" ? v(...args) : v;
}

/** A live view of a table (race, cls, quest, board, building, recruit): `tbl("race").elfe`. */
export const tbl = (key) => new Proxy({}, { get: (_o, k) => (S[lang()][key] ?? S.en[key])?.[k] });
