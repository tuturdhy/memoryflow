import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { query } from "@/lib/db/connection";
import { getUUIDFromEmail } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          const result = await query(
            "SELECT * FROM users WHERE email = $1",
            [credentials.email]
          );

          if (result.rows.length === 0) {
            throw new Error("User not found");
          }

          const user = result.rows[0];

          if (!user.password_hash) {
            throw new Error("Invalid password");
          }

          const passwordValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!passwordValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: any) {
        if (session.user && token?.email) {
          const userId = getUUIDFromEmail(token.email);
          
          try {
            const result = await query(
              `INSERT INTO users (id, email, name) VALUES ($1, $2, $3) 
               ON CONFLICT (email) DO UPDATE SET name = $3
               RETURNING *`,
              [userId, token.email, session.user.name || 'User']
            );
            
            console.log('✅ User result:', result.rows[0]);
            session.user.id = userId;
          } catch (error: any) {
            console.error('❌ Error ensuring user exists:', error.message);
          }
        }
        
        return session;
      }
  },
  session: {
    strategy: "jwt" as const,
  },
};

export default NextAuth(authOptions);