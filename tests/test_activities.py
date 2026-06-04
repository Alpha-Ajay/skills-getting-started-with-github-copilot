def test_get_activities(client):
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # basic sanity: expected activity keys exist
    assert "Chess Club" in data


def test_signup_success(client):
    email = "signup.test@example.com"
    res = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert res.status_code == 200
    data = client.get("/activities").json()
    assert email in data["Chess Club"]["participants"]


def test_signup_duplicate_returns_400(client):
    email = "dup.test@example.com"
    res1 = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert res1.status_code == 200
    res2 = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert res2.status_code == 400


def test_unregister_participant(client):
    email = "remove.test@example.com"
    client.post(f"/activities/Chess%20Club/signup?email={email}")
    res = client.delete(f"/activities/Chess%20Club/participants?email={email}")
    assert res.status_code == 200
    data = client.get("/activities").json()
    assert email not in data["Chess Club"]["participants"]


def test_unregister_nonexistent_returns_404(client):
    res = client.delete("/activities/Chess%20Club/participants?email=notfound%40ex.com")
    assert res.status_code == 404
