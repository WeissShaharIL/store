"""Rate-limit enforcement, exercised in isolation.

The rest of the suite runs with the limiter disabled (see conftest). This test
flips it on for its own duration, proves login is throttled, and resets it in a
finally so test ordering can't leak the enabled state into other tests.
"""
from limiter import limiter


def test_login_is_rate_limited(client):
    limiter.enabled = True
    # slowapi keys by remote address; reset any counters from a prior run.
    limiter.reset()
    try:
        # Limit is 10/minute on /login. Fire enough bad logins to cross it.
        statuses = [
            client.post(
                "/api/auth/login",
                json={"customer_id": "nope", "password": "wrong"},
            ).status_code
            for _ in range(15)
        ]
        assert 429 in statuses, f"expected a 429 once the limit is crossed, got {statuses}"
        # Everything before the limit should be a normal 401 (bad credentials).
        assert statuses[0] == 401
    finally:
        limiter.reset()
        limiter.enabled = False
