import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const apiKey =
  process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ??
  process.env["OPENAI_API_KEY"];
const baseURL = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY (or AI_INTEGRATIONS_OPENAI_API_KEY) is required",
  );
}

const openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });

const token = process.env["TELEGRAM_BOT_TOKEN"];
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

export const bot = new TelegramBot(token, { polling: true });

const RELIGIOUS_KEYWORDS = [
  "namoz", "qur'on", "quron", "hadis", "islom", "alloh", "muhammad", "hijob",
  "namaz", "salat", "zakat", "hajj", "umra", "tasbeh", "takbir", "janoza",
  "din", "muslim", "muslima", "imom", "masjid", "halol", "harom", "fatvo",
];

const conversationHistory: Map<number, Array<{ role: "user" | "assistant" | "system"; content: string }>> = new Map();

function getHistory(chatId: number) {
  if (!conversationHistory.has(chatId)) {
    conversationHistory.set(chatId, [
      {
        role: "system",
        content: `Sen Ziyod - aqlli, do'stona va universal AI yordamchisisiz. ChatGPT kabi ishlaysan.

QOIDALAR (HECH QACHON BUZMA):
1. Faqat oddiy matn yoz - hech qanday markdown yo'q: **, ##, *, _, \`kabi belgilar ishlatma
2. Matematik formulalar uchun ham oddiy matn yoz: x*2+3 emas 2x+3 yoz, "ko'paytirishda" deb yoz
3. Manbalar va havolalar qo'shma - faqat agar foydalanuvchi "manba ko'rsat" yoki "qayerdan oldingiz" deb so'rasa
4. Diniy mavzular (namoz, quron, hadis, islom) bo'yicha savol kelsa: "Diniy savollar uchun (1171) ga qo'ng'iroq qiling 📞" deb javob ber va boshqa hech narsa aytma
5. Har qanday mavzuda javob ber: matematika, fan, tarix, oshpazlik, hazil, sport va boshqalar
6. Suhbat tarixini eslab tur va tabiiy davom ettir
7. Uzbek tilida gapir, lekin foydalanuvchi boshqa tilda yozsa, o'sha tilda javob ber
8. Emojidan foydalansang bo'ladi, lekin kamroq
9. islom.uz yoki boshqa saytlardan qidirma va keltirma`,
      },
    ]);
  }
  return conversationHistory.get(chatId)!;
}

function isReligious(text: string): boolean {
  const lower = text.toLowerCase();
  return RELIGIOUS_KEYWORDS.some((kw) => lower.includes(kw));
}

async function sendTyping(chatId: number) {
  try {
    await bot.sendChatAction(chatId, "typing");
  } catch {}
}

async function askAI(chatId: number, userMessage: string): Promise<string> {
  const history = getHistory(chatId);
  history.push({ role: "user", content: userMessage });

  const maxHistory = 20;
  const systemMsg = history[0];
  const recent = history.slice(1);
  const trimmed = recent.length > maxHistory ? recent.slice(recent.length - maxHistory) : recent;
  const messages = [systemMsg, ...trimmed];

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 2048,
    messages,
  });

  const reply = response.choices[0]?.message?.content ?? "Kechirasiz, javob bera olmadim.";
  history.push({ role: "assistant", content: reply });
  return reply;
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  getHistory(chatId);
  await bot.sendMessage(
    chatId,
    `Salom! 👋 Men Ziyod - sun'iy intellekt yordamchiman.

Menga istalgan savol bering: matematika, fan, tarix, oshpazlik, kodlash, tarjima, maslahat va boshqa ko'p narsalar.

Buyruqlar:
/imkoniyatlar - nima qila olishim
/viktorina - bilim testi
/latifa - kulgili hazil
/kurs - valyuta kurslari
/bugun - bugungi sana
/togirla - matnni to'g'rilash
/rezyume - rezyume yaratish
/xat - rasmiy xat
/goya - biznes g'oya
/reset - suhbatni yangilash`,
  );
});

bot.onText(/\/imkoniyatlar/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `Men quyidagilarda yordam bera olaman:

Matematika va fizika masalalari
Tarix, geografiya, fan savollari
Dasturlash va kod yozish
Matn tarjima qilish
Rezyume va xat yozish
Biznes g'oyalar berish
Retsept va oshpazlik maslahat
Hazil va o'yin-kulgi
Valyuta kurslari
Va boshqa istalgan mavzu!

Faqat yozing - javob beraman 😊`,
  );
});

bot.onText(/\/reset/, async (msg) => {
  const chatId = msg.chat.id;
  conversationHistory.delete(chatId);
  getHistory(chatId);
  await bot.sendMessage(chatId, "Suhbat yangilandi. Boshidan boshlaylik! 🔄");
});

bot.onText(/\/bugun/, async (msg) => {
  const now = new Date();
  const days = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  await bot.sendMessage(
    msg.chat.id,
    `Bugun: ${dayName}, ${now.getDate()} ${monthName} ${now.getFullYear()} 📅\nVaqt: ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} (UTC)`,
  );
});

