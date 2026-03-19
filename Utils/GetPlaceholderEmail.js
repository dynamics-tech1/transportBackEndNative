"use strict";

/**
 * Generates a consistent placeholder email for users who do not provide one.
 * Used to satisfy database NOT NULL constraints while maintaining unique identity.
 * 
 * @param {string} phoneNumber - The user's phone number.
 * @returns {string} The generated placeholder email.
 */
const getPlaceholderEmail = (phoneNumber) => {
  if (!phoneNumber) return null;
  const cleanPhone = String(phoneNumber).trim().replace(/\+/g, "");
  return `${cleanPhone}@dynamics.com`;
};

module.exports = getPlaceholderEmail;
