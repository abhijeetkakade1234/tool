import { describe, expect, it } from "vitest"
import { hashBytes } from "../hash"

const abc = new TextEncoder().encode("abc").buffer as ArrayBuffer

describe("hashBytes", () => {
  it("computes SHA-256", async () => {
    expect(await hashBytes(abc, "SHA-256")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    )
  })

  it("computes SHA-1", async () => {
    expect(await hashBytes(abc, "SHA-1")).toBe(
      "a9993e364706816aba3e25717850c26c9cd0d89d",
    )
  })

  it("computes SHA-512", async () => {
    expect(await hashBytes(abc, "SHA-512")).toBe(
      "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" +
        "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    )
  })
})
