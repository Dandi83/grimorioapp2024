"""Backend API tests for GrimorioApp spells endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://app-python-deploy.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
class TestHealth:
    def test_root_ok(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Spells listing ----------
class TestSpellsList:
    def test_list_returns_84_spells(self, session):
        r = session.get(f"{API}/spells", params={"limit": 500})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 84, f"expected 84 spells, got {len(data)}"

    def test_spell_shape_and_no_mongo_id(self, session):
        r = session.get(f"{API}/spells", params={"limit": 500})
        assert r.status_code == 200
        data = r.json()
        # Ensure no _id leakage
        for d in data:
            assert "_id" not in d, "MongoDB _id must not leak in responses"
        sample = data[0]
        for key in [
            "id", "nome_italiano", "livello", "tempo_di_lancio", "gittata",
            "componenti", "durata", "descrizione", "livello_num", "scuola", "classi",
        ]:
            assert key in sample, f"missing field {key}"
        assert isinstance(sample["classi"], list)
        assert isinstance(sample["livello_num"], int)

    def test_search_query_aculeo(self, session):
        r = session.get(f"{API}/spells", params={"q": "aculeo"})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1, "expected at least one match for 'aculeo'"
        for d in data:
            assert "aculeo" in d["nome_italiano"].lower()

    def test_search_case_insensitive(self, session):
        r_lower = session.get(f"{API}/spells", params={"q": "aculeo"}).json()
        r_upper = session.get(f"{API}/spells", params={"q": "ACULEO"}).json()
        assert len(r_lower) == len(r_upper)

    def test_filter_livello_0_cantrips(self, session):
        r = session.get(f"{API}/spells", params={"livello": 0, "limit": 500})
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        for d in data:
            assert d["livello_num"] == 0
            assert "trucchetto" in d["livello"].lower()

    def test_filter_scuola_divinazione(self, session):
        r = session.get(f"{API}/spells", params={"scuola": "Divinazione", "limit": 500})
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        for d in data:
            assert d["scuola"] == "Divinazione"

    def test_filter_classe_mago(self, session):
        r = session.get(f"{API}/spells", params={"classe": "mago", "limit": 500})
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        for d in data:
            assert "mago" in d["classi"]


# ---------- Meta ----------
class TestMeta:
    def test_meta_shape(self, session):
        r = session.get(f"{API}/spells/meta")
        assert r.status_code == 200
        data = r.json()
        for key in ["scuole", "classi", "livelli"]:
            assert key in data
            assert isinstance(data[key], list)
        assert len(data["scuole"]) >= 1
        assert len(data["classi"]) >= 1
        assert len(data["livelli"]) >= 1
        # Levels should be non-negative ints
        for lv in data["livelli"]:
            assert isinstance(lv, int) and lv >= 0


# ---------- Detail ----------
class TestSpellDetail:
    def test_get_by_id_and_404(self, session):
        r = session.get(f"{API}/spells", params={"limit": 1})
        assert r.status_code == 200
        first = r.json()[0]
        sid = first["id"]

        r2 = session.get(f"{API}/spells/{sid}")
        assert r2.status_code == 200
        got = r2.json()
        assert got["id"] == sid
        assert got["nome_italiano"] == first["nome_italiano"]
        assert "_id" not in got

        r3 = session.get(f"{API}/spells/does-not-exist-xyz")
        assert r3.status_code == 404
