export type StarterReading = {
  title: string;
  level: "N5" | "N4";
  text: string;
};

/**
 * Original short passages written for this app, not adapted from any
 * existing published work — deliberately built to sit at N5/N4, the range
 * native literature (see the Classics shelf) essentially never reaches.
 * Vocabulary was checked word-by-word against public/dictionary/jlpt-levels.json
 * and the level shown is what scripts/score-difficulty.mjs actually
 * computes for each piece, not an eyeballed guess.
 */
export const STARTER_READINGS: StarterReading[] = [
  {
    title: "日曜日",
    level: "N5",
    text: `私は日曜日が好きです。朝、九時に起きます。それから、朝ご飯を食べます。
午後、公園へ行きます。犬と散歩します。とても楽しいです。
夜、家族と晩ご飯を食べます。そのあと、テレビを見ます。早く寝ます。`,
  },
  {
    title: "私の家族",
    level: "N5",
    text: `父と母と兄がいます。父は会社員です。毎朝、早く会社へ行きます。
母は料理が上手です。晩ご飯はいつもおいしいです。
兄は学生です。今、英語を勉強しています。
みんな、元気です。`,
  },
  {
    title: "買い物",
    level: "N5",
    text: `今日、母とスーパーへ買い物に行きました。
りんごと魚と卵を買いました。あまり高くなかったです。
それから、新しい靴も買いました。とても楽しかったです。
家に帰って、みんなで晩ご飯を作りました。`,
  },
  {
    title: "京都旅行",
    level: "N4",
    text: `先週、友達と京都へ旅行する予定を立てました。朝早く、駅から出発しました。
京都はとても静かで、有名なお寺がたくさんあります。
私たちは古いお寺を見て、写真をたくさん撮りました。窓から見える景色も珍しくて、きれいでした。
それから、京都の文化について少し勉強しました。おいしい料理も食べました。
夜、ホテルで友達といろいろな話をしました。楽しい旅行でした。`,
  },
  {
    title: "雨の日",
    level: "N4",
    text: `最近、雨の日が多いです。今朝も、起きたら雨が降っていました。
傘を持って、駅まで歩きました。少し不便でしたが、頑張りました。
電車の中はいつもより混んでいて、少し疲れました。
会社に着いたら、友達がお茶をくれました。うれしかったです。
午後、雨がやんで、空が明るくなりました。
仕事が終わったあと、久しぶりに友達に会って、一緒に食事をしました。`,
  },
];
