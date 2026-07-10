"""Backend regression tests for GrimorioApp.

Covers:
- BUG fix: parse_livello handles both '°' (U+00B0) and 'º' (U+00BA)
- Backfill for previously created 'Palla di Fuoco' with 'º'
- NEW: /api/spells/suggestions endpoint for form dropdowns
- CRUD: create / read / update / delete
- MongoDB _id must not leak in responses
"""

import os
import uuid

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- BUG: Palla di Fuoco backfill ----------------
class TestBackfillPallaDiFuoco:
    def test_palla_di_fuoco_visible_via_search(self, session):
        r = session.get(f"{BASE_URL}/spells", params={"q": "palla"})
        assert r.status_code == 200, r.text
        results = r.json()
        names = [s["nome_italiano"] for s in results]
        matching = [s for s in results if s["nome_italiano"].lower() == "palla di fuoco"]
        assert matching, f"Palla di Fuoco not in search results: {names}"
        spell = matching[0]
        # After backfill of the 'º' character:
        assert spell["livello_num"] == 3, f"livello_num expected 3, got {spell['livello_num']}"
        assert spell["scuola"] == "Invocazione", f"scuola expected Invocazione, got {spell['scuola']}"
        assert "mago" in spell["classi"], f"classi missing 'mago': {spell['classi']}"
        assert "stregone" in spell["classi"], f"classi missing 'stregone': {spell['classi']}"
        assert "_id" not in spell


# ---------------- BUG: parse_livello accepts both º and ° ----------------
class TestParseLivelloBothOrdinals:
    _to_cleanup: list[str] = []

    @classmethod
    def teardown_class(cls):
        s = requests.Session()
        for sid in cls._to_cleanup:
            try:
                s.delete(f"{BASE_URL}/spells/{sid}")
            except Exception:
                pass

    def test_create_with_masculine_ordinal_U00BA(self, session):
        # 'º' U+00BA (iOS Italian keyboard)
        name = f"TEST_Ord_BA_{uuid.uuid4().hex[:6]}"
        payload = {
            "nome_italiano": name,
            "livello": "Evocazione di 5º livello (mago)",
        }
        r = session.post(f"{BASE_URL}/spells", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        self._to_cleanup.append(data["id"])
        assert data["livello_num"] == 5
        assert data["scuola"] == "Evocazione"
        assert data["classi"] == ["mago"]
        assert "_id" not in data

    def test_create_with_degree_sign_U00B0(self, session):
        # '°' U+00B0 (degree sign)
        name = f"TEST_Ord_B0_{uuid.uuid4().hex[:6]}"
        payload = {
            "nome_italiano": name,
            "livello": "Evocazione di 5° livello (mago)",
        }
        r = session.post(f"{BASE_URL}/spells", json=payload)
        assert r.status_code == 201, r.text
        data = r.json()
        self._to_cleanup.append(data["id"])
        assert data["livello_num"] == 5
        assert data["scuola"] == "Evocazione"
        assert data["classi"] == ["mago"]

    def test_patch_updates_livello_num_when_ordinal_char_used(self, session):
        # Create with unknown livello then patch to º livello
        name = f"TEST_Patch_{uuid.uuid4().hex[:6]}"
        create = session.post(
            f"{BASE_URL}/spells",
            json={"nome_italiano": name, "livello": "Sconosciuto"},
        )
        assert create.status_code == 201, create.text
        sid = create.json()["id"]
        self._to_cleanup.append(sid)
        assert create.json()["livello_num"] == -1

        patch = session.patch(
            f"{BASE_URL}/spells/{sid}",
            json={"livello": "Illusione di 2º livello (bardo, mago)"},
        )
        assert patch.status_code == 200, patch.text
        upd = patch.json()
        assert upd["livello_num"] == 2
        assert upd["scuola"] == "Illusione"
        assert set(upd["classi"]) == {"bardo", "mago"}

        # verify persisted via GET
        got = session.get(f"{BASE_URL}/spells/{sid}")
        assert got.status_code == 200
        g = got.json()
        assert g["livello_num"] == 2
        assert g["scuola"] == "Illusione"


# ---------------- NEW: /spells/suggestions ----------------
class TestSuggestionsEndpoint:
    def test_suggestions_shape_and_scuole(self, session):
        r = session.get(f"{BASE_URL}/spells/suggestions")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("livello", "tempo_di_lancio", "gittata", "componenti", "durata", "scuole"):
            assert key in data, f"missing key {key}"
            assert isinstance(data[key], list), f"{key} must be a list"

        # scuole must contain exactly the 8 D&D schools
        assert len(data["scuole"]) == 8
        expected_schools = {
            "Abiurazione", "Ammaliamento", "Divinazione", "Evocazione",
            "Illusione", "Invocazione", "Necromanzia", "Trasmutazione",
        }
        assert set(data["scuole"]) == expected_schools

        # each of the frequency-based lists should be non-empty (DB has ~369 spells)
        for key in ("livello", "tempo_di_lancio", "gittata", "componenti", "durata"):
            assert len(data[key]) >= 1, f"{key} unexpectedly empty"

    def test_suggestions_no_empty_strings(self, session):
        r = session.get(f"{BASE_URL}/spells/suggestions")
        data = r.json()
        for key in ("livello", "tempo_di_lancio", "gittata", "componenti", "durata"):
            assert all(isinstance(v, str) and v.strip() for v in data[key]), (
                f"{key} contains empty/blank values"
            )


# ---------------- DELETE ----------------
class TestDeleteEndpoint:
    def test_delete_returns_204_and_then_404(self, session):
        name = f"TEST_Del_{uuid.uuid4().hex[:6]}"
        create = session.post(
            f"{BASE_URL}/spells",
            json={"nome_italiano": name, "livello": "Trucchetto di Illusione (bardo)"},
        )
        assert create.status_code == 201, create.text
        sid = create.json()["id"]
        assert create.json()["livello_num"] == 0  # Trucchetto

        d1 = session.delete(f"{BASE_URL}/spells/{sid}")
        assert d1.status_code == 204

        # deleting again -> 404
        d2 = session.delete(f"{BASE_URL}/spells/{sid}")
        assert d2.status_code == 404

        # GET -> 404
        g = session.get(f"{BASE_URL}/spells/{sid}")
        assert g.status_code == 404

    def test_delete_nonexistent_returns_404(self, session):
        r = session.delete(f"{BASE_URL}/spells/{uuid.uuid4()}")
        assert r.status_code == 404


# ---------------- No _id leakage ----------------
class TestNoObjectIdLeak:
    def test_list_no_underscore_id(self, session):
        r = session.get(f"{BASE_URL}/spells", params={"limit": 20})
        assert r.status_code == 200
        for s in r.json():
            assert "_id" not in s

    def test_detail_no_underscore_id(self, session):
        r = session.get(f"{BASE_URL}/spells", params={"limit": 1})
        sid = r.json()[0]["id"]
        detail = session.get(f"{BASE_URL}/spells/{sid}")
        assert "_id" not in detail.json()
