import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      familyId: string;
      memberId: string;
      role: string;
    };
  }

  interface User {
    familyId: string;
    memberId: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    familyId?: string;
    memberId?: string;
    role?: string;
  }
}
