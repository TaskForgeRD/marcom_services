import { Elysia } from 'elysia';
import { generateToken, requireAuth } from '../middlewares/authMiddleware';
import * as userModel from '../models/userModel';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/callback';

export const authController = new Elysia()

  // Google OAuth login URL
  .get('/api/auth/google', () => {
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');

    return { url: googleAuthUrl.toString() };
  })

  // Google OAuth callback
  .post('/api/auth/google/callback', async ({ body, set }) => {
    try {
      const { code } = body as { code: string };

      if (!code) {
        set.status = 400;
        return { success: false, message: 'Authorization code is required' };
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        set.status = 400;
        return { success: false, message: 'Failed to get access token' };
      }

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const googleUser = await userResponse.json();

      let user = await userModel.findUserByGoogleId(googleUser.id);

      console.log('Google User:', googleUser);

      if (!user) {
        const userId = await userModel.createUser({
          google_id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        });

        user = {
          id: userId,
          google_id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          avatar_url: googleUser.picture,
        };
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
      });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
        },
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      set.status = 500;
      return { success: false, message: 'Authentication failed' };
    }
  })

  // Get current user
  .get('/api/auth/me', requireAuth(({ user }) => {
    return {
      success: true,
      user,
    };
  }))

  // Logout
  .post('/api/auth/logout', () => {
    return { success: true, message: 'Logged out successfully' };
  });
