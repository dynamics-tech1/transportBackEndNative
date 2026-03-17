/**
 * Utility for generating standardized and professional messages for SMS and Email.
 */

const getOtpMessage = (otp, type = "login") => {
  const brand = "Dynamics Transport";
  const action = type === "registration" ? "account registration" : "secure login";
  const supportPhone = "+251983222221";
  const supportPhoneClean = supportPhone.replace(/\+/g, "");
  const whatsappLink = `https://wa.me/${supportPhoneClean}`;
  const telegramLink = `https://t.me/${supportPhone}`;
  
  // Icon URLs (Common CDNs)
  const whatsappIcon = "https://cdn-icons-png.flaticon.com/512/733/733585.png";
  const telegramIcon = "https://cdn-icons-png.flaticon.com/512/2111/2111646.png";
  
  return {
    sms: `Your ${brand} OTP for ${action} is: ${otp}. Valid for 10 minutes. Do not share this code.`,
    emailSubject: `${otp} is your ${brand} verification code`,
    emailHtml: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <img src="cid:dynamics_logo" alt="${brand}" style="width: 100px; height: auto; margin-bottom: 5px;" />
          <h1 style="color: #2c3e50; margin: 0; font-size: 24px;">${brand}</h1>
        </div>
        
        <div style="background-color: #f8fbff; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #edf2f7;">
          <p style="font-size: 16px; color: #4a5568; margin-bottom: 20px;">Use the verification code below for your <strong>${action}</strong>:</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2b6cb0; margin: 20px 0; padding: 15px; background: #ffffff; border-radius: 8px; display: inline-block; border: 2px dashed #cbd5e0;">${otp}</div>
          <p style="font-size: 14px; color: #718096; margin-top: 20px;">Safe & Secure: This code will expire in 10 minutes.</p>
        </div>

        <div style="margin-top: 35px; background-color: #f7fafc; padding: 25px; border-radius: 10px; text-align: center;">
          <p style="font-size: 15px; color: #2d3748; margin-bottom: 10px; font-weight: 600;">We'd love to hear from you!</p>
          <p style="font-size: 14px; color: #4a5568; margin-bottom: 15px; line-height: 1.5;">Have feedback, comments, or a new idea? Contact us directly:</p>
          <div style="margin-bottom: 20px;">
            <a href="${whatsappLink}" style="text-decoration: none; margin: 0 15px; display: inline-block;">
              <img src="${whatsappIcon}" alt="WhatsApp" style="width: 32px; height: 32px; vertical-align: middle;" />
            </a>
            <a href="${telegramLink}" style="text-decoration: none; margin: 0 15px; display: inline-block;">
              <img src="${telegramIcon}" alt="Telegram" style="width: 32px; height: 32px; vertical-align: middle;" />
            </a>
          </div>
          <div style="background-color: #e6fffa; color: #234e52; padding: 10px; border-radius: 6px; font-size: 13px;">
            🛡️ <strong>Data Security:</strong> Your privacy is our priority. All your data is encrypted and secured with industry standards.
          </div>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #edf2f7; font-size: 12px; color: #a0aec0; text-align: center;">
          <p style="margin-bottom: 8px;">If you didn't request this code, please ignore this email.</p>
          <p>&copy; 2026 ${brand}. All rights reserved.</p>
        </div>
      </div>
    `
  };
};

module.exports = {
  getOtpMessage
};
