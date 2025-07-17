import { Elysia } from "elysia";
import { generateToken, requireAuth } from "../middlewares/authMiddleware";
import * as userModel from "../models/userModel";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "your-google-client-id";
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "your-google-client-secret";
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/login";

export const authController = new Elysia()

  // Google OAuth login URL
  .get("/api/auth/google", () => {
    const googleAuthUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("access_type", "offline");

    return { url: googleAuthUrl.toString() };
  })

  // Google OAuth callback
  .post("/api/auth/google/callback", async ({ body, set }) => {
    try {
      const { code } = body as { code: string };

      if (!code) {
        set.status = 400;
        return { success: false, message: "Authorization code is required" };
      }

      console.log(
        "Google OAuth callback started with code:",
        code.substring(0, 20) + "...",
      );

      // Exchange code for access token
      const tokenRequestBody = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      });

      console.log("Requesting token from Google with params:", {
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
        // Don't log the actual code and secret
      });

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: tokenRequestBody.toString(),
      });

      console.log("Google token response status:", tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Google token request failed:", {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText,
        });

        set.status = 400;
        return {
          success: false,
          message: `Failed to exchange code for token: ${tokenResponse.status} ${tokenResponse.statusText}`,
          error_details: errorText,
        };
      }

      const tokenData = await tokenResponse.json();
      console.log("Token data received:", {
        access_token: tokenData.access_token ? "present" : "missing",
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        error: tokenData.error,
        error_description: tokenData.error_description,
      });

      if (tokenData.error) {
        console.error("Google OAuth error:", tokenData);
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
        console.error("No access token in response:", tokenData);
        set.status = 400;
        return {
          success: false,
          message: "Failed to get access token from Google",
          error_details: tokenData,
        };
      }

      // Get user info from Google
      console.log("Fetching user info from Google...");
      const userResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/json",
          },
        },
      );

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("Failed to fetch user info:", {
          status: userResponse.status,
          error: errorText,
        });

        set.status = 400;
        return {
          success: false,
          message: `Failed to fetch user info: ${userResponse.status} ${userResponse.statusText}`,
          error_details: errorText,
        };
      }

      const googleUser = await userResponse.json();
      console.log("Google User received:", {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture ? "present" : "missing",
      });

      if (!googleUser.email) {
        console.error("No email in Google user data:", googleUser);
        set.status = 400;
        return {
          success: false,
          message: "Failed to get user email from Google",
          error_details: googleUser,
        };
      }

      // Check if user exists in database by email first
      console.log("Checking if user exists in database...");
      let user = await userModel.findUserByEmail(googleUser.email);

      if (!user) {
        // User doesn't exist in database - REJECT LOGIN
        console.log("User not found in database:", googleUser.email);
        set.status = 403;
        return {
          success: false,
          message:
            "Akun Anda belum terdaftar dalam sistem. Silakan hubungi administrator untuk mendaftarkan akun Anda.",
          error_code: "USER_NOT_REGISTERED",
        };
      }

      console.log("User found in database:", {
        id: user.id,
        email: user.email,
        name: user.name,
        google_id: user.google_id ? "present" : "missing",
      });

      // User exists in database - check if google_id matches or needs to be updated
      console.log("Checking Google ID match...");
      console.log("Current user Google ID:", user.google_id);
      if (user.google_id !== googleUser.id) {
        console.log("Updating user Google ID and profile...");
        // Update google_id if it's different (for existing users who haven't linked Google yet)
        await userModel.updateUser(user.id!, {
          google_id: googleUser.id,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });
      } else {
        console.log("Updating user profile...");
        // Just update name and avatar if needed
        await userModel.updateUser(user.id!, {
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });
      }

      // Generate token for authenticated user
      console.log("Generating authentication token...");
      const token = generateToken({
        userId: user.id!,
        email: user.email,
        name: user.name,
      });

      const response = {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: googleUser.picture || user.avatar_url, // Use updated avatar from Google
        },
      };

      console.log("Authentication successful for user:", user.email);
      return response;
    } catch (error) {
      console.error("Google OAuth error:", error);

      // More specific error handling
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

  // Get current user
  .get(
    "/api/auth/me",
    requireAuth(({ user }) => {
      return {
        success: true,
        user,
      };
    }),
  )

  // Logout
  .post("/api/auth/logout", () => {
    return { success: true, message: "Logged out successfully" };
  })

  // Admin endpoint to add new users
  .post(
    "/api/auth/admin/add-user",
    requireAuth(async ({ body, set, user }) => {
      try {
        const { email, name } = body as { email: string; name: string };

        if (!email || !name) {
          set.status = 400;
          return { success: false, message: "Email and name are required" };
        }

        // Check if user already exists
        const existingUser = await userModel.findUserByEmail(email);
        if (existingUser) {
          set.status = 400;
          return {
            success: false,
            message: "User with this email already exists",
          };
        }

        // Create new user without google_id (will be set when they login)
        const userId = await userModel.createUser({
          google_id: "", // Will be set when user logs in with Google
          email,
          name,
          avatar_url: "",
        });

        return {
          success: true,
          message: "User added successfully",
          user: {
            id: userId,
            email,
            name,
          },
        };
      } catch (error) {
        console.error("Add user error:", error);
        set.status = 500;
        return { success: false, message: "Failed to add user" };
      }
    }),
  );
