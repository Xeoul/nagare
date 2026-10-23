// One-time data-prep script: slims OpenJLPT's per-level JSON (words, kanji and
// grammar points with example sentences) into one small file per level,
// public/jlpt/n5.json … n1.json, which the Study page and the quiz load on
// demand. Not run at app build/runtime.
//
// Usage: node scripts/build-jlpt-study-data.mjs /path/to/OpenJLPT/data/json
//
// Source: https://github.com/evanclan/OpenJLPT (CC BY-SA 4.0), built from
// Jonathan Waller's JLPT lists (CC BY), JMdict and KANJIDIC2 (EDRDG, CC BY-SA
// 4.0) and Tatoeba (CC BY 2.0 FR). See NOTICE.md.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("Usage: node scripts/build-jlpt-study-data.mjs /path/to/OpenJLPT/data/json");
  process.exit(1);
}

const read = (kind, level) => JSON.parse(readFileSync(path.join(srcDir, kind, `${level}.json`), "utf8"));
const outDir = path.join(import.meta.dirname, "..", "public", "jlpt");
mkdirSync(outDir, { recursive: true });

// Fixes to the upstream text, found when proofreading every grammar entry.
// Keys are "<level>/<grammar id>"; the fields replace the upstream ones.
const CORRECTIONS = {
  "n5/zenzen-nai": {
    notes:
      "Stronger than あまり〜ない. In casual speech 全然 is sometimes used with positive words (全然大丈夫), but pairing it with a negative is the standard use.",
  },
  "n5/ga-suki-ga-kirai": {
    notes:
      "好き and 嫌い are な-adjectives, but the thing liked or disliked still takes が, not を. 大好き and 大嫌い are stronger. 嫌い can sound blunt; あまり好きじゃない is softer.",
  },
  "n4/chuu-juu": {
    notes:
      "ちゅう marks an ongoing activity or a period (会議中, 午前中, 勉強中); じゅう means 'throughout' a time or place (一日中, 世界中). Some words, such as 今週中, are read both ways: じゅう ('by the end of this week') is the usual reading.",
  },
};

