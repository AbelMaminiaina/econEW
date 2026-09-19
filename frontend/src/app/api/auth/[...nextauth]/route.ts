import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SERVER_API_BASE_URL } from '@/lib/api/config';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Identifiants',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const res = await fetch(`${SERVER_API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) return null;

        const data = await res.json();

        return {
          id: data.user.id,
          name: `${data.user.firstName} ${data.user.lastName}`,
          email: data.user.email,
          role: data.user.role,
          companyId: data.company?.id ?? null,
          companyName: data.company?.name ?? null,
          companyStatus: data.company?.status ?? null,
          paymentTerms: data.company?.paymentTerms ?? null,
          accessToken: data.token,
        };
      },
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.companyStatus = user.companyStatus;
        token.paymentTerms = user.paymentTerms;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.accessToken = token.accessToken;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
        session.user.companyStatus = token.companyStatus;
        session.user.paymentTerms = token.paymentTerms;
      }
      return session;
    },
  },
  pages: {
    signIn: '/connexion',
    error: '/connexion',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
