const { getData } = require("../CRUD/Read/ReadData");
const { insertData } = require("../CRUD/Create/CreateData");
const { updateData } = require("../CRUD/Update/Data.update");
const deleteData = require("../CRUD/Delete/DeleteData");
const { currentDate } = require("../Utils/CurrentDate");
const AppError = require("../Utils/AppError");
const logger = require("../Utils/logger");

const normalizePhoneNumberForTelegramLink = (raw) => {
  if (raw === null || raw === undefined) {
    return null;
  }
  let s = String(raw).trim();
  if (!s) {
    return null;
  }

  // Remove surrounding quotes and whitespace
  s = s.replace(/^"+|"+$/g, "").trim();

  // Telegram deep-link payloads often arrive without '+'
  // Accept formats: +251..., 251..., 00251..., etc.
  if (s.startsWith("00")) {
    s = `+${s.slice(2)}`;
  } else if (!s.startsWith("+") && /^\d+$/.test(s)) {
    s = `+${s}`;
  }

  // Remove spaces inside (defensive)
  s = s.replace(/\s+/g, "");

  // Basic sanity check (E.164-ish): + + digits, min length 8
  if (!/^\+\d{8,20}$/.test(s)) {
    return null;
  }
  return s;
};

const savePendingTelegramLink = async ({ phoneNumber, telegramChatId }) => {
  const normalizedPhone = normalizePhoneNumberForTelegramLink(phoneNumber);
  const chatId =
    telegramChatId !== null && telegramChatId !== undefined ? String(telegramChatId).trim() : null;

  if (!normalizedPhone) {
    throw new AppError("Invalid phoneNumber", 400);
  }
  if (!chatId) {
    throw new AppError("Invalid telegramChatId", 400);
  }

  // Upsert by phoneNumber (unique)
  const existing = await getData({
    tableName: "PendingTelegramLink",
    conditions: { phoneNumber: normalizedPhone },
    limit: 1,
  });

  if (existing?.length) {
    await updateData({
      tableName: "PendingTelegramLink",
      conditions: { phoneNumber: normalizedPhone },
      updateValues: { telegramChatId: chatId, createdAt: currentDate() },
    });
  } else {
    await insertData({
      tableName: "PendingTelegramLink",
      colAndVal: {
        phoneNumber: normalizedPhone,
        telegramChatId: chatId,
        createdAt: currentDate(),
      },
    });
  }

  logger.info("PendingTelegramLink saved", {
    phoneNumber: normalizedPhone,
    telegramChatIdPrefix: chatId.slice(0, 4) + "…",
  });

  return { message: "success" };
};

const consumePendingTelegramChatId = async ({ phoneNumber }) => {
  const normalizedPhone = normalizePhoneNumberForTelegramLink(phoneNumber);
  if (!normalizedPhone) {
    throw new AppError("Invalid phoneNumber", 400);
  }

  const rows = await getData({
    tableName: "PendingTelegramLink",
    conditions: { phoneNumber: normalizedPhone },
    limit: 1,
  });

  if (!rows?.length) {
    throw new AppError("Pending telegram link not found", 404);
  }

  // One-time consume
  await deleteData({
    tableName: "PendingTelegramLink",
    conditions: { phoneNumber: normalizedPhone },
  });

  const telegramChatId = rows[0]?.telegramChatId
    ? String(rows[0].telegramChatId).trim()
    : null;

  return { message: "success", telegramChatId };
};

module.exports = {
  normalizePhoneNumberForTelegramLink,
  savePendingTelegramLink,
  consumePendingTelegramChatId,
};