// Meanings to use instead of the upstream ones. OpenJLPT matched some words to
// the wrong dictionary entry (せっけん became "economy", ダム "dumb", ソース
// "source") or listed an uncommon sense first. Found by checking every word
// against JMdict; keyed by level, then written form.
const MEANING_FIXES = {
  n5: {
    "せっけん": ["soap"],
    "ごちそうさま": ["thank you for the meal","feast"],
    "かける": ["to hang","to make (a phone call)","to put on (glasses)"],
    "少し": ["a little","a few"],
    "少ない": ["few","little (in amount)"],
    "涼しい": ["cool","refreshing"],
    "先": ["ahead","previous","the future"],
    "暗い": ["dark","gloomy"],
    "厚い": ["thick","deep","kind"],
    "上げる": ["to raise","to give"],
    "出る": ["to leave","to go out","to appear"],
    "早い": ["early","fast"],
    "低い": ["low","short"],
    "休む": ["to rest","to take a day off","to be absent"],
    "強い": ["strong","powerful"],
    "ちょっと": ["a little","just a moment"],
    "つける": ["to turn on","to attach"],
    "元気": ["healthy","energetic"],
    "ポスト": ["postbox","post; position"],
    "文章": ["text","writing","sentence"],
    "好き": ["liking","fond of"],
    "嫌い": ["disliking","hate"],
    "困る": ["to be troubled","to be at a loss"],
    "分かる": ["to understand","to be understood"],
    "そちら": ["that way (near you)","there"],
    "そっち": ["that way (near you)","there"],
    "半分": ["half"],
    "太い": ["thick","fat"],
    "大好き": ["very fond of","to love"],
    "たいへん": ["very","serious","hard"],
    "速い": ["fast","quick"],
    "道": ["road","path","way"],
    "違う": ["to differ","to be wrong"],
  },
  n4: {
    "ガス": ["gas"],
    "家内": ["(my) wife"],
    "君": ["you (informal, used by men to peers or juniors)"],
    "うち": ["inside; within","one's house; home"],
    "受付": ["reception (desk)","receipt; acceptance"],
    "うまい": ["skillful","delicious"],
    "技術": ["technology","skill; technique"],
    "急": ["sudden","urgent","steep"],
    "急行": ["express (train)","hurrying"],
    "経済": ["economy","finance"],
    "心": ["heart","mind; spirit"],
    "最近": ["recently","nowadays"],
    "盛ん": ["thriving","popular","enthusiastic"],
    "残念": ["regrettable","disappointing"],
    "しかる": ["to scold"],
    "習慣": ["habit","custom"],
    "親切": ["kind","considerate"],
    "過ぎる": ["to pass (by/through)","to exceed","to be too much"],
    "生活": ["life","living"],
    "そう": ["so","like that"],
    "倒れる": ["to fall down","to collapse","to break down"],
    "続く": ["to continue","to go on"],
    "連れる": ["to take (someone) along","to bring along"],
    "適当": ["suitable","appropriate","sloppy"],
    "届ける": ["to deliver","to report"],
    "ねっしん": ["enthusiastic","zealous"],
    "複雑": ["complicated","complex"],
    "無理": ["unreasonable","impossible"],
    "もっとも": ["quite right; reasonable","however; that said"],
    "用": ["business; errand","use"],
    "どんどん": ["rapidly","more and more"],
    "支度": ["preparation","to prepare"],
  },
  n3: {
    "課": ["lesson","section; department"],
    "帯": ["obi (kimono sash)","belt; band"],
    "グランド": ["(sports) ground; field"],
    "ダイヤ": ["diamond","(train) schedule"],
    "少女": ["girl","young lady"],
    "少年": ["boy"],
    "命": ["life"],
    "撃つ": ["to shoot","to fire"],
    "円": ["yen","circle"],
    "収める": ["to put away","to pay (a fee)","to achieve"],
    "追い付く": ["to catch up (with)","to reach"],
    "加減": ["degree; extent","condition (of health)","adjustment"],
    "活用": ["practical use","conjugation"],
    "機関": ["agency; organization","engine"],
    "決まり": ["rule","settlement; conclusion"],
    "教授": ["professor","teaching"],
    "共通": ["common","shared"],
    "恐怖": ["fear","dread"],
    "臭い": ["smelly","stinking","suspicious"],
    "下す": ["to make (a decision)","to hand down (a ruling)","to lower"],
    "詳しい": ["detailed","knowledgeable"],
    "景気": ["business conditions","economic climate"],
    "刑事": ["(police) detective"],
    "見当": ["estimate","guess","aim"],
    "語": ["word","language"],
    "高価": ["expensive","valuable"],
    "強盗": ["robber","robbery"],
    "候補": ["candidate","candidacy"],
    "克服": ["overcoming (a difficulty)","conquest"],
    "支える": ["to support","to prop up"],
    "時刻": ["time (of day)","the hour"],
    "次第": ["depending on","as soon as","circumstances"],
    "実際": ["reality","actual situation"],
    "住宅": ["housing","residence"],
    "出身": ["one's origin (hometown, school)"],
    "食品": ["food product","foodstuff"],
    "審判": ["referee; umpire","judgment"],
    "ずっと": ["all along; the whole time","much (more)"],
    "済ませる": ["to finish","to get done"],
    "相当": ["considerable","equivalent","suitable"],
    "どうか": ["please","somehow"],
    "陸": ["land"],
    "飯": ["meal","cooked rice"],
    "熱中": ["being absorbed in","enthusiasm"],
    "能": ["talent; ability","noh (theatre)"],
    "パス": ["pass (in games, exams)","(commuter) pass"],
    "たとえ": ["even if","simile; metaphor"],
    "束": ["bundle","bunch"],
    "共に": ["together","both"],
    "ロケット": ["rocket"],
    "博士": ["doctor (PhD)","expert"],
    "生": ["raw","fresh","draft (beer)"],
    "吐く": ["to vomit","to breathe out"],
    "必死": ["desperate","frantic"],
    "節": ["joint; knot","tune"],
    "平均": ["average","balance"],
    "ぼんやり": ["vaguely","absent-mindedly"],
    "マスター": ["owner (of a bar)","to master"],
    "まあ": ["well","fairly; just"],
    "まるで": ["just like; as if","(not) at all"],
    "夢中": ["absorbed in","crazy about"],
    "陽気": ["cheerful","weather; season"],
    "内容": ["contents","substance"],
  },
  n2: {
    "火口": ["(volcanic) crater","burner"],
    "高層": ["high-rise","upper (atmosphere)"],
    "ようやく": ["finally","at last","barely"],
    "やっぱり": ["as expected","after all"],
    "力強い": ["powerful","reassuring"],
    "発想": ["idea","way of thinking"],
    "標本": ["specimen","sample"],
    "歯磨き": ["toothbrushing","toothpaste"],
    "給与": ["pay; salary","allowance"],
    "書留": ["registered mail","recording"],
    "一応": ["for now; tentatively","more or less"],
    "納める": ["to pay","to put away","to deliver"],
    "固い": ["hard","firm","stiff"],
    "架空": ["fictitious","imaginary"],
    "交流": ["exchange (cultural)","interaction","alternating current"],
    "ずらす": ["to shift","to move"],
    "ふざける": ["to joke around","to mess about"],
    "予備": ["reserve","spare"],
    "よる": ["to be due to","to depend on"],
    "工夫": ["ingenuity; device","idea"],
    "ダム": ["dam"],
    "チョーク": ["chalk"],
    "せめて": ["at least"],
    "統計": ["statistics"],
    "努める": ["to endeavor","to try hard"],
    "学級": ["(school) class"],
    "流石": ["as expected","still; even so"],
    "恋しい": ["missed; longed for","dear"],
    "人文科学": ["humanities"],
    "乾燥": ["dryness; drying","dry"],
    "引き返す": ["to turn back","to return"],
    "平気": ["calm; unconcerned","fine; all right"],
    "隔てる": ["to separate","to be apart"],
    "放る": ["to throw","to leave alone"],
    "交ぜる": ["to mix","to blend"],
    "真っ暗": ["pitch dark","utterly hopeless"],
    "ランチ": ["lunch"],
    "湧く": ["to well up","to gush out","to arise"],
    "揚げる": ["to deep-fry","to raise; to hoist"],
    "作成": ["drawing up; preparing","making (a document)"],
    "カラー": ["color","collar"],
    "物凄い": ["terrific","tremendous","frightful"],
    "ついで": ["opportunity (while doing something)","next; subsequently"],
  },
  n1: {
    "気品": ["elegance; refinement","aroma"],
    "来る": ["next (e.g. next April)","to come; to arrive"],
    "外貨": ["foreign currency","imported goods"],
    "首輪": ["(animal) collar","necklace"],
    "緩やか": ["gentle","loose"],
    "無茶苦茶": ["absurd; unreasonable","messy"],
    "会": ["gathering; meeting"],
    "時刻表": ["timetable","schedule"],
    "取材": ["news gathering; coverage","collecting material"],
    "出動": ["being dispatched; mobilization","going into action"],
    "出社": ["going to work","coming to the office"],
    "警戒": ["vigilance","caution"],
    "刑罰": ["punishment","penalty"],
    "強制": ["coercion","compulsion"],
    "仕組み": ["structure; mechanism","plan; plot"],
    "心掛け": ["attitude; care","mindfulness"],
    "上がり": ["rise; increase","income; takings","(having) finished"],
    "圧力": ["pressure"],
    "あられ": ["hail","small cubes; rice crackers"],
    "いい加減": ["irresponsible; sloppy","moderate"],
    "浮気": ["affair; infidelity","fickle"],
    "おごる": ["to treat (someone)","to be extravagant; to be proud"],
    "収まる": ["to fit (into)","to settle down; to subside"],
    "納まる": ["to fit (into)","to settle down; to subside"],
    "改定": ["revision","alteration"],
    "確定": ["decision; confirmation","settlement"],
    "兼ねて": ["previously","for some time"],
    "カンニング": ["cheating (on an exam)"],
    "控除": ["deduction"],
    "心情": ["feelings; sentiment"],
    "ソース": ["sauce"],
    "ハンガー": ["(coat) hanger"],
    "フォーム": ["form","(sports) form"],
    "ポーズ": ["pose","pretence"],
    "弁償": ["compensation; reparation"],
    "出直し": ["starting over; making a fresh start","visiting again"],
    "熱量": ["quantity of heat; calories","enthusiasm"],
    "倍率": ["magnification","competition ratio"],
    "発芽": ["germination; sprouting"],
    "発病": ["onset of an illness; falling ill"],
    "番目": ["-th (ordinal suffix)"],
    "無難": ["safe; inoffensive","acceptable"],
    "閉口": ["to be at a loss","to be fed up"],
    "補強": ["reinforcement","strengthening"],
    "本格": ["genuine; full-fledged","original method"],
    "民俗": ["folk customs; folklore"],
    "手掛かり": ["clue; lead","handhold"],
    "前提": ["premise; prerequisite","assumption"],
    "対応": ["response; coping","correspondence"],
    "対話": ["dialogue","conversation"],
    "反発": ["opposition; resistance","rebound; repulsion"],
  },
};
// Readings the upstream data got wrong.
const READING_FIXES = { "n1/中腹": "ちゅうふく" };
// Kanji meanings KANJIDIC lists in the wrong order for a learner (校 starts with "exam").
const KANJI_MEANING_FIXES = {
  校: ["school", "exam", "printing", "proof; correction"],
  無: ["nothing", "none", "not"],
  生: ["life", "birth", "raw", "genuine"],
};
// KANJIDIC also lists the Kangxi radical number as a meaning ("one radical (no.1)").
const isRadicalNote = (meaning) => /radical/i.test(meaning);

