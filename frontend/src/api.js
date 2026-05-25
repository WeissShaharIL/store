const BASE = import.meta.env.VITE_API_URL || "";

async function request(method, path, body, opts = {}) {
  const headers = { "Content-Type": "application/json", ...opts.headers };
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body instanceof FormData ? opts.headers || {} : headers,
    body:
      body instanceof FormData
        ? body
        : body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "שגיאה");
  return data;
}

export const api = {
  get: (path, opts) => request("GET", path, undefined, opts),
  post: (path, body, opts) => request("POST", path, body, opts),
  patch: (path, body, opts) => request("PATCH", path, body, opts),
  put: (path, body, opts) => request("PUT", path, body, opts),
  delete: (path, opts) => request("DELETE", path, undefined, opts),
  postForm: (path, formData) => request("POST", path, formData),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (customer_id, password) =>
  api.post("/api/auth/login", { customer_id, password });
export const logout = () => api.post("/api/auth/logout");
export const getMe = () => api.get("/api/me");

// ── Public ────────────────────────────────────────────────────────────────────
export const getPublicClosets = () => api.get("/api/public/closets");
export const getDisplaySale = () => api.get("/api/public/closets/display-sale");
export const getPublicCloset = (id) => api.get(`/api/public/closets/${id}`);
export const getPublicColors = () => api.get("/api/public/palette-colors");
export const getPublicHandles = () => api.get("/api/public/handles");
export const getDoorTypeCovers = () => api.get("/api/public/door-type-covers");
export const getActiveLogo = () => api.get("/api/public/logo");
export const getPublicSettings = () => api.get("/api/public/settings");
export const submitLead = (data) => api.post("/api/public/leads", data);

// ── Admin — Closet Templates ──────────────────────────────────────────────────
export const adminGetTemplates = () => api.get("/api/admin/closet-templates");
export const adminGetTemplate = (id) => api.get(`/api/admin/closet-templates/${id}`);
export const adminCreateTemplate = (data) => api.post("/api/admin/closet-templates", data);
export const adminUpdateTemplate = (id, data) => api.patch(`/api/admin/closet-templates/${id}`, data);
export const adminUploadTemplateImage = (id, formData) =>
  api.postForm(`/api/admin/closet-templates/${id}/image`, formData);
export const adminDeleteTemplateImage = (id) =>
  api.delete(`/api/admin/closet-templates/${id}/image`);
export const adminDeleteTemplate = (id) => api.delete(`/api/admin/closet-templates/${id}`);

// ── Admin — Palette Colors ────────────────────────────────────────────────────
export const adminGetColors = () => api.get("/api/admin/palette-colors");
export const adminCreateColor = (data) => api.post("/api/admin/palette-colors", data);
export const adminUpdateColor = (id, data) => api.patch(`/api/admin/palette-colors/${id}`, data);
export const adminDeleteColor = (id) => api.delete(`/api/admin/palette-colors/${id}`);

// ── Admin — Handles ───────────────────────────────────────────────────────────
export const adminGetHandles = () => api.get("/api/admin/handles");
export const adminCreateHandle = (data) => api.post("/api/admin/handles", data);
export const adminUpdateHandle = (id, data) => api.patch(`/api/admin/handles/${id}`, data);
export const adminDeleteHandle = (id) => api.delete(`/api/admin/handles/${id}`);

// ── Admin — Door Type Covers ──────────────────────────────────────────────────
export const adminGetDoorTypeCovers = () => api.get("/api/admin/door-type-covers");
export const adminUploadDoorTypeCover = (kind, formData) =>
  api.postForm(`/api/admin/door-type-covers/${kind}/image`, formData);
export const adminDeleteDoorTypeCover = (kind) =>
  api.delete(`/api/admin/door-type-covers/${kind}/image`);

// ── Admin — Assets ────────────────────────────────────────────────────────────
export const adminGetAssets = () => api.get("/api/admin/assets");
export const adminUploadAsset = (formData) => api.postForm("/api/admin/assets", formData);
export const adminDeleteAsset = (id) => api.delete(`/api/admin/assets/${id}`);

// ── Admin — Hero Banners ──────────────────────────────────────────────────────
export const adminGetHeroBanners = () => api.get("/api/admin/hero-banners");
export const adminUploadHeroBanner = (formData) => api.postForm("/api/admin/hero-banners", formData);
export const adminDeleteHeroBanner = (id) => api.delete(`/api/admin/hero-banners/${id}`);
export const getPublicHeroBanners = () => api.get("/api/public/hero-banners");

// ── Admin — Logos ─────────────────────────────────────────────────────────────
export const adminGetLogos = () => api.get("/api/admin/logos");
export const adminUploadLogo = (formData) => api.postForm("/api/admin/logos", formData);
export const adminActivateLogo = (id) => api.post(`/api/admin/logos/${id}/activate`);
export const adminDeleteLogo = (id) => api.delete(`/api/admin/logos/${id}`);

// ── Admin — Settings ──────────────────────────────────────────────────────────
export const getSettings = () => api.get("/api/settings");
export const updateSettings = (values) => api.patch("/api/settings", { values });
export const getLandingSettings = () => api.get("/api/admin/landing");
export const updateLandingSettings = (data) => api.patch("/api/admin/landing", data);
export const adminUploadDefaultClosetImage = (formData) =>
  api.postForm("/api/admin/landing/image/default-closet", formData);
export const adminDeleteDefaultClosetImage = () =>
  api.delete("/api/admin/landing/image/default-closet");

// ── Admin — Leads ─────────────────────────────────────────────────────────────
export const adminGetLeads = (status) =>
  api.get(`/api/admin/leads${status ? `?status=${status}` : ""}`);
export const adminGetLead = (id) => api.get(`/api/admin/leads/${id}`);
export const adminUpdateLead = (id, data) => api.patch(`/api/admin/leads/${id}`, data);
export const adminDeleteLead = (id) => api.delete(`/api/admin/leads/${id}`);
export const adminRestoreLead = (id) => api.post(`/api/admin/leads/${id}/restore`);
export const adminDeleteLeadPermanent = (id) => api.delete(`/api/admin/leads/${id}/permanent`);
export const adminGetTrashedLeads = () => api.get("/api/admin/leads/trash");
export const adminGetLeadsUnreadCount = () => api.get("/api/admin/leads/unread-count");

// ── Namespaced API (used by portal pages) ─────────────────────────────────────
// The flat exports above are used by existing admin components.
// Portal pages (CatalogPage, MessagesPage, etc.) use the namespaced form below,
// matching simple/'s api.js shape so pages can be ported without changes.

Object.assign(api, {
  me: {
    get: () => api.get("/api/me"),
    catalog: () => api.get("/api/me/catalog"),
    pendingAnnouncement: () => api.get("/api/me/pending_announcement"),
    ackAnnouncement: (id) => api.post(`/api/me/announcements/${id}/ack`),
    messages: {
      list: () => api.get("/api/me/messages"),
      send: (body) => api.post("/api/me/messages", { body }),
      markRead: () => api.post("/api/me/messages/mark_read"),
      unreadCount: () => api.get("/api/me/messages/unread_count"),
    },
    orders: {
      list: () => api.get("/api/me/orders"),
      create: (payload) => api.post("/api/me/orders", payload),
    },
  },

  public: {
    catalog: () => api.get("/api/public/catalog"),
    contact: (payload) => api.post("/api/public/contact", payload),
  },

  admin: {
    messages: {
      threads: () => api.get("/api/admin/messages/threads"),
    },
  },

  async downloadFile(path, filename) {
    const BASE = import.meta.env.VITE_API_URL || "";
    const res = await fetch(`${BASE}${path}`, { credentials: "include" });
    if (!res.ok) {
      let detail = "שגיאה בהורדה";
      try { const d = await res.json(); if (d?.detail) detail = d.detail; } catch {}
      throw new Error(detail);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  downloadPdf(path, filename) {
    return api.downloadFile(path, filename);
  },
});
