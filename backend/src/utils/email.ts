import { Resend } from "resend";

/**
 * Sends a 6-digit verification code to the target email.
 * If Resend API Key is missing or set to "mock", it logs to the console.
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const message = `Your GradRoulette verification code is: ${otp}. Expires in 5 minutes.`;

  // Instantiate client dynamically to ensure dotenv configuration has loaded
  let resendClient: Resend | null = null;
  if (apiKey && apiKey !== "mock") {
    resendClient = new Resend(apiKey);
  }

  if (!resendClient) {
    console.log("\n========================================");
    console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
    console.log(message);
    console.log("========================================\n");
    return true;
  }

  try {
    const response = await resendClient.emails.send({
      from: "GradRoulette <onboarding@resend.dev>", // Or a verified domain in production
      to: email,
      subject: "Your GradRoulette Verification Code",
      text: message,
    });

    if (response.error) {
      console.error("Resend API Error:", response.error);
      // Fallback log so developer isn't stuck
      console.log(`[FALLBACK] OTP for ${email}: ${otp}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    // Fallback log so developer isn't stuck
    console.log(`[FALLBACK] OTP for ${email}: ${otp}`);
    return false;
  }
}
