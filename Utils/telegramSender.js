const axios = require("axios");
const logger = require("./logger");

/**
 * Send OTP (or any message) to a Telegram chat via Bot API.
 * Configure with env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
 * Optional: TELEGRAM_OTP_TEMPLATE with #OTP# and #PHONE# placeholders (default: "OTP for #PHONE#: #OTP#").
 * If token or chat_id is not set, returns without sending (no error).
 *
 * @param {string} phoneNumber - Phone number (e.g. for display in message)
 * @param {string|number} otp - OTP code to send
 * @param {{ userChatId?: string }=} options - Optional per-user chat_id override
 * @returns {Promise<{ message: string, status?: string }>}
 */
const sendTelegramOtp = async (phoneNumber, otp, options = {}) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const overrideChatId =
    options?.userChatId !== null && options?.userChatId !== undefined ? String(options.userChatId).trim() : "";
  const chatId =
    overrideChatId && overrideChatId.length > 0
      ? overrideChatId
      : process.env.TELEGRAM_CHAT_ID;
  const template =
    process.env.TELEGRAM_OTP_TEMPLATE || "OTP for #PHONE#: #OTP#";

  if (!token || !chatId || !chatId.trim()) {
    logger.info("sendTelegramOtp: skipped (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set)", {
      hasToken: !!token,
      hasChatId: !!(chatId && String(chatId).trim()),
      usedOverrideChatId: !!overrideChatId,
    });
    return { message: "skipped", status: "telegram_not_configured" };
  }

  const otpString = String(otp);
  const phone = phoneNumber || "—";
  const text = template
    .replace(/#OTP#/g, otpString)
    .replace(/#PHONE#/g, phone);

  logger.info("sendTelegramOtp: sending", {
    phoneNumber: phone,
    chatId: chatId.trim().slice(0, 4) + "…",
    usedOverrideChatId: !!overrideChatId,
    textLength: text.length,
  });

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await axios.post(
      url,
      { chat_id: String(chatId).trim(), text },
      { timeout: 15000 },
    );

    if (response.data?.ok) {
      logger.info("sendTelegramOtp: success", {
        phoneNumber: phone,
        messageId: response.data?.result?.message_id,
      });
      return { message: "success", status: "success" };
    }
    logger.warn("sendTelegramOtp: Telegram API returned not ok", {
      phoneNumber: phone,
      response: response.data,
    });
    return { message: "telegram_send_failed", status: "error" };
  } catch (error) {
    logger.warn("sendTelegramOtp: send failed", {
      phoneNumber: phone,
      error: error.message,
      response: error.response?.data,
    });
    return { message: "telegram_send_failed", status: "error" };
  }
};

module.exports = {
  sendTelegramOtp,
};
