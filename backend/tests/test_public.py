"""Public read-only API — accessible without authentication.

These endpoints back the customer-facing pages (showroom, display-sale,
designer, landing). Against the empty in-memory test DB they should all return
200 with an empty list / null / empty dict — never 401 and never 500.
"""


def test_public_closets_empty_list(client):
    r = client.get("/api/public/closets")
    assert r.status_code == 200
    assert r.json() == []


def test_public_display_sale_empty_list(client):
    r = client.get("/api/public/closets/display-sale")
    assert r.status_code == 200
    assert r.json() == []


def test_public_closet_missing_is_404(client):
    r = client.get("/api/public/closets/999999")
    assert r.status_code == 404


def test_public_palette_colors_list(client):
    r = client.get("/api/public/palette-colors")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_public_handles_list(client):
    r = client.get("/api/public/handles")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_public_door_type_covers_list(client):
    r = client.get("/api/public/door-type-covers")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_public_logo_null_when_none_active(client):
    r = client.get("/api/public/logo")
    assert r.status_code == 200
    assert r.json() is None


def test_public_settings_returns_dict(client):
    r = client.get("/api/public/settings")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_public_settings_only_exposes_whitelisted_keys(client):
    # No secrets / admin-only settings should ever appear here.
    r = client.get("/api/public/settings")
    allowed = {
        "welcome_title", "welcome_subtitle", "contact_phone", "contact_whatsapp",
        "hero_tagline", "about_text", "default_closet_image", "trust_items",
    }
    assert set(r.json().keys()) <= allowed


def test_public_catalog_empty_when_no_active_catalog(client):
    r = client.get("/api/public/catalog")
    assert r.status_code == 200
    assert r.json() == []


def test_public_hero_banners_list(client):
    r = client.get("/api/public/hero-banners")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_public_endpoints_need_no_auth(client):
    # A representative public GET must not require a token.
    r = client.get("/api/public/closets")
    assert r.status_code != 401
