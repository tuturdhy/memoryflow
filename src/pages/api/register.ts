import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db/connection";
import { getUUIDFromEmail } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name, password } = req.body;

    // تحقق من البيانات
    if (!email || !password) {
      return res.status(400).json({
        error: "البريد الإلكتروني وكلمة المرور مطلوبة",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
      });
    }

    // تحقق من المستخدم الموجود
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "البريد الإلكتروني مستخدم بالفعل",
      });
    }

    // تشفير كلمة المرور
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = getUUIDFromEmail(email);  // ✅ USE DETERMINISTIC UUID

    // إنشاء المستخدم
    const result = await query(
      `INSERT INTO users (id, email, name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name`,
      [userId, email, name || "User", passwordHash]
    );

    return res.status(201).json({
      message: "تم التسجيل بنجاح",
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error("Register error:", error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        error: "البريد الإلكتروني مستخدم بالفعل",
      });
    }

    return res.status(500).json({
      error: "خطأ في التسجيل",
      details: error.message,
    });
  }
}