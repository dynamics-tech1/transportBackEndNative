/**
 * Utility for generating standardized and professional messages for SMS and Email.
 */

const getOtpMessage = (otp, type = "login") => {
  const brand = "Dynamics Transport";
  const action = type === "registration" ? "account registration" : "secure login";
  
  return {
    sms: `Your ${brand} OTP for ${action} is: ${otp}. Valid for 10 minutes. Do not share this code.`,
    emailSubject: `${otp} is your ${brand} verification code`,
    emailHtml: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin: 0;">Dynamics Transport</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 8px; text-align: center;">
          <p style="font-size: 16px; color: #555; margin-bottom: 25px;">Hello,</p>
          <p style="font-size: 16px; color: #555; margin-bottom: 25px;">Use the verification code below for your <strong>${action}</strong>:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3498db; margin-bottom: 25px;">${otp}</div>
          <p style="font-size: 14px; color: #888; margin-bottom: 0;">This code will expire in 10 minutes.</p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
          <p style="margin-bottom: 10px;">If you didn't request this code, you can safely ignore this email.</p>
          <p>&copy; 2026 Dynamics Transport. All rights reserved.</p>
        </div>
      </div>
    `
  };
};

module.exports = {
  getOtpMessage
};
