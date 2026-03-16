const axios = require("axios");
 const jwt = require("jsonwebtoken");
 const logger = require("./logger");

/**
 * Formats a phone number for SantimPay requirements (+2519...).
 * @param {string} phoneNumber - The raw phone number string.
 * @returns {string|null} - The formatted phone number or null if invalid/empty.
 */
const formatPhoneNumberForSantim = (phoneNumber) => {
  if (!phoneNumber) {
    return null;
  }

  // Remove all non-digit characters
  let clean = phoneNumber.replace(/\D/g, "");

  // Handle various formats:
  // 0912345678 -> +251912345678
  // 251912345678 -> +251912345678
  // 912345678 -> +251912345678

  if (clean.startsWith("0")) {
    clean = clean.substring(1);
  }

  if (clean.startsWith("251")) {
    clean = clean.substring(3);
  }

  // Ensure it's now a 9-digit number starting with 9 or 7 (Ethiopian mobile standards)
  if (clean.length === 9) {
    return `+251${clean}`;
  }

  // If we can't reliably format it, return original cleaned string as a fallback but logged
  logger.warn("Could not reliably format phone number for SantimPay", {
    original: phoneNumber,
    cleaned: clean,
  });
  return `+${clean}`;
};

/**
 * Sign payload with ES256 algorithm
 */
function signES256(payload, privateKey) {
  // SantimPay requires the payload to be a stringified JSON object before signing
  const stringifiedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return jwt.sign(stringifiedPayload, privateKey, { algorithm: "ES256" });
}

/**
 * Initialize SantimPay SDK instance
 */
function getSantimPayClient() {
  const merchantId = process.env.SANTIMPAY_MERCHANT_ID;
  const privateKey = process.env.SANTIMPAY_PRIVATE_KEY;
  const baseUrl = process.env.SANTIMPAY_BASE_URL;

  if (!merchantId || !privateKey || !baseUrl) {
    throw new Error(
      "SANTIMPAY_MERCHANT_ID and SANTIMPAY_PRIVATE_KEY and SANTIMPAY_BASE_URL are required",
    );
  }

  // Handle literal backticks or quotes and ensure proper PEM formatting
  const formattedPrivateKey = privateKey.replace(/[`"]/g, "").trim();

  return {
    merchantId,
    privateKey: formattedPrivateKey,
    baseUrl,
  };
}

/**
 * Generate signed token for initiate payment
 */
function generateSignedTokenForInitiatePayment(amount, reason, client) {
  const payload = {
    amount: parseFloat(amount),
    paymentReason: reason,
    merchantId: client.merchantId,
    generated: Math.floor(Date.now() / 1000),
  };
  return signES256(payload, client.privateKey);
}

/**
 * Generate signed token for get transaction
 */
function generateSignedTokenForGetTransaction(id, client) {
  const time = Math.floor(Date.now() / 1000);
  const payload = {
    id,
    merId: client.merchantId,
    generated: time,
  };
  return signES256(payload, client.privateKey);
}

// this is generate the payment url
async function generatePaymentUrl(id, amount, paymentReason, phoneNumber = "") {
  try {
    const client = getSantimPayClient();
    const successRedirectUrl = process.env.SANTIMPAY_SUCCESS_REDIRECT_URL;
    const failureRedirectUrl = process.env.SANTIMPAY_FAILURE_REDIRECT_URL;
    const cancelRedirectUrl = process.env.SANTIMPAY_CANCEL_REDIRECT_URL;
    const notifyUrl = process.env.SANTIMPAY_WEBHOOK_URL;

    if (
      !successRedirectUrl ||
      !failureRedirectUrl ||
      !notifyUrl ||
      !cancelRedirectUrl
    ) {
      throw new Error(
        "SANTIMPAY_SUCCESS_REDIRECT_URL,SANTIMPAY_FAILURE_REDIRECT_URL,SANTIMPAY_CANCEL_REDIRECT_URL, and SANTIMPAY_WEBHOOK_URL are required",
      );
    }

    const token = generateSignedTokenForInitiatePayment(
      amount,
      paymentReason,
      client,
    );
logger.info("Generated Token:", token); 
    const payload = {
      id,
      amount: parseFloat(amount),
      reason: paymentReason,
      merchantId: client.merchantId,
      signedToken: token,
      successRedirectUrl,
      failureRedirectUrl,
      notifyUrl,
      cancelRedirectUrl,
    };

    if (phoneNumber) {
      const formattedPhone = formatPhoneNumberForSantim(phoneNumber);
      if (formattedPhone) {
        payload.phoneNumber = formattedPhone;
      }
    }

    const response = await axios.post(
      `${client.baseUrl}/initiate-payment`,
      payload,
    );

    if (response.status === 200 && response.data.url) {
      return response.data.url;
    } else {
      throw new Error("Failed to initiate payment: Invalid response");
    }
  } catch (error) {
    logger.error("Error generating payment url", {
      message: error.message,
      response: error?.response?.data,
      code: error.code,
    });
    if (error?.response && error?.response?.data) {
      throw error?.response?.data;
    }
    throw error;
  }
}

async function checkTransactionStatus(id) {
  try {
    const client = getSantimPayClient();
    const token = generateSignedTokenForGetTransaction(id, client);

    const response = await axios.post(
      `${client.baseUrl}/fetch-transaction-status`,
      {
        id,
        merchantId: client.merchantId,
        signedToken: token,
      },
    );

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error("Failed to check transaction status");
    }
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
}

module.exports = {
  generatePaymentUrl,
  checkTransactionStatus,
  getSantimPayClient, // Exported for testing
  signES256,          // Exported for testing
};