for (const level of ["n5", "n4", "n3", "n2", "n1"]) {
  const vocab = read("vocab", level).map((e) => ({
    w: e.word,
    r: READING_FIXES[`${level}/${e.word}`] ?? e.reading,
    m: MEANING_FIXES[level][e.word] ?? e.meanings.slice(0, 3),
    p: (e.pos ?? [])[0],
    // Readings over the kanji only for the first example, to keep the files small.
    e: (e.examples ?? []).slice(0, 2).map((x, i) => ({ j: x.ja, en: x.en, ...(i === 0 && x.furigana ? { f: x.furigana } : {}) })),
  }));
  const kanji = read("kanji", level).map((k) => ({
    c: k.character,
    s: k.strokes,
    on: k.onyomi,
    kun: k.kunyomi,
    m: KANJI_MEANING_FIXES[k.character] ?? k.meanings.filter((m) => !isRadicalNote(m)).slice(0, 5),
    w: (k.words ?? []).slice(0, 6),
  }));
  const grammar = read("grammar", level).map((g) => ({ ...g, ...CORRECTIONS[`${level}/${g.id}`] })).map((g) => ({
    id: g.id,
    p: g.pattern,
    m: g.meaning,
    f: g.formation,
    t: g.tags ?? [],
    n: g.notes ?? "",
    e: (g.examples ?? []).map((x) => ({ j: x.ja, f: x.furigana, en: x.en })),
  }));
  const file = path.join(outDir, `${level}.json`);
  writeFileSync(file, JSON.stringify({ level: level.toUpperCase(), vocab, kanji, grammar }));
  console.log(`${level}: ${vocab.length} words, ${kanji.length} kanji, ${grammar.length} grammar -> ${file}`);
}
