// Quick-reference tables for the Study page's Reference tab: kana, numbers,
// counters, dates and time, particles, conjugation and keigo. Written for
// Nagare. A cell like "か|ka" shows the kana with its romaji underneath.

export type ReferenceSection = {
  id: string;
  title: string;
  intro?: string;
  head?: string[];
  rows: string[][];
  note?: string;
};

const toKatakana = (text: string) =>
  text.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));

/** Turns a hiragana chart into the matching katakana chart. */
const katakana = (rows: string[][]): string[][] =>
  rows.map((row) => row.map((cell) => (cell.includes("|") ? toKatakana(cell.split("|")[0]) + "|" + cell.split("|")[1] : cell)));

const KANA_HEAD = ["", "a", "i", "u", "e", "o"];
const BASIC: string[][] = [
  ["", "あ|a", "い|i", "う|u", "え|e", "お|o"],
  ["k", "か|ka", "き|ki", "く|ku", "け|ke", "こ|ko"],
  ["s", "さ|sa", "し|shi", "す|su", "せ|se", "そ|so"],
  ["t", "た|ta", "ち|chi", "つ|tsu", "て|te", "と|to"],
  ["n", "な|na", "に|ni", "ぬ|nu", "ね|ne", "の|no"],
  ["h", "は|ha", "ひ|hi", "ふ|fu", "へ|he", "ほ|ho"],
  ["m", "ま|ma", "み|mi", "む|mu", "め|me", "も|mo"],
  ["y", "や|ya", "", "ゆ|yu", "", "よ|yo"],
  ["r", "ら|ra", "り|ri", "る|ru", "れ|re", "ろ|ro"],
  ["w", "わ|wa", "", "", "", "を|wo"],
  ["", "ん|n", "", "", "", ""],
];
const VOICED: string[][] = [
  ["g", "が|ga", "ぎ|gi", "ぐ|gu", "げ|ge", "ご|go"],
  ["z", "ざ|za", "じ|ji", "ず|zu", "ぜ|ze", "ぞ|zo"],
  ["d", "だ|da", "ぢ|ji", "づ|zu", "で|de", "ど|do"],
  ["b", "ば|ba", "び|bi", "ぶ|bu", "べ|be", "ぼ|bo"],
  ["p", "ぱ|pa", "ぴ|pi", "ぷ|pu", "ぺ|pe", "ぽ|po"],
];
const COMBINED: string[][] = [
  ["k", "きゃ|kya", "きゅ|kyu", "きょ|kyo"],
  ["s", "しゃ|sha", "しゅ|shu", "しょ|sho"],
  ["ch", "ちゃ|cha", "ちゅ|chu", "ちょ|cho"],
  ["n", "にゃ|nya", "にゅ|nyu", "にょ|nyo"],
  ["h", "ひゃ|hya", "ひゅ|hyu", "ひょ|hyo"],
  ["m", "みゃ|mya", "みゅ|myu", "みょ|myo"],
  ["r", "りゃ|rya", "りゅ|ryu", "りょ|ryo"],
  ["g", "ぎゃ|gya", "ぎゅ|gyu", "ぎょ|gyo"],
  ["j", "じゃ|ja", "じゅ|ju", "じょ|jo"],
  ["b", "びゃ|bya", "びゅ|byu", "びょ|byo"],
  ["p", "ぴゃ|pya", "ぴゅ|pyu", "ぴょ|pyo"],
];
const COMBINED_HEAD = ["", "ya", "yu", "yo"];

