import { DB } from "./db.js";
import { StateManager } from "./state.js";
import { TelegramAPI, mainKeyboard } from "./telegram.js";
import {
  ONBOARD_EMOJI, ONBOARD_CHANNELS, ONBOARD_COMMENT, ONBOARD_SCREENSHOT,
} from "./config.js";
import {
  handleStart, handleVerifyCommand,
  cbEmoji, cbVerifyChannels, cbCommentDone, handleScreenshot,
} from "./handlers/onboarding.js";
import {
  handleBalance, handleRefer, handleMine, handleProfile,
  handleWithdrawal, tgeJoinPrompt, presaleJoinPrompt,
} from "./handlers/user.js";
import {
  handleAdmin, handlePendingTge, handlePendingPresale,
  handleWithdrawals, handleDistribution, handleSettings,
  handleAnnounce, handleMainMenu, handleAdminText, isAdmin,
} from "./handlers/admin.js";
import {
  cbJoinTge, cbVerifyTge, cbJoinPresale, cbVerifyPresale, cbPasteHash,
  cbAdmTgeApprove, cbAdmTgeReject, cbAdmPresaleApprove, cbAdmPresaleReject,
  cbAdmWdApprove, cbAdmWdReject,
  cbSetRefer, cbSetMine, cbSetWd, cbSetUrl,
} from "./handlers/callbacks.js";
import { verifyByHash } from "./oxapay.js";

function textMatches(text, ...keywords) {
  const t = text.toLowerCase();
  return keywords.some(kw => t.includes(kw));
}

export class Router {
  constructor(env) {
    this.env   = env;
    this.tg    = new TelegramAPI(env.BOT_TOKEN);
    this.db    = new DB(env.DB);
    this.state = new StateManager(env.BOT_STATE);
  }

  get ctx() {
    return { tg: this.tg, db: this.db, state: this.state, env: this.env };
  }

  async handle(update) {
    try {
      if (update.callback_query) {
        await this.handleCallback(update);
      } else if (update.message) {
        await this.handleMessage(update);
      }
    } catch (err) {
      console.error("Router error:", err);
    }
  }

  async handleCallback(update) {
    const data = update.callback_query.data;

    if (data.startsWith("ob_emoji_"))       return cbEmoji(update, this.ctx);
    if (data === "ob_verify_ch")            return cbVerifyChannels(update, this.ctx);
    if (data === "ob_comment_done")         return cbCommentDone(update, this.ctx);
    if (data === "wd_join_tge")             return cbJoinTge(update, this.ctx);
    if (data.startsWith("wd_verify_tge_")) return cbVerifyTge(update, this.ctx);
    if (data === "wd_join_presale")         return cbJoinPresale(update, this.ctx);
    if (data.startsWith("wd_verify_presale_")) return cbVerifyPresale(update, this.ctx);
    if (data.startsWith("wd_paste_hash_")) return cbPasteHash(update, this.ctx);
    if (data.startsWith("adm_tge_ok_"))    return cbAdmTgeApprove(update, this.ctx);
    if (data.startsWith("adm_tge_no_"))    return cbAdmTgeReject(update, this.ctx);
    if (data.startsWith("adm_psl_ok_"))    return cbAdmPresaleApprove(update, this.ctx);
    if (data.startsWith("adm_psl_no_"))    return cbAdmPresaleReject(update, this.ctx);
    if (data.startsWith("adm_wd_ok_"))     return cbAdmWdApprove(update, this.ctx);
    if (data.startsWith("adm_wd_no_"))     return cbAdmWdReject(update, this.ctx);
    if (data === "adm_set_refer")           return cbSetRefer(update, this.ctx);
    if (data === "adm_set_mine")            return cbSetMine(update, this.ctx);
    if (data === "adm_set_wd")             return cbSetWd(update, this.ctx);
    if (data === "adm_set_url")            return cbSetUrl(update, this.ctx);
  }

