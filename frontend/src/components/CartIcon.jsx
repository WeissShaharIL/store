import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCartCount, subscribeToCart } from "../lib/cart.js";
import { ShoppingCart } from "./Icons.jsx";

export default function CartIcon({ className = "" }) {
  const [count, setCount] = useState(getCartCount());

  useEffect(() => {
    return subscribeToCart((items) => setCount(items.length));
  }, []);

  return (
    <Link
      to="/cart"
      className={"cart-icon" + (className ? " " + className : "")}
      aria-label={count > 0 ? `עגלה (${count} פריטים)` : "עגלה"}
      title="העגלה שלי"
    >
      <ShoppingCart />
      {count > 0 && <span className="cart-icon__badge">{count}</span>}
    </Link>
  );
}
