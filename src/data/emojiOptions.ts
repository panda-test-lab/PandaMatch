const EMOJI_GROUPS = [
  {
    category: 'Gesichter & Gefühle',
    keywords: 'smiley emotion lachen liebe',
    emojis: '😀 😃 😄 😁 😆 😅 😂 🙂 🙃 🫠 😉 😊 😇 🥰 😍 🤩 😘 😗 ☺️ 😚 😙 🥲 😋 😛 😜',
  },
  {
    category: 'Tiere',
    keywords: 'tier haustier säugetier',
    emojis: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🦆',
  },
  {
    category: 'Insekten & Meerestiere',
    keywords: 'tier insekten meer ozean wasser',
    emojis: '🐺 🦄 🐝 🦋 🐌 🐞 🐜 🪲 🪳 🕷️ 🕸️ 🦂 🦟 🪰 🪱 🪼 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞',
  },
  {
    category: 'Obst & Gemüse',
    keywords: 'essen lebensmittel pflanze gesund',
    emojis: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🫒 🥦 🥬 🥒 🌶️ 🫑',
  },
  {
    category: 'Gerichte & Süßes',
    keywords: 'essen lebensmittel kochen dessert',
    emojis: '🍞 🥐 🥨 🥯 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔',
  },
  {
    category: 'Sport & Aktivitäten',
    keywords: 'sport spiel musik kunst hobby',
    emojis: '🥌 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊',
  },
  {
    category: 'Reisen & Orte',
    keywords: 'reise transport ort gebäude natur weltall',
    emojis: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🚲 🛴 🚂 🚆 🚇 ✈️ 🚀 🛸 🛰️',
  },
  {
    category: 'Gegenstände & Hobbys',
    keywords: 'objekt werkzeug musik lesen schreiben',
    emojis: '🎸 🎹 🎺 🎻 🥁 🎷 🎨 🎭 🎬 🎤 🎧 📚 📖 ✏️ 🖊️ 💡 🔦 🔋 💻 📱 📷 🔭 🔬 🧩 🎲',
  },
  {
    category: 'Symbole & Natur',
    keywords: 'symbol stern herz wetter pflanze element',
    emojis: '⭐ 🌟 ✨ 💫 🌙 ☀️ 🌈 ☁️ 🌧️ ❄️ 🔥 🌊 🍀 🌿 🌱 🌵 🌻 🌸 🌹 🌼 🌳 🍁 🍂 💎 👑',
  },
  {
    category: 'Wissenschaft & Zeichen',
    keywords: 'wissenschaft chemie biologie weltraum symbol',
    emojis: '⚗️ 🧪 🧫 🧬 🩻 🦠 🩺 💊 🧠 🫀 🫁 🦴 🧲 ⚛️ ☢️ ☣️ 🧯 🪐 🌍 🌎 🌏 🏰 ⛵ 🍣 🍦',
  },
  {
    category: 'Medizin, Pharmazie & Naturwissenschaften',
    keywords: 'medizin arzt ärztin pflege klinik pharma apotheke medikament labor chemie biologie naturwissenschaft anatomie körper spritze verband',
    emojis: '⚕️ 🧑‍⚕️ 🧑‍🔬 🥼 💉 🩹 🩼 🧴 🦷 👁️',
  },
];

export const EMOJI_OPTIONS = EMOJI_GROUPS.flatMap(({ category, keywords, emojis }) =>
  emojis.split(' ').map((emoji) => ({ emoji, category, keywords })),
);
