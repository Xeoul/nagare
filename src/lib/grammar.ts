import type { Token } from "./tokenizer";

/**
 * A small built-in grammar guide: it spots common patterns in the tokens
 * kuromoji produces and explains them in English. It only needs the
 * part-of-speech tags, so it runs instantly and offline, like the dictionary.
 * The basics (は, が, ます, です, past tense, plain ない) are left out on
 * purpose — marking every one of them would underline half the page.
 */

export type GrammarNote = {
  id: string;
  /** The pattern as a learner would look it up, e.g. "〜ている". */
  title: string;
  level: "N5" | "N4" | "N3";
  meaning: string;
  example: { ja: string; en: string };
};

/** A pattern found in a run of tokens: tokens[start] up to, but not including, tokens[end]. */
export type GrammarMatch = { note: GrammarNote; start: number; end: number };

type Want = {
  s?: string | string[];
  b?: string | string[];
  pos?: string | string[];
  p1?: string | string[];
  cf?: string;
};

const oneOf = (want: string | string[] | undefined, value: string) =>
  want === undefined || (Array.isArray(want) ? want.includes(value) : want === value);

function is(token: Token | undefined, want: Want): boolean {
  if (!token) return false;
  return (
    oneOf(want.s, token.surface_form) &&
    oneOf(want.b, token.basic_form) &&
    oneOf(want.pos, token.pos) &&
    oneOf(want.p1, token.pos_detail_1) &&
    (want.cf === undefined || token.conjugated_form === want.cf)
  );
}

/** Returns how many tokens the pattern covers when it starts at index i (0 = no match). */
type Matcher = (t: Token[], i: number) => number;

type Rule = { note: GrammarNote; match: Matcher };

const TE = { s: ["て", "で"], pos: "助詞", p1: "接続助詞" } satisfies Want;

/** て/で followed by a helper verb, e.g. 〜ている, 〜てしまう. */
const teHelper =
  (helper: string | string[], span = 2): Matcher =>
  (t, i) =>
    is(t[i], TE) && is(t[i + 1], { b: helper, pos: "動詞", p1: "非自立" }) ? span : 0;

const conjunction =
  (surface: string | string[], p1 = "接続助詞"): Matcher =>
  (t, i) =>
    is(t[i], { s: surface, pos: "助詞", p1 }) ? 1 : 0;

