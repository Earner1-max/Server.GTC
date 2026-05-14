export class TelegramAPI {
  constructor(token) {
    this.token = token;
    this.base = `https://api.telegram.org/bot${token}`;
  }

  async call(method, params) {
    const resp = await fetch(`${this.base}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return resp.json();
  }

  sendMessage(chatId, text, extra = {}) {
    return this.call("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown", ...extra });
  }

  sendPhoto(chatId, photo, caption, extra = {}) {
    return this.call("sendPhoto", { chat_id: chatId, photo, caption, parse_mode: "Markdown", ...extra });
  }

  editMessageText(chatId, messageId, text, extra = {}) {
    return this.call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "Markdown", ...extra });
  }

  editMessageCaption(chatId, messageId, caption, extra = {}) {
    return this.call("editMessageCaption", { chat_id: chatId, message_id: messageId, caption, parse_mode: "Markdown", ...extra });
  }

  editMessageReplyMarkup(chatId, messageId, replyMarkup) {
    return this.call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup });
  }

  answerCallbackQuery(queryId, extra = {}) {
    return this.call("answerCallbackQuery", { callback_query_id: queryId, ...extra });
  }

  getChatMember(chatId, userId) {
    return this.call("getChatMember", { chat_id: chatId, user_id: userId });
  }

  getMe() {
    return this.call("getMe", {});
  }

  setWebhook(url) {
    return this.call("setWebhook", { url, drop_pending_updates: true });
  }
}

export function mainKeyboard() {
  return {
    keyboard: [
      ["💰 Balance", "👥 Refer"],
      ["⛏️ Mine",    "💸 Withdrawal"],
      ["👤 Profile"],
    ],
    resize_keyboard: true,
  };
}

export function adminKeyboard() {
  return {
    keyboard: [
      ["📋 Pending TGE",  "📋 Pending Presale"],
      ["💸 Withdrawals",  "📢 Announce"],
      ["📊 Distribution", "⚙️ Settings"],
      ["🏠 Main Menu"],
    ],
    resize_keyboard: true,
  };
}

export function removeKeyboard() {
  return { remove_keyboard: true };
}

export function inlineKeyboard(rows) {
  return { inline_keyboard: rows };
}

export function qrCodeUrl(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
}

export function formatDate(unixTs) {
  return new Date(unixTs * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