export const REFERENCE: ReferenceSection[] = [
  { id: "hiragana", title: "Hiragana", intro: "Tap a character to hear it.", head: KANA_HEAD, rows: BASIC,
    note: "Small っ doubles the next consonant (きっぷ kippu). ん is a syllable on its own." },
  { id: "hiragana-voiced", title: "Hiragana: voiced sounds", head: KANA_HEAD, rows: VOICED,
    note: "Two dots (゛) voice a sound, a circle (゜) makes h into p. じ and ぢ, ず and づ sound the same; じ and ず are the ones you'll normally see." },
  { id: "hiragana-combined", title: "Hiragana: combined sounds", head: COMBINED_HEAD, rows: COMBINED,
    note: "A small ゃ ゅ ょ after an い-column character blends into one syllable: きゃ is “kya”, not “ki-ya”." },
  { id: "katakana", title: "Katakana", intro: "Used for foreign words, names, sounds and emphasis.", head: KANA_HEAD, rows: katakana(BASIC),
    note: "ー lengthens the previous vowel: コーヒー (kōhī), ラーメン (rāmen)." },
  { id: "katakana-voiced", title: "Katakana: voiced sounds", head: KANA_HEAD, rows: katakana(VOICED) },
  { id: "katakana-combined", title: "Katakana: combined sounds", head: COMBINED_HEAD, rows: katakana(COMBINED),
    note: "Loan-word sounds add extras like ティ (ti), ファ (fa), ウィ (wi), ヴ (vu) and ジェ (je)." },

  { id: "numbers", title: "Numbers", head: ["Number", "Kanji", "Reading"], rows: [
    ["0", "零 / 〇", "れい, ゼロ"], ["1", "一", "いち"], ["2", "二", "に"], ["3", "三", "さん"], ["4", "四", "よん, し"],
    ["5", "五", "ご"], ["6", "六", "ろく"], ["7", "七", "なな, しち"], ["8", "八", "はち"], ["9", "九", "きゅう, く"],
    ["10", "十", "じゅう"], ["100", "百", "ひゃく"], ["1,000", "千", "せん"], ["10,000", "万", "まん"], ["100,000,000", "億", "おく"],
  ], note: "Sound changes: 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく; 3,000 さんぜん, 8,000 はっせん. Japanese counts in units of 10,000: 100,000 is 十万 (じゅうまん)." },

  { id: "counters", title: "Counters", intro: "Numbers take a counter that depends on what you're counting.", head: ["Counter", "For", "1, 2, 3 …"], rows: [
    ["つ", "general things", "ひとつ, ふたつ, みっつ, よっつ, いつつ … とお (10)"],
    ["人 (にん)", "people", "ひとり, ふたり, さんにん, よにん"],
    ["個 (こ)", "small round things", "いっこ, にこ, さんこ"],
    ["本 (ほん)", "long thin things", "いっぽん, にほん, さんぼん"],
    ["枚 (まい)", "flat things", "いちまい, にまい, さんまい"],
    ["冊 (さつ)", "books", "いっさつ, にさつ, さんさつ"],
    ["台 (だい)", "machines, vehicles", "いちだい, にだい, さんだい"],
    ["匹 (ひき)", "small animals", "いっぴき, にひき, さんびき"],
    ["杯 (はい)", "cups, glasses", "いっぱい, にはい, さんばい"],
    ["回 (かい)", "times", "いっかい, にかい, さんかい"],
    ["階 (かい)", "floors", "いっかい, にかい, さんがい"],
    ["歳 (さい)", "age", "いっさい, にさい, はたち (20)"],
  ] },

  { id: "dates", title: "Days, months and dates", head: ["", "Reading"], rows: [
    ["月曜日 / 火曜日", "げつようび / かようび (Mon / Tue)"],
    ["水曜日 / 木曜日", "すいようび / もくようび (Wed / Thu)"],
    ["金曜日 / 土曜日 / 日曜日", "きんようび / どようび / にちようび (Fri / Sat / Sun)"],
    ["一月 … 十二月", "いちがつ, にがつ, さんがつ, しがつ, ごがつ, ろくがつ, しちがつ, はちがつ, くがつ, じゅうがつ …"],
    ["1日 – 10日", "ついたち, ふつか, みっか, よっか, いつか, むいか, なのか, ようか, ここのか, とおか"],
    ["14日 / 20日 / 24日", "じゅうよっか / はつか / にじゅうよっか"],
    ["Other days", "Number + にち: 十一日 じゅういちにち, 二十五日 にじゅうごにち"],
  ], note: "Learn 1–10 as exceptions; from 11 it's regular except 14, 20 and 24." },

  { id: "time", title: "Telling time", head: ["", "Reading"], rows: [
    ["一時, 二時, 三時", "いちじ, にじ, さんじ"],
    ["四時 / 七時 / 九時", "よじ / しちじ / くじ (the exceptions)"],
    ["一分, 二分, 三分", "いっぷん, にふん, さんぷん"],
    ["四分, 五分, 六分", "よんぷん, ごふん, ろっぷん"],
    ["十分", "じゅっぷん (or じっぷん)"],
    ["半", "はん: 三時半 = half past three"],
    ["午前 / 午後", "ごぜん (a.m.) / ごご (p.m.)"],
  ] },

  { id: "kosoado", title: "こ・そ・あ・ど words", head: ["", "こ (near me)", "そ (near you)", "あ (far from both)", "ど (which?)"], rows: [
    ["Thing", "これ", "それ", "あれ", "どれ"],
    ["Place", "ここ", "そこ", "あそこ", "どこ"],
    ["Direction / polite", "こちら", "そちら", "あちら", "どちら"],
    ["Modifier + noun", "この", "その", "あの", "どの"],
    ["Kind of", "こんな", "そんな", "あんな", "どんな"],
  ] },

  { id: "question-words", title: "Question words", head: ["Word", "Meaning"], rows: [
    ["何 (なに / なん)", "what"], ["誰 (だれ)", "who"], ["どこ", "where"], ["いつ", "when"], ["どうして / なぜ", "why"],
    ["どう / どのように", "how"], ["いくつ", "how many (things)"], ["いくら", "how much (price)"], ["どのくらい", "how long / how much"],
  ], note: "Add か at the end to make a question: 何を食べますか。" },

  { id: "particles", title: "Particles", intro: "Small words that mark each word's role.", head: ["Particle", "Job", "Example"], rows: [
    ["は", "topic (“as for …”)", "私は学生です。"],
    ["が", "subject; things liked or needed", "猫が好きです。"],
    ["を", "direct object", "水を飲みます。"],
    ["に", "time, destination, where something exists, receiver", "七時に起きます。/ 学校に行きます。"],
    ["へ", "direction", "駅へ行きます。"],
    ["で", "place of action; means", "図書館で読みます。/ バスで行きます。"],
    ["と", "with; and; quoting", "友達と食べます。"],
    ["も", "also", "私も行きます。"],
    ["の", "possession; linking nouns", "私の本 / 日本の文化"],
    ["か", "question; “or”", "行きますか。"],
    ["から / まで", "from / until", "九時から五時まで働きます。"],
    ["より", "than", "犬より猫が好きです。"],
    ["や", "and (examples, not complete)", "りんごやバナナを買いました。"],
    ["ね / よ", "agreement / new information", "いい天気ですね。/ 行きますよ。"],
  ] },

  { id: "conjugation", title: "Verb conjugation", intro: "Group 1 (u-verbs) change the last kana; Group 2 (ru-verbs) drop る; two are irregular.",
    head: ["Dictionary", "ます", "て", "た", "ない"], rows: [
    ["書く (G1)", "かきます", "かいて", "かいた", "かかない"],
    ["泳ぐ (G1)", "およぎます", "およいで", "およいだ", "およがない"],
    ["話す (G1)", "はなします", "はなして", "はなした", "はなさない"],
    ["待つ (G1)", "まちます", "まって", "まった", "またない"],
    ["死ぬ (G1)", "しにます", "しんで", "しんだ", "しなない"],
    ["遊ぶ (G1)", "あそびます", "あそんで", "あそんだ", "あそばない"],
    ["読む (G1)", "よみます", "よんで", "よんだ", "よまない"],
    ["帰る (G1)", "かえります", "かえって", "かえった", "かえらない"],
    ["買う (G1)", "かいます", "かって", "かった", "かわない"],
    ["行く (G1, exception)", "いきます", "いって", "いった", "いかない"],
    ["食べる (G2)", "たべます", "たべて", "たべた", "たべない"],
    ["見る (G2)", "みます", "みて", "みた", "みない"],
    ["する (irregular)", "します", "して", "した", "しない"],
    ["来る (irregular)", "きます", "きて", "きた", "こない"],
  ], note: "て/た endings follow the last kana: く→いて, ぐ→いで, す→して, つ・る・う→って, ぬ・ぶ・む→んで. Try the Conjugation drill in Quiz." },

  { id: "adjectives", title: "Adjective conjugation", head: ["", "Present", "Negative", "Past", "Past negative", "て-form"], rows: [
    ["高い (い-adj)", "たかい", "たかくない", "たかかった", "たかくなかった", "たかくて"],
    ["静か (な-adj)", "しずかだ", "しずかじゃない", "しずかだった", "しずかじゃなかった", "しずかで"],
    ["いい (irregular)", "いい", "よくない", "よかった", "よくなかった", "よくて"],
  ], note: "い-adjectives conjugate themselves; な-adjectives take だ/です like nouns." },

  { id: "phrases", title: "Everyday phrases", head: ["Japanese", "Meaning"], rows: [
    ["おはようございます", "Good morning"], ["こんにちは / こんばんは", "Hello (day) / Good evening"], ["ありがとうございます", "Thank you"],
    ["すみません", "Excuse me / sorry / thank you (for the trouble)"], ["ごめんなさい", "I'm sorry"], ["はじめまして", "Nice to meet you"],
    ["よろしくお願いします", "Please treat me well (said when meeting or asking for something)"], ["いただきます / ごちそうさまでした", "Said before / after a meal"],
    ["いってきます / いってらっしゃい", "I'm off / Have a good day"], ["ただいま / おかえりなさい", "I'm home / Welcome back"],
    ["おやすみなさい", "Good night"], ["お願いします", "Please (a request)"], ["大丈夫です", "It's fine / I'm OK"],
    ["わかりません", "I don't understand"], ["もう一度お願いします", "One more time, please"], ["ゆっくり話してください", "Please speak slowly"],
  ] },

  { id: "keigo", title: "Keigo: polite verb pairs", intro: "Honorific (尊敬語) raises the other person; humble (謙譲語) lowers yourself.",
    head: ["Plain", "Honorific", "Humble"], rows: [
    ["食べる / 飲む", "召し上がる", "いただく"], ["言う", "おっしゃる", "申す / 申し上げる"], ["見る", "ご覧になる", "拝見する"],
    ["する", "なさる", "いたす"], ["行く / 来る", "いらっしゃる", "参る"], ["いる", "いらっしゃる", "おる"],
    ["知っている", "ご存じだ", "存じている"], ["もらう", "—", "いただく"], ["くれる", "くださる", "—"], ["あげる", "—", "差し上げる"],
  ], note: "Pattern: お + verb stem + になる (honorific), お + verb stem + する (humble). お待ちになる / お持ちする." },
];
