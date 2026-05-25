const CART_KEY = "store_cart";

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export function setCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("store:cart-changed"));
}

export function addToCart(item) {
  const cart = getCart();
  cart.push(item);
  setCart(cart);
}

export function removeFromCart(itemId) {
  setCart(getCart().filter((i) => i.id !== itemId));
}

export function clearCart() {
  setCart([]);
}

export function getCartCount() {
  return getCart().length;
}
