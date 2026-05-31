import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  getCartCount,
  subscribeToCart,
} from "./cart.js";

beforeEach(() => {
  sessionStorage.clear();
});

describe("cart storage", () => {
  it("starts empty", () => {
    expect(getCart()).toEqual([]);
    expect(getCartCount()).toBe(0);
  });

  it("adds items and counts them", () => {
    addToCart({ id: "a", name: "ארון 1" });
    addToCart({ id: "b", name: "ארון 2" });
    expect(getCartCount()).toBe(2);
    expect(getCart().map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("removes an item by id (leaving the rest)", () => {
    addToCart({ id: "a" });
    addToCart({ id: "b" });
    removeFromCart("a");
    expect(getCart().map((i) => i.id)).toEqual(["b"]);
  });

  it("clears the whole cart", () => {
    addToCart({ id: "a" });
    clearCart();
    expect(getCart()).toEqual([]);
  });

  it("returns [] when storage holds corrupt JSON", () => {
    sessionStorage.setItem("store_cart", "{not json");
    expect(getCart()).toEqual([]);
  });
});

describe("cart subscriptions", () => {
  it("notifies subscribers on change and stops after unsubscribe", () => {
    const fn = vi.fn();
    const unsub = subscribeToCart(fn);
    addToCart({ id: "a" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith([{ id: "a" }]);
    unsub();
    addToCart({ id: "b" });
    expect(fn).toHaveBeenCalledTimes(1); // no further calls after unsubscribe
  });

  it("a throwing subscriber doesn't break other subscribers", () => {
    const bad = vi.fn(() => { throw new Error("boom"); });
    const good = vi.fn();
    subscribeToCart(bad);
    subscribeToCart(good);
    expect(() => addToCart({ id: "a" })).not.toThrow();
    expect(good).toHaveBeenCalled();
  });
});
