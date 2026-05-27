import { describe, it, expect } from "vitest"
import { parseEmailRecipients } from "./emailService"

describe("parseEmailRecipients", () => {
  it("returns empty array for null", () => {
    expect(parseEmailRecipients(null)).toEqual([])
  })
  it("returns empty array for undefined", () => {
    expect(parseEmailRecipients(undefined)).toEqual([])
  })
  it("returns empty array for empty string", () => {
    expect(parseEmailRecipients("")).toEqual([])
  })
  it("splits by comma", () => {
    expect(parseEmailRecipients("a@a.com,b@b.com")).toEqual(["a@a.com", "b@b.com"])
  })
  it("splits by newline", () => {
    expect(parseEmailRecipients("a@a.com\nb@b.com")).toEqual(["a@a.com", "b@b.com"])
  })
  it("splits by mixed comma and newline", () => {
    expect(parseEmailRecipients("a@a.com,\nb@b.com")).toEqual(["a@a.com", "b@b.com"])
  })
  it("trims whitespace from each entry", () => {
    expect(parseEmailRecipients("  a@a.com  ,  b@b.com  ")).toEqual(["a@a.com", "b@b.com"])
  })
  it("filters empty entries caused by double commas", () => {
    expect(parseEmailRecipients("a@a.com,,b@b.com")).toEqual(["a@a.com", "b@b.com"])
  })
  it("handles a single address with no delimiters", () => {
    expect(parseEmailRecipients("a@a.com")).toEqual(["a@a.com"])
  })
  it("handles whitespace-only string", () => {
    expect(parseEmailRecipients("   ")).toEqual([])
  })
})