bot.onText(/\/viktorina/, async (msg) => {
  const chatId = msg.chat.id;
  await sendTyping(chatId);
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 300,
      messages: [
        {
          role: "user",
          content: "Menga qiziqarli bir viktorina savoli ber (fan, tarix, sport yoki san'at haqida). Savolni yoz, keyin 'Javob:' deb javobni yoz. Markdown ishlatma.",
        },
      ],
    });
    await bot.sendMessage(chatId, result.choices[0]?.message?.content ?? "Savol yaratib bo'lmadi.");
  } catch (e) {
    logger.error(e, "viktorina error");
    await bot.sendMessage(chatId, "Hozir viktorina yuklay olmadim, keyinroq urining.");
  }
});

bot.onText(/\/latifa/, async (msg) => {
  const chatId = msg.chat.id;
  await sendTyping(chatId);
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 200,
      messages: [
        {
          role: "user",
          content: "Menga o'zbek tilida kulgili, aqlli va odobli bir latifa ayt. Markdown ishlatma.",
        },
      ],
    });
    await bot.sendMessage(chatId, result.choices[0]?.message?.content ?? "Latifa topib bo'lmadi 😅");
  } catch (e) {
    logger.error(e, "latifa error");
    await bot.sendMessage(chatId, "Hozir latifa topa olmadim 😅");
  }
});

bot.onText(/\/kurs/, async (msg) => {
  const chatId = msg.chat.id;
  await sendTyping(chatId);
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 300,
      messages: [
        {
          role: "user",
          content: "O'zbekiston Markaziy banki rasmiy valyuta kurslari haqida ma'lumot ber (taxminiy). USD, EUR, RUB kurslarini o'zbek so'mida ko'rsat. Markdown ishlatma. Faqat taxminiy kurs ekanini ayt.",
        },
      ],
    });
    await bot.sendMessage(chatId, result.choices[0]?.message?.content ?? "Kurs ma'lumotini olib bo'lmadi.");
  } catch (e) {
    logger.error(e, "kurs error");
    await bot.sendMessage(chatId, "Kursni hozir aniqlab bo'lmadi.");
  }
});

bot.onText(/\/togirla (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match?.[1];
  if (!text) {
    await bot.sendMessage(chatId, "Matnni yozing: /togirla [matn]");
    return;
  }
  await sendTyping(chatId);
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Quyidagi o'zbek matnidagi imlo va grammatika xatolarini to'g'irla. To'g'irlangan matnni bering, keyin qanday xatolar to'g'irlandi deb qisqacha tushuntir. Markdown ishlatma.\n\nMatn: ${text}`,
        },
      ],
    });
    await bot.sendMessage(chatId, result.choices[0]?.message?.content ?? "Matnni to'g'irlab bo'lmadi.");
  } catch (e) {
    logger.error(e, "togirla error");
    await bot.sendMessage(chatId, "Matnni to'g'irlab bo'lmadi.");
  }
});

bot.onText(/\/rezyume/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "Rezyume uchun menga quyidagilarni yuboring:\n\nIsm familiya, yosh, kasb, tajriba (yillar), ko'nikmalar, ta'lim, aloqa ma'lumotlari.\n\nHammasi yozilgandan so'ng rezyume tayyorlayman.",
  );
  getHistory(chatId).push({
    role: "assistant",
    content: "Foydalanuvchi rezyume yaratish so'radi. Ular ma'lumot yuborganidan keyin professional rezyume tayyorla. Markdown ishlatma.",
  });
});

bot.onText(/\/xat/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "Rasmiy xat uchun:\n\nKimga, qanday mavzuda va asosiy fikrlarni yozing - xatni tayyorlayman.",
  );
  getHistory(chatId).push({
    role: "assistant",
    content: "Foydalanuvchi rasmiy xat yozish so'radi. Ular mavzu berganida professional rasmiy xat yoz. Markdown ishlatma.",
  });
});

bot.onText(/\/goya/, async (msg) => {
  const chatId = msg.chat.id;
  await sendTyping(chatId);
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 400,
      messages: [
        {
          role: "user",
          content: "O'zbekistonda amalga oshirish mumkin bo'lgan yangi va qiziqarli biznes g'oyasi ber. Nega foydali ekanini va boshlash uchun birinchi qadamlarni tushuntir. Markdown ishlatma.",
        },
      ],
    });
    await bot.sendMessage(chatId, result.choices[0]?.message?.content ?? "G'oya topa olmadim.");
  } catch (e) {
    logger.error(e, "goya error");
    await bot.sendMessage(chatId, "Hozir g'oya bera olmadim.");
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  if (isReligious(text)) {
    await bot.sendMessage(chatId, "Diniy savollar uchun (1171) ga qo'ng'iroq qiling 📞");
    return;
  }

  await sendTyping(chatId);

  try {
    const reply = await askAI(chatId, text);
    await bot.sendMessage(chatId, reply);
  } catch (e) {
    logger.error(e, "AI reply error");
    await bot.sendMessage(chatId, "Kechirasiz, hozir javob bera olmadim. Qayta urinib ko'ring.");
  }
});

bot.on("polling_error", (err) => {
  logger.error(err, "Telegram polling error");
});

logger.info("Telegram bot started");
