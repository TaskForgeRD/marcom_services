import { Elysia } from "elysia";

export const globalErrorHandler = new Elysia().onError(
  ({ code, error, set }) => {
    console.error("❌ Global Error:", error);

    // Default status
    let status = 500;
    let message = "Terjadi kesalahan pada server";

    // Custom message dari Error biasa
    if (error instanceof Error) {
      message = error.message;

      // Gunakan status berbeda berdasarkan pesan
      if (message.includes("tidak ditemukan")) {
        status = 404;
      } else if (message.includes("tidak memiliki akses")) {
        status = 403;
      } else if (message.includes("digunakan")) {
        status = 409;
      } else if (message.includes("tidak valid")) {
        status = 400;
      }
    }

    set.status = status;

    return {
      success: false,
      message,
    };
  }
);
