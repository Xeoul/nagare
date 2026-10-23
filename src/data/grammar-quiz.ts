// Original fill-in-the-blank grammar questions in the style of the JLPT's
// 文法 section: one sentence, one gap, four choices. Written for Nagare (they
// are not taken from any exam or app); the explanation names the pattern so a
// wrong answer teaches something. Each question has exactly one natural answer.

export type GrammarQuestion = {
  level: "N5" | "N4" | "N3";
  /** The sentence, with ＿＿ where the answer goes. */
  sentence: string;
  /** English gloss of the whole sentence, shown after answering. */
  gloss: string;
  choices: [string, string, string, string];
  /** Index into choices. */
  answer: number;
  /** Why the answer is right, and what the pattern means. */
  why: string;
};

export const GRAMMAR_QUESTIONS: GrammarQuestion[] = [
  // ───── N5 ─────
  { level: "N5", sentence: "私＿＿学生です。", gloss: "I am a student.", choices: ["は", "を", "に", "で"], answer: 0,
    why: "は marks the topic of the sentence: 私は = “as for me”." },
  { level: "N5", sentence: "水＿＿飲みます。", gloss: "I drink water.", choices: ["を", "に", "で", "が"], answer: 0,
    why: "を marks the direct object of the verb: what is being drunk." },
  { level: "N5", sentence: "毎日、学校＿＿行きます。", gloss: "I go to school every day.", choices: ["に", "を", "が", "と"], answer: 0,
    why: "に marks the destination of a movement verb like 行く, 来る, 帰る (へ also works)." },
  { level: "N5", sentence: "図書館＿＿本を読みます。", gloss: "I read books at the library.", choices: ["で", "に", "を", "が"], answer: 0,
    why: "で marks the place where an action happens. に is for where something exists or where you arrive." },
  { level: "N5", sentence: "友達＿＿一緒に映画を見ました。", gloss: "I watched a movie together with a friend.", choices: ["と", "を", "で", "から"], answer: 0,
    why: "と means “with” (a companion) and also “and” between nouns." },
  { level: "N5", sentence: "私は猫＿＿好きです。", gloss: "I like cats.", choices: ["が", "を", "に", "で"], answer: 0,
    why: "Likes, dislikes and abilities (好き, 嫌い, 上手, できる) take が, not を, for the thing liked." },
  { level: "N5", sentence: "朝ご飯を食べ＿＿から、学校へ行きます。", gloss: "After I eat breakfast, I go to school.", choices: ["て", "た", "ない", "ます"], answer: 0,
    why: "Verb て-form + から = “after doing”. You use the て-form before から, not the dictionary or ます form." },
  { level: "N5", sentence: "この本は＿＿です。（not expensive）", gloss: "This book is not expensive.", choices: ["高くない", "高いない", "高くなかった", "高いじゃない"], answer: 0,
    why: "い-adjectives negate by dropping い and adding くない: 高い → 高くない." },
  { level: "N5", sentence: "きのうは雨でしたから、学校へ＿＿。", gloss: "It rained yesterday, so I didn't go to school.", choices: ["行きませんでした", "行きません", "行きました", "行きたいです"], answer: 0,
    why: "Past negative polite is ません + でした. きのう (yesterday) makes it past, and the sentence says you didn't go." },
  { level: "N5", sentence: "私は冷たい水が＿＿です。", gloss: "I want to drink cold water.", choices: ["飲みたい", "飲む", "飲んで", "飲みます"], answer: 0,
    why: "Verb stem + たい = “want to …”. It behaves like an い-adjective, so you can follow it with です." },
  { level: "N5", sentence: "今、本を読ん＿＿います。", gloss: "I am reading a book now.", choices: ["で", "だ", "ない", "ます"], answer: 0,
    why: "て-form + いる describes an action in progress. 読む becomes 読んで (む → んで)." },
  { level: "N5", sentence: "りんごを三＿＿ください。", gloss: "Three apples, please.", choices: ["つ", "人", "本", "枚"], answer: 0,
    why: "つ is the general counter for small objects (ひとつ, ふたつ, みっつ). 人 is for people, 本 for long things, 枚 for flat things." },
  { level: "N5", sentence: "机の上に猫が＿＿。", gloss: "There is a cat on the desk.", choices: ["います", "あります", "します", "きます"], answer: 0,
    why: "います is for living things that can move (people, animals); あります is for objects and plants." },
  { level: "N5", sentence: "ここに名前を書い＿＿ください。", gloss: "Please write your name here.", choices: ["て", "た", "ない", "ます"], answer: 0,
    why: "て-form + ください = a polite request. 書く becomes 書いて (く → いて)." },
  { level: "N5", sentence: "月曜日から金曜日＿＿働きます。", gloss: "I work from Monday to Friday.", choices: ["まで", "に", "で", "を"], answer: 0,
    why: "から … まで = “from … until”. まで marks the end point." },

  // ───── N4 ─────
  { level: "N4", sentence: "日本へ行った＿＿がありますか。", gloss: "Have you ever been to Japan?", choices: ["こと", "もの", "ため", "よう"], answer: 0,
    why: "Past form + ことがある = “have done … before” (experience)." },
  { level: "N4", sentence: "音楽を聞き＿＿勉強します。", gloss: "I study while listening to music.", choices: ["ながら", "から", "ので", "たら"], answer: 0,
    why: "Verb stem + ながら = doing two things at the same time. The main action comes last." },
  { level: "N4", sentence: "たとえ雨が降っ＿＿、試合は行われます。", gloss: "Even if it rains, the game will be held.", choices: ["ても", "たら", "ので", "から"], answer: 0,
    why: "て-form + も = “even if / even though”. It marks a condition that makes no difference." },
  { level: "N4", sentence: "疲れているときは、早く寝た＿＿がいいです。", gloss: "When you're tired, you should go to bed early.", choices: ["ほう", "こと", "ため", "まま"], answer: 0,
    why: "Past form + ほうがいい = “it's better to …”, used to give advice." },
  { level: "N4", sentence: "私は先生に宿題を忘れて＿＿。（I was scolded）", gloss: "I forgot my homework and was scolded by the teacher.", choices: ["叱られました", "叱りました", "叱らせました", "叱ります"], answer: 0,
    why: "The passive (られる) is used when something is done to you. 叱る → 叱られる = “to be scolded”." },
  { level: "N4", sentence: "母は子どもに野菜を＿＿。", gloss: "The mother made the child eat vegetables.", choices: ["食べさせました", "食べられました", "食べました", "食べたかったです"], answer: 0,
    why: "The causative (させる) means “make / let someone do”. 食べる → 食べさせる." },
  { level: "N4", sentence: "このケーキはおいし＿＿ですね。", gloss: "This cake looks delicious, doesn't it?", choices: ["そう", "よう", "らしい", "ため"], answer: 0,
    why: "Adjective stem + そう = “looks / seems” based on what you see. おいしい → おいしそう." },
  { level: "N4", sentence: "熱がある＿＿、会社を休みました。", gloss: "I had a fever, so I took the day off work.", choices: ["ので", "のに", "ても", "ながら"], answer: 0,
    why: "ので gives a reason or cause (“because / so”) and leads to a natural result." },
  { level: "N4", sentence: "一生懸命勉強した＿＿、テストに落ちました。", gloss: "Even though I studied hard, I failed the test.", choices: ["のに", "ので", "から", "たら"], answer: 0,
    why: "のに = “even though”, for a result that goes against expectations, often with disappointment." },
  { level: "N4", sentence: "明日までにレポートを出さ＿＿ならない。", gloss: "I must submit the report by tomorrow.", choices: ["なければ", "なくても", "ないで", "なかった"], answer: 0,
    why: "ない-form minus い + ければならない = “must / have to”. 出さなければならない." },
  { level: "N4", sentence: "毎日野菜を食べる＿＿しています。", gloss: "I try to eat vegetables every day.", choices: ["ように", "ために", "ことに", "ばかり"], answer: 0,
    why: "Dictionary form + ようにする = “make an effort to …” as a habit." },
  { level: "N4", sentence: "家に帰っ＿＿、電話してください。", gloss: "When you get home, please call me.", choices: ["たら", "ても", "ながら", "ので"], answer: 0,
    why: "た-form + ら = “when / if”, with the second half being what happens or what to do after." },
  { level: "N4", sentence: "彼はもう家に着いた＿＿です。", gloss: "He should have arrived home by now.", choices: ["はず", "こと", "ため", "よう"], answer: 0,
    why: "はず expresses a confident expectation based on reasoning: “should be / must have”." },
  { level: "N4", sentence: "このペンは書き＿＿ので、好きです。", gloss: "I like this pen because it's easy to write with.", choices: ["やすい", "にくい", "すぎる", "ながら"], answer: 0,
    why: "Verb stem + やすい = “easy to …”. The opposite is にくい (“hard to …”), which wouldn't fit with “I like it”." },
  { level: "N4", sentence: "私は友達に本を貸し＿＿。", gloss: "I lent my friend a book (as a favour).", choices: ["てあげました", "てくれました", "てもらいました", "ていました"], answer: 0,
    why: "て-form + あげる = doing a favour for someone else. くれる is when someone does it for you." },

  // ───── N3 ─────
  { level: "N3", sentence: "彼は毎日ゲーム＿＿しています。", gloss: "He does nothing but play games every day.", choices: ["ばかり", "ほど", "ごろ", "くらい"], answer: 0,
    why: "ばかり after a noun means “nothing but / all the time”, usually with a hint of criticism." },
  { level: "N3", sentence: "明日は試験だから、遊ぶ＿＿にはいかない。", gloss: "I have an exam tomorrow, so I can't just play around.", choices: ["わけ", "はず", "こと", "もの"], answer: 0,
    why: "Verb + わけにはいかない = “can't (because of circumstances)”; there's a reason you shouldn't." },
  { level: "N3", sentence: "国＿＿習慣が違います。", gloss: "Customs differ depending on the country.", choices: ["によって", "について", "に対して", "として"], answer: 0,
    why: "によって = “depending on / according to”, for things that vary case by case." },
  { level: "N3", sentence: "日本の文化＿＿調べています。", gloss: "I'm researching Japanese culture.", choices: ["について", "によって", "として", "にとって"], answer: 0,
    why: "について = “about / concerning”, for the topic of thinking, talking or research." },
  { level: "N3", sentence: "先生＿＿、彼は丁寧にお辞儀をした。", gloss: "He bowed politely to the teacher.", choices: ["に対して", "について", "によって", "にとって"], answer: 0,
    why: "に対して = “toward / to”, for an action or attitude directed at a person. について would mean “about”, which doesn't fit a bow." },
  { level: "N3", sentence: "新しい服を買った＿＿、一度も着ていない。", gloss: "I bought new clothes, but I haven't worn them once.", choices: ["ものの", "ものだ", "ものか", "ものなら"], answer: 0,
    why: "Plain form + ものの = “although / even though”, admitting one fact while the next doesn't follow." },
  { level: "N3", sentence: "先生の話が聞こえる＿＿、前の席に座った。", gloss: "I sat in the front seat so that I could hear the teacher.", choices: ["ように", "ために", "ばかり", "ほど"], answer: 0,
    why: "ように = “so that” with a state that isn't under your control (聞こえる). ために goes with an action you do on purpose." },
  { level: "N3", sentence: "来月から大阪で働く＿＿なりました。", gloss: "It has been decided that I'll work in Osaka from next month.", choices: ["ことに", "わけに", "はずに", "ものに"], answer: 0,
    why: "ことになる = “it has been decided / turns out that …”, often a decision made by others or by circumstances." },
  { level: "N3", sentence: "説明書に書いてある＿＿に作ってください。", gloss: "Please make it just as the instructions say.", choices: ["とおり", "まま", "ほど", "ばかり"], answer: 0,
    why: "とおり = “exactly as”: 書いてあるとおりに = “as written”." },
  { level: "N3", sentence: "雨の＿＿で、試合が中止になった。", gloss: "The game was cancelled because of the rain.", choices: ["せい", "おかげ", "ため", "わけ"], answer: 0,
    why: "せいで gives the cause of something bad. おかげで is the same idea for good results." },
  { level: "N3", sentence: "先生に教えてもらった＿＿、合格できました。", gloss: "Thanks to the teacher's help, I passed.", choices: ["おかげで", "せいで", "くせに", "ばかりで"], answer: 0,
    why: "おかげで = “thanks to”, for a good result you're grateful for." },
  { level: "N3", sentence: "彼は英語＿＿でなく、中国語も話せる。", gloss: "He can speak not only English but also Chinese.", choices: ["だけ", "しか", "こそ", "さえ"], answer: 0,
    why: "だけでなく … も = “not only … but also …”." },
  { level: "N3", sentence: "日本に来た＿＿で、まだ慣れていません。", gloss: "I've only just come to Japan, so I'm not used to it yet.", choices: ["ばかり", "ところ", "ほど", "くらい"], answer: 0,
    why: "た-form + ばかり = “has just done”, with a feeling that it was a short time ago." },
  { level: "N3", sentence: "家を出よう＿＿したとき、電話が鳴った。", gloss: "Just as I was about to leave the house, the phone rang.", choices: ["と", "に", "を", "が"], answer: 0,
    why: "Volitional form (よう) + とする = “try to / be about to do”." },
  { level: "N3", sentence: "あの店はいつも込んでいるから、おいしい＿＿ない。", gloss: "That shop is always crowded, so it must be good.", choices: ["に違い", "はずが", "わけが", "ものか"], answer: 0,
    why: "に違いない = “must be / surely”, a strong guess. The other options all deny the idea, which clashes with “always crowded”." },
];