  async handleMessage(update) {
    const { tg, db, state } = this.ctx;
    const msg    = update.message;
    const user   = msg.from;
    const chatId = msg.chat.id;
    const text   = msg.text || "";

    // Commands
    if (text.startsWith("/start"))   return handleStart(update, this.ctx);
    if (text.startsWith("/verify"))  return handleVerifyCommand(update, this.ctx);
    if (text.startsWith("/admin"))   return handleAdmin(update, this.ctx);
    if (text.startsWith("/tge"))     { const ud = await db.getUser(user.id); if (ud && ud.verified) await tgeJoinPrompt(chatId, user.id, this.ctx); return; }
    if (text.startsWith("/presale")) { const ud = await db.getUser(user.id); if (ud && ud.verified) await presaleJoinPrompt(chatId, user.id, this.ctx); return; }

    // Conversation state
    const step = await state.getStep(user.id);
    if (step === ONBOARD_SCREENSHOT && msg.photo) {
      return handleScreenshot(update, this.ctx);
    }
    if (step === ONBOARD_SCREENSHOT && !msg.photo) {
      await tg.sendMessage(chatId, "❌ Please send a photo screenshot.");
      return;
    }

    // User data state (awaiting BNB or hash)
    const userData = await state.getUserData(user.id);

    if (userData.awaiting_bnb) {
      const info     = userData.awaiting_bnb;
      const bnb      = text.trim();
      await state.remove(user.id, "awaiting_bnb");

      if (!(bnb.startsWith("0x") && bnb.length === 42)) {
        await tg.sendMessage(
          chatId,
          "❌ That doesn't look like a valid BNB (BEP-20) address.\nIt should start with `0x` and be 42 characters long.\n\nPlease send a valid address:"
        );
        await state.set(user.id, "awaiting_bnb", info);
        return;
      }

      await db.createWithdrawal(user.id, info.type, info.amount_gtc, info.amount_usdt, bnb);
      if (info.type === "presale") await db.deductBalance(user.id, info.amount_gtc);

      try {
        const { gtcUsdt } = await import("./handlers/user.js");
        await tg.sendMessage(
          parseInt(this.env.ADMIN_ID, 10),
          `💸 *New Withdrawal Request*\n\n` +
          `User: @${user.username || user.first_name}\n` +
          `ID: \`${user.id}\`\n` +
          `Type: ${info.type.toUpperCase()}\n` +
          `Amount: \`${Math.round(info.amount_gtc).toLocaleString()} GTC\` ≈ \`$${(info.amount_gtc * 0.06).toFixed(2)} USDT\`\n` +
          `BNB Address:\n\`${bnb}\`\n\n` +
          `${info.type === "presale" ? "⚡ Balance deducted (presale)" : "⏳ Balance pending (TGE — deduct on approval)"}`
        );
      } catch (_) {}

      const msg2 = info.type === "presale"
        ? "Your balance has been updated. Admin will send to your BNB address shortly."
        : "Admin will review and send to your BNB address. You'll be notified.";
      await tg.sendMessage(
        chatId,
        `✅ *Withdrawal Request Submitted!*\n\nAmount: \`${Math.round(info.amount_gtc).toLocaleString()} GTC\`\nBNB Address: \`${bnb}\`\n\n${msg2}`,
        { reply_markup: mainKeyboard() }
      );
      return;
    }

    if (userData.awaiting_hash) {
      await state.remove(user.id, "awaiting_hash");
      const hash = text.trim();
      const req  = await db.getUserPresaleRequest(user.id);
      if (req) await db.updatePresaleRequestHash(req.id, hash);
      const result = await verifyByHash(this.env.OXAPAY_API_KEY, hash);
      try {
        await tg.sendMessage(
          parseInt(this.env.ADMIN_ID, 10),
          `📋 *TX Hash Submitted*\n\nUser: @${user.username || user.first_name}\n` +
          `ID: \`${user.id}\`\nHash: \`${hash}\`\n` +
          `API: ${result.paid ? "✅ Verified" : "⏳ Pending"}`
        );
      } catch (_) {}
      await tg.sendMessage(
        chatId,
        `${result.paid ? "✅ Hash verified!" : "📤 Hash submitted!"}\n\nAdmin will confirm your presale. You'll be notified.`,
        { reply_markup: mainKeyboard() }
      );
      return;
    }

    // Admin input
    if (isAdmin(user.id, this.env)) {
      const adminAwait = userData.admin_await;
      if (adminAwait) return handleAdminText(update, this.ctx, adminAwait);

      if (text === "📋 Pending TGE")     return handlePendingTge(update, this.ctx);
      if (text === "📋 Pending Presale") return handlePendingPresale(update, this.ctx);
      if (text === "💸 Withdrawals")     return handleWithdrawals(update, this.ctx);
      if (text === "📢 Announce")        return handleAnnounce(update, this.ctx);
      if (text === "📊 Distribution")    return handleDistribution(update, this.ctx);
      if (text === "⚙️ Settings")        return handleSettings(update, this.ctx);
      if (text === "🏠 Main Menu")       return handleMainMenu(update, this.ctx);
      if (textMatches(text, "pending tge"))     return handlePendingTge(update, this.ctx);
      if (textMatches(text, "pending presale")) return handlePendingPresale(update, this.ctx);
      if (textMatches(text, "withdrawal", "pending wd")) return handleWithdrawals(update, this.ctx);
      if (textMatches(text, "distribution", "stats"))    return handleDistribution(update, this.ctx);
      if (textMatches(text, "settings", "setting"))      return handleSettings(update, this.ctx);
      if (textMatches(text, "announce", "broadcast"))    return handleAnnounce(update, this.ctx);
      if (textMatches(text, "main menu", "home"))        return handleMainMenu(update, this.ctx);
    }

    // User keyboard buttons
    if (text === "💰 Balance")   return handleBalance(update, this.ctx);
    if (text === "👥 Refer")     return handleRefer(update, this.ctx);
    if (text === "⛏️ Mine")      return handleMine(update, this.ctx);
    if (text === "💸 Withdrawal") return handleWithdrawal(update, this.ctx);
    if (text === "👤 Profile")   return handleProfile(update, this.ctx);

    // Text shortcuts
    if (textMatches(text, "balance", "my balance", "coins"))       return handleBalance(update, this.ctx);
    if (textMatches(text, "mine", "mining", "daily"))              return handleMine(update, this.ctx);
    if (textMatches(text, "refer", "invite", "friend", "referral")) return handleRefer(update, this.ctx);
    if (textMatches(text, "withdraw", "withdrawal", "cash out"))   return handleWithdrawal(update, this.ctx);
    if (textMatches(text, "profile", "my profile", "account"))     return handleProfile(update, this.ctx);

    // Fallback
    const ud = await db.getUser(user.id);
    if (ud && ud.verified) {
      await tg.sendMessage(chatId, "Use the menu buttons or type: balance, mine, refer, withdraw, profile", { reply_markup: mainKeyboard() });
    } else {
      await tg.sendMessage(chatId, "Send /start to register or /verify to check your status.");
    }
  }
}
