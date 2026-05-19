import os
import logging
import base64
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, CommandHandler, filters, ContextTypes
from groq import Groq

logging.basicConfig(level=logging.INFO)

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

client = Groq(api_key=GROQ_API_KEY)
chat_histories = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Assalomu alaykum! 👋 Men sun'iy intellekt yordamchisiman 🧠\n\n"
        "Savolingizni bering, javob beraman!"
    )

async def reset(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_histories[update.effective_user.id] = []
    await update.message.reply_text("Suhbat tozalandi! 🔄")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    text = update.message.text
    
    religious = ["namoz","quron","hadis","islom","halol","haram","zakot","roza","haj"]
    if any(w in text.lower() for w in religious):
        await update.message.reply_text("Diniy savollar uchun (1171) ga qo'ng'iroq qiling 📞")
        return
    
    if user_id not in chat_histories:
        chat_histories[user_id] = []
    
    chat_histories[user_id].append({"role": "user", "content": text})
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a helpful AI assistant. Never use markdown formatting like **, ##, $$. Use only plain text and emojis. Respond in the same language the user writes in."}
        ] + chat_histories[user_id][-10:]
    )
    
    reply = response.choices[0].message.content
    chat_histories[user_id].append({"role": "assistant", "content": reply})
    await update.message.reply_text(reply)

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Rasm qabul qilindi, tahlil qilyapman... ⏳")
    
    photo = update.message.photo[-1]
    file = await context.bot.get_file(photo.file_id)
    file_bytes = await file.download_as_bytearray()
    image_data = base64.b64encode(file_bytes).decode('utf-8')
    
    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_data}"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Ushbu rasmdagi barcha matnlarni o'qi. Agar matn bo'lsa, avval asl matnni yoz, keyin o'zbek tiliga tarjima qil. Agar matn bo'lmasa, rasmni tasvirla."
                    }
                ]
            }
        ]
    )
    
    reply = response.choices[0].message.content
    await update.message.reply_text(reply)

app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
app.add_handler(CommandHandler("start", start))
app.add_handler(CommandHandler("reset", reset))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
app.run_polling()
