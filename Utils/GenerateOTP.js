/**
 * Generates a random 6-digit numeric OTP.
 * @returns {number} A 6-digit number between 100000 and 999999.
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

module.exports = generateOTP;
