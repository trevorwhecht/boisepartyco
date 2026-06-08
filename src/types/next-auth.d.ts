import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    role: string
    firstName: string
    lastName: string
    consentSms?: boolean
    consentEmail?: boolean
  }
  interface Session {
    user: {
      id: string
      role: string
      firstName: string
      lastName: string
      consentSms: boolean
      consentEmail: boolean
    } & import("next-auth").DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    firstName: string
    lastName: string
    consentSms: boolean
    consentEmail: boolean
  }
}
