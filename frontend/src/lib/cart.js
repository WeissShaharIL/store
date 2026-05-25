const CART_KEY = "store_cart";
const listeners = new Set();

function emit() {
  for (const fn of listeners) {
    try { fn(getCart()); } catch { /* ignore */ }
  }
}

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  emit();
}

export function addToCart(item) {
  const cart = getCart();
  cart.push(item);
  writeCart(cart);
}

export function removeFromCart(itemId) {
  writeCart(getCart().filter((i) => i.id !== itemId));
}

export function clearCart() {
  writeCart([]);
}

export function getCartCount() {
  return getCart().length;
}

export function subscribeToCart(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) emit();
  });
}
