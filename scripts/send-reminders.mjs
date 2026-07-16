import { createHash } from "node:crypto";

const APP_ID = process.env.ONESIGNAL_APP_ID || "20182128-cf1f-40a2-be0c-18938fcd6f82";
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const APP_URL = "https://mohsensalare.github.io/IrregularVerbs/";
const ICON_URL = `${APP_URL}icons/icon-192.png`;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!REST_API_KEY && !DRY_RUN) {
  throw new Error("ONESIGNAL_REST_API_KEY is required");
}

const messages = {
  morning: [
    ["صبح بخیر، آماده‌ای؟", "صبح بهترین زمان برای یه مرور کوتاه و تازه‌نفسه. چند فعل رو با هم جمع کنیم؟"],
    ["یه شروع خوب برای امروز", "قبل از شلوغ‌شدن روز، چند دقیقه فعل تمرین کن و با خیال راحت ادامه بده."],
    ["صبح رو با یه برد کوچیک شروع کن", "فقط چند سؤال کوتاه؛ هم ذهنت گرم می‌شه، هم فعل‌ها بهتر می‌مونن."]
  ],
  night: [
    ["یه مرور قبل خواب؟", "قبل خواب یه تمرین حسابی می‌تونه فعل‌ها رو بهتر توی ذهنت نگه داره."],
    ["امروز رو با یه تمرین کوتاه ببند", "چند دقیقه بیشتر وقت نمی‌گیره؛ ولی فردا فعل‌ها خیلی آشناتر به نظر می‌رسن."],
    ["هنوز برای تمرین امروز دیر نشده", "خودتو یه محک بزن؛ چند سؤال کوتاه و بعد با خیال راحت استراحت کن."]
  ],
  general: [
    ["وقت یه محک کوتاهه", "خودتو یه محک بزن؛ شاید امروز رکورد تازه‌ای ساختی."],
    ["از دیروز تا حالا سر نزدی", "با چند سؤال کوتاه برگرد توی جریان؛ شروعش از چیزی که فکر می‌کنی راحت‌تره."],
    ["چند فعل، چند دقیقه", "یه تمرین جمع‌وجور انجام بده و نذار فعل‌های بی‌قاعده از یادت برن."]
  ],
  friday: [
    ["جمعه‌ست؛ یه تمرین سبک؟", "آخر هفته با چند سؤال کوتاه هم خودتو محک بزن، هم فعل‌ها رو تازه نگه دار."],
    ["جمعهٔ آروم، مرور کوتاه", "یه تمرین سبک انجام بده تا هفتهٔ بعد با فعل‌های محکم‌تری شروع کنی."],
    ["آخر هفته یه برد کوچیک بساز", "چند دقیقه تمرین کن؛ همین مرور کوتاه می‌تونه کلی فرق بسازه."]
  ],
  review: [
    ["وقت مرور اشتباهاته", "الان بهترین زمان برای تمرین اشتباه‌های قبلیته؛ این بار محکم‌تر یادشون می‌گیری."],
    ["برگرد سراغ سؤال‌های سخت", "اشتباه‌های قبلی منتظر یه جواب درستن. یه مرور کوتاه شروع کن."],
    ["این بار درستشون کن", "چند موردی که قبلاً سخت بودن رو دوباره بزن و پیشرفتت رو ببین."]
  ]
};

function tag(key, relation, value) {
  return { field: "tag", key, relation, value: String(value) };
}

function deterministicUuid(value) {
  const bytes = Buffer.from(createHash("sha256").update(value).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function choose(kind, fullSlot) {
  const list = messages[kind];
  const day = Number(fullSlot.slice(0, 8));
  return list[day % list.length];
}

async function send(kind, fullSlot, filters) {
  const [title, body] = choose(kind, fullSlot);
  const payload = {
    app_id: APP_ID,
    target_channel: "push",
    headings: { en: title },
    contents: { en: body },
    url: APP_URL,
    chrome_web_icon: ICON_URL,
    idempotency_key: deterministicUuid(`${APP_ID}:${kind}:${fullSlot}`),
    filters
  };

  if (DRY_RUN) {
    console.log(JSON.stringify({ kind, fullSlot, title, body, filters }, null, 2));
    return;
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Authorization": `Key ${REST_API_KEY}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`OneSignal ${response.status}: ${JSON.stringify(result)}`);
  }
  console.log(`${kind}: ${result.id || "no recipients"}`);
}

const now = process.env.NOW_ISO ? new Date(process.env.NOW_ISO) : new Date();
now.setUTCSeconds(0, 0);
now.setUTCMinutes(Math.floor(now.getUTCMinutes() / 30) * 30);

const pad2 = value => String(value).padStart(2, "0");
const fullSlot = `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`;
const timeSlot = `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}`;
const utcWeekday = now.getUTCDay();

const dailyBase = [
  tag("reminder_enabled", "=", "1"),
  tag("reminder_slot_utc", "=", timeSlot),
  tag("skip_daily_slot", "!=", fullSlot),
  tag("review_due_1_slot", "!=", fullSlot),
  tag("review_due_3_slot", "!=", fullSlot)
];

await Promise.all([
  ...["morning", "night", "general"].map(kind => send(kind, fullSlot, [
    ...dailyBase,
    tag("daily_enabled", "=", "1"),
    tag("friday_utc_weekday", "!=", utcWeekday),
    tag("reminder_copy", "=", kind)
  ])),
  send("friday", fullSlot, [
    ...dailyBase,
    tag("friday_enabled", "=", "1"),
    tag("friday_utc_weekday", "=", utcWeekday)
  ]),
  send("review", fullSlot, [
    tag("reminder_enabled", "=", "1"),
    tag("review_enabled", "=", "1"),
    tag("review_needed", "=", "1"),
    tag("skip_daily_slot", "!=", fullSlot),
    tag("review_due_1_slot", "=", fullSlot),
    { operator: "OR" },
    tag("reminder_enabled", "=", "1"),
    tag("review_enabled", "=", "1"),
    tag("review_needed", "=", "1"),
    tag("skip_daily_slot", "!=", fullSlot),
    tag("review_due_3_slot", "=", fullSlot)
  ])
]);
