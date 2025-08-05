import { Elysia } from "elysia";
import { authMiddleware } from "../middlewares/authMiddleware";
import * as userModel from "../models/userModel";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";

export const usersController = new Elysia({ prefix: "/api/users" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin"]))
  .get("/", async ({ set }) => {
    try {
      const users = await userModel.getAllUsers();

      if (!users || users.length === 0) {
        set.status = 404;
        return { success: false, message: "No users found" };
      }

      return {
        success: true,
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          role: user.role,
        })),
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      set.status = 500;
      return { success: false, message: "Failed to fetch users" };
    }
  })
  .get("/:id", async ({ params: { id }, set }) => {
    try {
      const user = await userModel.getUserById(parseInt(id));

      if (!user) {
        set.status = 404;
        return { success: false, message: "User not found" };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      set.status = 500;
      return { success: false, message: "Failed to fetch user" };
    }
  })
  .put("/:id", async ({ params: { id }, body, set }) => {
    try {
      const { email, name, avatar_url } = body as {
        email?: string;
        name?: string;
        avatar_url?: string;
        role?: string;
      };

      if (!email && !name && !avatar_url) {
        set.status = 400;
        return { success: false, message: "At least one field is required" };
      }

      const updatedUser = await userModel.updateUser(parseInt(id), {
        email,
        name,
        avatar_url,
      });

      return {
        success: true,
        message: "User updated successfully",
        user: updatedUser,
      };
    } catch (error) {
      console.error("Update user error:", error);
      set.status = 500;
      return { success: false, message: "Failed to update user" };
    }
  })
  .post("/", async ({ body, set }) => {
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
  });
