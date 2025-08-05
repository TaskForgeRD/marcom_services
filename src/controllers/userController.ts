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
      return {
        success: false,
        message: "Failed to fetch users",
      };
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
      return {
        success: false,
        message: "Failed to fetch user",
      };
    }
  })
  .put("/:id", async ({ params: { id }, body, set }) => {
    try {
      const userId = parseInt(id);
      if (isNaN(userId)) {
        set.status = 400;
        return { success: false, message: "Invalid user ID" };
      }

      const { email, name, avatar_url, role } = body as {
        email?: string;
        name?: string;
        avatar_url?: string;
        role?: userModel.Role;
      };

      if (!email && !name && !avatar_url && !role) {
        set.status = 400;
        return { success: false, message: "At least one field is required" };
      }

      // Validate role if provided
      if (role && !userModel.roles.includes(role)) {
        set.status = 400;
        return {
          success: false,
          message: `Invalid role. Must be one of: ${userModel.roles.join(
            ", "
          )}`,
        };
      }

      const updatedUser = await userModel.updateUser(userId, {
        email,
        name,
        avatar_url,
        role,
      });

      if (!updatedUser) {
        set.status = 404;
        return { success: false, message: "User not found" };
      }

      return {
        success: true,
        message: "User updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar_url: updatedUser.avatar_url,
          role: updatedUser.role,
        },
      };
    } catch (error) {
      console.error("Update user error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Failed to update user",
      };
    }
  })
  .post("/", async ({ body, set }) => {
    try {
      const { email, name, role } = body as {
        email: string;
        name: string;
        role?: userModel.Role;
      };

      // Validate required fields
      if (!email || !name) {
        set.status = 400;
        return { success: false, message: "Email and name are required" };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        set.status = 400;
        return { success: false, message: "Invalid email format" };
      }

      // Validate role if provided
      const userRole = role || "guest";
      if (!userModel.roles.includes(userRole)) {
        set.status = 400;
        return {
          success: false,
          message: `Invalid role. Must be one of: ${userModel.roles.join(
            ", "
          )}`,
        };
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

      console.log("Creating user with data:", { email, name, role: userRole });

      // Create new user without google_id (will be set when they login)
      const userId = await userModel.createUser({
        google_id: "", // Will be set when user logs in with Google
        email,
        name,
        role: userRole,
        avatar_url: "",
      });

      console.log("User created successfully with ID:", userId);

      return {
        success: true,
        message: "User added successfully",
        user: {
          id: userId,
          email,
          name,
          role: userRole,
        },
      };
    } catch (error) {
      console.error("Add user error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Failed to add user",
        details: process.env.NODE_ENV === "development",
      };
    }
  })
  .delete("/:id", async ({ params: { id }, set }) => {
    try {
      const userId = parseInt(id);
      if (isNaN(userId)) {
        set.status = 400;
        return { success: false, message: "Invalid user ID" };
      }

      // Check if user exists
      const user = await userModel.getUserById(userId);
      if (!user) {
        set.status = 404;
        return { success: false, message: "User not found" };
      }

      await userModel.deleteUser(userId);

      return {
        success: true,
        message: `User "${user.name}" deleted successfully`,
      };
    } catch (error) {
      console.error("Delete user error:", error);
      set.status = 500;
      return {
        success: false,
        message: "Failed to delete user",
      };
    }
  });