const rules: Rule[] = [
  {
    note: {
      id: "te-iru",
      title: "〜ている",
      level: "N5",
      meaning: "An action in progress (“is doing”), or a state that resulted from a change (“is married”, “is open”).",
      example: { ja: "本を読んでいます。", en: "I am reading a book." },
    },
    match: teHelper("いる"),
  },
  {
    note: {
      id: "te-shimau",
      title: "〜てしまう",
      level: "N4",
      meaning: "Finishing something completely, or doing something by accident or with regret (“ended up doing”).",
      example: { ja: "財布を忘れてしまった。", en: "I ended up forgetting my wallet." },
    },
    match: teHelper("しまう"),
  },
  {
    note: {
      id: "te-miru",
      title: "〜てみる",
      level: "N4",
      meaning: "Trying something to see what it is like (“try doing”).",
      example: { ja: "この店に入ってみよう。", en: "Let's try going into this shop." },
    },
    match: teHelper("みる"),
  },
  {
    note: {
      id: "te-oku",
      title: "〜ておく",
      level: "N4",
      meaning: "Doing something in advance, or leaving it in that state for later.",
      example: { ja: "ホテルを予約しておきます。", en: "I'll book the hotel ahead of time." },
    },
    match: teHelper("おく"),
  },
  {
    note: {
      id: "te-ageru",
      title: "〜てあげる / くれる / もらう",
      level: "N4",
      meaning:
        "Doing something as a favor. あげる: you do it for someone; くれる: someone does it for you; もらう: you get someone to do it for you.",
      example: { ja: "友達が手伝ってくれた。", en: "A friend helped me out." },
    },
    match: teHelper(["あげる", "くれる", "もらう", "いただく"]),
  },
  {
    note: {
      id: "te-iku",
      title: "〜ていく / てくる",
      level: "N3",
      meaning: "A change or action moving away from now (〜ていく) or toward now (〜てくる), often a gradual change over time.",
      example: { ja: "だんだん寒くなってきた。", en: "It has gradually gotten colder." },
    },
    match: teHelper(["いく", "くる", "行く", "来る"]),
  },
  {
    note: {
      id: "te-kudasai",
      title: "〜てください",
      level: "N5",
      meaning: "A polite request: “please do ~”.",
      example: { ja: "ここに名前を書いてください。", en: "Please write your name here." },
    },
    match: (t, i) => (is(t[i], TE) && is(t[i + 1], { b: "くださる" }) ? 2 : 0),
  },
  {
    note: {
      id: "te-mo-ii",
      title: "〜てもいい",
      level: "N5",
      meaning: "Permission: “it's okay to ~”. As a question it asks permission (“may I ~?”).",
      example: { ja: "ここで写真を撮ってもいいですか。", en: "May I take a photo here?" },
    },
    match: (t, i) =>
      is(t[i], TE) && is(t[i + 1], { s: "も" }) && is(t[i + 2], { s: ["いい", "よい"], pos: "形容詞" }) ? 3 : 0,
  },
  {
    note: {
      id: "nakereba-naranai",
      title: "〜なければならない",
      level: "N4",
      meaning: "An obligation: “must / have to ~”. Also seen as 〜なければいけない and 〜なくてはならない.",
      example: { ja: "宿題をしなければならない。", en: "I have to do my homework." },
    },
    match: (t, i) =>
      is(t[i], { s: "なけれ", b: "ない" }) &&
      is(t[i + 1], { s: "ば" }) &&
      is(t[i + 2], { b: ["なる", "いける"] })
        ? 4
        : 0,
  },
  {
    note: {
      id: "koto-ga-dekiru",
      title: "〜ことができる",
      level: "N4",
      meaning: "Ability or possibility: “can do ~”. It attaches to the dictionary form of a verb.",
      example: { ja: "日本語を話すことができる。", en: "I can speak Japanese." },
    },
    match: (t, i) =>
      is(t[i], { s: "こと", pos: "名詞" }) && is(t[i + 1], { s: "が" }) && is(t[i + 2], { b: "できる" }) ? 3 : 0,
  },
  {
    note: {
      id: "koto-ga-aru",
      title: "〜たことがある",
      level: "N4",
      meaning: "Having done something at least once (“have ever ~”). With the dictionary form it means something happens sometimes.",
      example: { ja: "京都に行ったことがあります。", en: "I have been to Kyoto." },
    },
    match: (t, i) =>
      is(t[i], { s: "こと", pos: "名詞" }) && is(t[i + 1], { s: "が" }) && is(t[i + 2], { b: "ある" }) ? 3 : 0,
  },
  {
    note: {
      id: "you-ni-suru",
      title: "〜ようにする / ようになる",
      level: "N4",
      meaning: "〜ようにする: make an effort to do ~. 〜ようになる: come to be able to / have gotten to the point of ~.",
      example: { ja: "毎日勉強するようにしています。", en: "I make a point of studying every day." },
    },
    match: (t, i) =>
      is(t[i], { s: "よう", pos: "名詞" }) && is(t[i + 1], { s: "に" }) && is(t[i + 2], { b: ["する", "なる"] }) ? 3 : 0,
  },
  {
    note: {
      id: "tame-ni",
      title: "〜ために",
      level: "N4",
      meaning: "Purpose (“in order to ~”) after a dictionary-form verb, or a reason or benefit (“because of / for ~”) after a noun.",
      example: { ja: "日本語を勉強するために、日本に来ました。", en: "I came to Japan in order to study Japanese." },
    },
    match: (t, i) => (is(t[i], { s: "ため", pos: "名詞" }) && is(t[i + 1], { s: "に" }) ? 2 : 0),
  },
  {
    note: {
      id: "hou-ga-ii",
      title: "〜ほうがいい",
      level: "N4",
      meaning: "Advice: “it's better to ~”, “you had better ~”.",
      example: { ja: "早く寝たほうがいいですよ。", en: "You'd better go to bed early." },
    },
    match: (t, i) =>
      is(t[i], { s: "ほう", pos: "名詞" }) && is(t[i + 1], { s: "が" }) && is(t[i + 2], { s: ["いい", "よい"] }) ? 3 : 0,
  },
  {
    note: {
      id: "tai",
      title: "〜たい",
      level: "N5",
      meaning: "Wanting to do something: “want to ~”. It conjugates like an い-adjective (たくない, たかった).",
      example: { ja: "水を飲みたい。", en: "I want to drink water." },
    },
    match: (t, i) => (is(t[i], { b: "たい", pos: "助動詞" }) ? 1 : 0),
  },
  {
    note: {
      id: "mashou",
      title: "〜ましょう",
      level: "N5",
      meaning: "A polite suggestion or invitation: “let's ~”.",
      example: { ja: "一緒に行きましょう。", en: "Let's go together." },
    },
    match: (t, i) => (is(t[i], { s: "ましょ", b: "ます" }) && is(t[i + 1], { s: "う" }) ? 2 : 0),
  },
  {
    note: {
      id: "tara",
      title: "〜たら",
      level: "N4",
      meaning: "A condition: “if ~” or “when / once ~ happens”. The result is what follows.",
      example: { ja: "雨が降ったら、行きません。", en: "If it rains, I won't go." },
    },
    match: (t, i) => (is(t[i], { b: "た", pos: "助動詞", cf: "仮定形" }) ? 1 : 0),
  },
  {
    note: {
      id: "ba",
      title: "〜ば",
      level: "N4",
      meaning: "A conditional: “if ~”. Often a condition that makes the result follow naturally.",
      example: { ja: "安ければ買います。", en: "If it's cheap, I'll buy it." },
    },
    match: conjunction("ば"),
  },
  {
    note: {
      id: "to-conditional",
      title: "〜と",
      level: "N4",
      meaning: "“When / whenever ~” or “if ~”: the result follows automatically (habits, natural results, discoveries).",
      example: { ja: "春になると、桜が咲きます。", en: "When spring comes, the cherry blossoms bloom." },
    },
    match: conjunction("と"),
  },
  {
    note: {
      id: "temo",
      title: "〜ても",
      level: "N4",
      meaning: "“Even if ~” or “even though ~”: the result stays the same regardless.",
      example: { ja: "雨が降っても、行きます。", en: "Even if it rains, I'll go." },
    },
    match: (t, i) =>
      is(t[i], { s: ["ても", "でも"], pos: "助詞", p1: "接続助詞" }) ||
      (is(t[i], TE) && is(t[i + 1], { s: "も", pos: "助詞", p1: "係助詞" }))
        ? (is(t[i], TE) ? 2 : 1)
        : 0,
  },
  {
    note: {
      id: "node",
      title: "〜ので",
      level: "N4",
      meaning: "“Because ~”. Softer and more objective than から, so it is common in polite explanations.",
      example: { ja: "雨なので、家にいます。", en: "Because it's raining, I'll stay home." },
    },
    match: conjunction("ので"),
  },
  {
    note: {
      id: "kara",
      title: "〜から",
      level: "N5",
      meaning: "“Because ~” / “so ~”. The reason comes first, then から. (Not to be confused with から meaning “from”.)",
      example: { ja: "疲れたから、寝ます。", en: "I'm tired, so I'm going to sleep." },
    },
    match: conjunction("から"),
  },
  {
    note: {
      id: "kedo",
      title: "〜けど / けれど / が",
      level: "N5",
      meaning: "“But ~” or “although ~”. けど is casual; けれど and けれども are more formal.",
      example: { ja: "高いけど、買いました。", en: "It was expensive, but I bought it." },
    },
    match: conjunction(["けど", "けれど", "けれども", "けども", "が"]),
  },
  {
    note: {
      id: "noni",
      title: "〜のに",
      level: "N4",
      meaning: "“Even though ~”: the result is unexpected or disappointing.",
      example: { ja: "勉強したのに、テストが難しかった。", en: "Even though I studied, the test was hard." },
    },
    match: conjunction("のに"),
  },
  {
    note: {
      id: "nagara",
      title: "〜ながら",
      level: "N4",
      meaning: "Two actions at the same time by the same person: “while doing ~”.",
      example: { ja: "音楽を聞きながら勉強する。", en: "I study while listening to music." },
    },
    match: conjunction("ながら"),
  },
  {
    note: {
      id: "tari",
      title: "〜たり〜たり",
      level: "N4",
      meaning: "Listing example actions, not all of them: “doing things like A and B”.",
      example: { ja: "休みの日は本を読んだり、映画を見たりします。", en: "On days off I do things like read and watch movies." },
    },
    match: conjunction(["たり", "だり"], "並立助詞"),
  },
  {
    note: {
      id: "shi",
      title: "〜し",
      level: "N4",
      meaning: "Listing reasons or qualities, with the sense of “and what's more”. Often one of several reasons.",
      example: { ja: "安いし、おいしいし、よく行きます。", en: "It's cheap and tasty, so I go often." },
    },
    match: conjunction("し"),
  },
  {
    note: {
      id: "sugiru",
      title: "〜すぎる",
      level: "N4",
      meaning: "Doing something too much: “too ~”. It attaches to a verb stem or an adjective stem.",
      example: { ja: "昨日は食べすぎた。", en: "I ate too much yesterday." },
    },
    match: (t, i) => (is(t[i], { b: ["過ぎる", "すぎる"], pos: "動詞", p1: "非自立" }) ? 1 : 0),
  },
  {
    note: {
      id: "yasui",
      title: "〜やすい / にくい",
      level: "N4",
      meaning: "Easy to do (〜やすい) or hard to do (〜にくい), attached to a verb stem.",
      example: { ja: "このペンは書きやすい。", en: "This pen is easy to write with." },
    },
    match: (t, i) => (is(t[i], { b: ["やすい", "にくい"], pos: "形容詞", p1: ["接尾", "非自立"] }) ? 1 : 0),
  },
  {
    note: {
      id: "sou-appearance",
      title: "〜そう",
      level: "N4",
      meaning: "How something looks, from what you can see: “looks ~ / seems ~”. It attaches to a verb stem or an adjective stem.",
      example: { ja: "このケーキはおいしそうです。", en: "This cake looks delicious." },
    },
    match: (t, i) =>
      is(t[i], { s: "そう", pos: "名詞", p1: "接尾" }) && ["ガル接続", "連用形"].includes(t[i - 1]?.conjugated_form ?? "") ? 1 : 0,
  },
  {
    note: {
      id: "rashii",
      title: "〜らしい",
      level: "N3",
      meaning: "“Seems / apparently ~”, based on something you heard or read. After a noun it can also mean “typical of ~”.",
      example: { ja: "彼は来るらしい。", en: "Apparently he's coming." },
    },
    match: (t, i) => (is(t[i], { b: "らしい", pos: "助動詞" }) && t[i - 1]?.surface_form !== "珍" ? 1 : 0),
  },
  {
    note: {
      id: "kamoshirenai",
      title: "〜かもしれない",
      level: "N4",
      meaning: "Possibility: “might ~ / maybe ~”. Roughly a 50% guess.",
      example: { ja: "明日は雨かもしれない。", en: "It might rain tomorrow." },
    },
    match: (t, i) => (is(t[i], { s: "かも" }) && is(t[i + 1], { b: "しれる" }) ? 2 : 0),
  },
  {
    note: {
      id: "darou",
      title: "〜だろう / でしょう",
      level: "N4",
      meaning: "A guess: “probably ~ / I suppose ~”. でしょう is the polite form.",
      example: { ja: "明日は晴れるでしょう。", en: "It will probably be sunny tomorrow." },
    },
    match: (t, i) =>
      is(t[i], { b: ["だろう", "でしょう"], pos: "助動詞" })
        ? 1
        : is(t[i], { s: ["だろ", "でしょ"], pos: "助動詞" }) && is(t[i + 1], { s: "う" })
          ? 2
          : 0,
  },
  {
    note: {
      id: "hazu",
      title: "〜はず",
      level: "N4",
      meaning: "Something you expect to be true: “should be ~ / is supposed to ~”.",
      example: { ja: "彼はもう着いているはずです。", en: "He should have arrived already." },
    },
    match: (t, i) => (is(t[i], { s: "はず", pos: "名詞" }) ? 1 : 0),
  },
  {
    note: {
      id: "tsumori",
      title: "〜つもり",
      level: "N4",
      meaning: "An intention or plan: “intend to ~”. With the negative it means “don't intend to ~”.",
      example: { ja: "来年、日本に行くつもりです。", en: "I plan to go to Japan next year." },
    },
    match: (t, i) => (is(t[i], { s: "つもり", pos: "名詞" }) ? 1 : 0),
  },
  {
    note: {
      id: "volitional-to-omou",
      title: "〜(よ)うと思う",
      level: "N4",
      meaning: "A decision you are thinking about or have just made: “I think I'll ~ / I'm thinking of ~ing”.",
      example: { ja: "来年、日本へ行こうと思っています。", en: "I'm thinking of going to Japan next year." },
    },
    match: (t, i) =>
      is(t[i], { b: "う", pos: "助動詞" }) && is(t[i + 1], { s: "と" }) && is(t[i + 2], { b: ["思う", "おもう"] }) ? 3 : 0,
  },
  {
    note: {
      id: "passive",
      title: "〜れる / られる",
      level: "N4",
      meaning:
        "Passive (“is done to someone”), and the same ending also makes the potential (“can ~”) and respectful forms. Context tells you which.",
      example: { ja: "先生にほめられた。", en: "I was praised by my teacher." },
    },
    match: (t, i) => (is(t[i], { b: ["れる", "られる"], pos: ["助動詞", "動詞"] }) && t[i].pos_detail_1 !== "自立" ? 1 : 0),
  },
  {
    note: {
      id: "causative",
      title: "〜せる / させる",
      level: "N4",
      meaning: "Causative: “make someone do ~” or “let someone do ~”.",
      example: { ja: "母は私に野菜を食べさせた。", en: "My mother made me eat vegetables." },
    },
    match: (t, i) => (is(t[i], { b: ["せる", "させる"], pos: ["助動詞", "動詞"] }) && t[i].pos_detail_1 !== "自立" ? 1 : 0),
  },
  {
    note: {
      id: "n-desu",
      title: "〜んです / のです",
      level: "N4",
      meaning: "Explaining or asking for an explanation, with a feeling of “the thing is…”. It softens a reason or invites the listener to react.",
      example: { ja: "どうしたんですか。", en: "What's wrong? (I'd like to know what's going on.)" },
    },
    match: (t, i) =>
      is(t[i], { s: ["ん", "の"], pos: "名詞", p1: "非自立" }) && is(t[i + 1], { s: ["です", "だ", "でし", "だっ"], pos: "助動詞" }) ? 2 : 0,
  },
];

/** Every grammar pattern in the tokens, left to right, without overlaps. */
export function findGrammar(tokens: Token[]): GrammarMatch[] {
  const matches: GrammarMatch[] = [];
  let i = 0;
  while (i < tokens.length) {
    let found: GrammarMatch | null = null;
    for (const rule of rules) {
      const span = rule.match(tokens, i);
      if (span > 0 && (!found || i + span > found.end)) found = { note: rule.note, start: i, end: i + span };
    }
    if (found) {
      matches.push(found);
      i = found.end;
    } else {
      i++;
    }
  }
  return matches;
}
