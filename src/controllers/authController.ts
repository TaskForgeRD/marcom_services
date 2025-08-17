import { Elysia } from "elysia";
import { authMiddleware, generateToken } from "../middlewares/authMiddleware";
import * as userModel from "../models/userModel";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "your-google-client-id";
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "your-google-client-secret";
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/login";

export const authController = new Elysia({ prefix: "/api/auth" })
  .get("/google", () => {
    const googleAuthUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
    googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("access_type", "offline");

    return { url: googleAuthUrl.toString() };
  })
  .post("/google/callback", async ({ body, set }) => {
    try {
      const { code } = body as { code: string };

      if (!code) {
        set.status = 400;
        return { success: false, message: "Authorization code is required" };
      }

      const tokenRequestBody = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      });

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenRequestBody.toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        set.status = 400;
        return {
          success: false,
          message: `Failed to exchange code for token: ${tokenResponse.status} ${tokenResponse.statusText}`,
          error_details: errorText,
        };
      }

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        set.status = 400;
        return {
          success: false,
          message: `Google OAuth error: ${
            tokenData.error_description || tokenData.error
          }`,
          error_code: tokenData.error,
        };
      }

      if (!tokenData.access_token) {
        set.status = 400;
        return {
          success: false,
          message: "Failed to get access token from Google",
          error_details: tokenData,
        };
      }

      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        set.status = 400;
        return {
          success: false,
          message: `Failed to fetch user info: ${userResponse.status} ${userResponse.statusText}`,
          error_details: errorText,
        };
      }

      const googleUser = await userResponse.json();

      if (!googleUser.email) {
        set.status = 400;
        return {
          success: false,
          message: "Failed to get user email from Google",
          error_details: googleUser,
        };
      }

      let user = await userModel.findUserByEmail(googleUser.email);

      if (!user) {
        set.status = 403;
        return {
          success: false,
          message:
            "Akun Anda belum terdaftar dalam sistem. Silakan hubungi administrator untuk mendaftarkan akun Anda.",
          error_code: "USER_NOT_REGISTERED",
        };
      }

      if (user.google_id !== googleUser.id) {
        await userModel.updateUser(user.id!, {
          google_id: googleUser.id,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });
      } else {
        await userModel.updateUser(user.id!, {
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });
      }

      const token = generateToken({
        userId: user.id!,
        email: user.email,
        name: user.name,
        role: user.role,
      });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: googleUser.picture || user.avatar_url,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          set.status = 503;
          return {
            success: false,
            message: "Failed to connect to Google services. Please try again.",
            error_code: "GOOGLE_SERVICE_UNAVAILABLE",
          };
        }

        if (error.message.includes("JSON")) {
          set.status = 502;
          return {
            success: false,
            message: "Invalid response from Google services. Please try again.",
            error_code: "INVALID_GOOGLE_RESPONSE",
          };
        }
      }

      set.status = 500;
      return {
        success: false,
        message: "Authentication failed due to server error. Please try again.",
        error_code: "INTERNAL_SERVER_ERROR",
        error_details:
          process.env.NODE_ENV === "development" ? error : undefined,
      };
    }
  })
  .use(authMiddleware)
  .get("/me", ({ user }) => {
    return {
      success: true,
      user,
      role: user.role,
    };
  })
  .post("/logout", () => {
    return { success: true, message: "Logged out successfully" };
  });
