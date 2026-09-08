"""Idempotent seed regression tests.

Verifies that restarting the backend does NOT:
- drop the spells collection
- delete or overwrite user-created/user-edited spells
- create duplicates

And verifies that on second startup the seed logs 'No new spells to seed'.
"""

import os
import time
import uuid
import subprocess

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"
PALLA_ID = "7f303fb3-4a11-4659-b907-f174f3f38f2a"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _wait_for_backend(sess, timeout=45):
    deadline = time.time() + timeout
    last_exc = None
    while time.time() < deadline:
        try:
            r = sess.get(f"{BASE_URL}/", timeout=5)
            if r.status_code == 200:
                return True
        except Exception as e:
            last_exc = e
        time.sleep(1)
    raise RuntimeError(f"Backend did not come back up: {last_exc}")


def _restart_backend():
    subprocess.run(
        ["sudo", "supervisorctl", "restart", "backend"],
        check=True, capture_output=True, text=True,
    )


class TestSeedIdempotency:
    """Full integration flow: snapshot -> create -> restart -> verify."""

    def test_seed_is_idempotent_and_preserves_user_data(self, session):
        # 1. Snapshot BEFORE restart
        r = session.get(f"{BASE_URL}/spells", params={"limit": 1000})
        assert r.status_code == 200
        before = r.json()
        count_before = len(before)
        assert count_before >= 370, f"expected >=370 spells before restart, got {count_before}"

        # Snapshot Palla di Fuoco (user-created)
        r = session.get(f"{BASE_URL}/spells/{PALLA_ID}")
        assert r.status_code == 200, f"Palla di Fuoco missing before restart: {r.text}"
        palla_before = r.json()
        assert palla_before["nome_italiano"] == "Palla di Fuoco"
        desc_before = palla_before["descrizione"]
        desc_len_before = len(desc_before)
        assert desc_len_before > 0, "Palla di Fuoco description empty before restart"

        # 2. Create a NEW test spell to verify it survives restart
        test_name = f"TEST_Idempotency_Alpha_{uuid.uuid4().hex[:6]}"
        create_payload = {
            "nome_italiano": test_name,
            "livello": "Evocazione di 3° livello (mago, stregone)",
            "tempo_di_lancio": "1 azione",
            "gittata": "45 metri",
            "componenti": "V, S, M",
            "durata": "Istantanea",
            "descrizione": "TEST_DESC created to verify restart idempotency. " * 3,
        }
        r = session.post(f"{BASE_URL}/spells", json=create_payload)
        assert r.status_code == 201, r.text
        created = r.json()
        created_id = created["id"]

        try:
            # 3. RESTART backend
            _restart_backend()
            _wait_for_backend(session)

            # 4. Verify total count is preserved (+1 for our test spell)
            r = session.get(f"{BASE_URL}/spells", params={"limit": 1000})
            assert r.status_code == 200
            after = r.json()
            count_after = len(after)
            assert count_after == count_before + 1, (
                f"Spell count changed unexpectedly: before={count_before}, "
                f"after={count_after} (delta expected +1)"
            )

            # 5. Verify no duplicates by name (case-insensitive)
            names = [s["nome_italiano"].strip().lower() for s in after]
            assert len(names) == len(set(names)), (
                f"Duplicate spell names detected after restart: "
                f"{[n for n in names if names.count(n) > 1][:10]}"
            )

            # 6. Verify Palla di Fuoco is intact
            r = session.get(f"{BASE_URL}/spells/{PALLA_ID}")
            assert r.status_code == 200, "Palla di Fuoco disappeared after restart"
            palla_after = r.json()
            assert palla_after["nome_italiano"] == "Palla di Fuoco"
            assert palla_after["descrizione"] == desc_before, (
                "Palla di Fuoco description mutated by seed! "
                f"len before={desc_len_before}, len after={len(palla_after['descrizione'])}"
            )
            assert palla_after["livello_num"] == palla_before["livello_num"]
            assert palla_after["scuola"] == palla_before["scuola"]
            assert palla_after["classi"] == palla_before["classi"]

            # 7. Verify test spell survived AND was not duplicated
            r = session.get(f"{BASE_URL}/spells/{created_id}")
            assert r.status_code == 200, "Test spell disappeared after restart"
            after_created = r.json()
            assert after_created["nome_italiano"] == test_name
            assert after_created["descrizione"] == create_payload["descrizione"]

            r = session.get(f"{BASE_URL}/spells", params={"q": test_name})
            matches = [s for s in r.json() if s["nome_italiano"] == test_name]
            assert len(matches) == 1, f"Expected exactly 1 copy of test spell, got {len(matches)}"
        finally:
            # Cleanup
            session.delete(f"{BASE_URL}/spells/{created_id}")

    def test_backend_log_contains_no_new_spells_to_seed(self):
        """After the restart in the previous test, the latest backend log line
        for seeding should be 'No new spells to seed'."""
        out = subprocess.run(
            ["tail", "-n", "300", "/var/log/supervisor/backend.out.log"],
            capture_output=True, text=True, check=True,
        ).stdout
        err = subprocess.run(
            ["tail", "-n", "300", "/var/log/supervisor/backend.err.log"],
            capture_output=True, text=True, check=True,
        ).stdout
        combined = out + "\n" + err
        assert "No new spells to seed" in combined, (
            "Expected 'No new spells to seed' log line after restart. "
            f"Last logs:\n{combined[-2000:]}"
        )
        # And it must NEVER say it dropped
        assert "drop" not in combined.lower() or "dropped" not in combined.lower(), (
            "Backend log mentions 'drop' — seed should never drop the collection."
        )


class TestExistingEndpointsStillWork:
    """Sanity check that all endpoints continue to work after the seed rewrite."""

    def test_get_spells_meta(self, session):
        r = session.get(f"{BASE_URL}/spells/meta")
        assert r.status_code == 200, r.text
        data = r.json()
        assert set(data.keys()) == {"scuole", "classi", "livelli"}
        assert len(data["scuole"]) >= 1
        assert 0 in data["livelli"]  # trucchetto
        assert 9 in data["livelli"]

    def test_get_spells_suggestions(self, session):
        r = session.get(f"{BASE_URL}/spells/suggestions")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("livello", "tempo_di_lancio", "gittata", "componenti", "durata", "scuole"):
            assert k in data
        assert len(data["scuole"]) == 8

    def test_full_crud_cycle(self, session):
        name = f"TEST_CRUD_{uuid.uuid4().hex[:6]}"
        # CREATE
        c = session.post(f"{BASE_URL}/spells", json={
            "nome_italiano": name,
            "livello": "Trucchetto di Illusione (bardo)",
            "descrizione": "orig",
        })
        assert c.status_code == 201, c.text
        sid = c.json()["id"]
        assert c.json()["livello_num"] == 0
        # PATCH
        p = session.patch(f"{BASE_URL}/spells/{sid}", json={"descrizione": "updated"})
        assert p.status_code == 200
        assert p.json()["descrizione"] == "updated"
        # GET verify persistence
        g = session.get(f"{BASE_URL}/spells/{sid}")
        assert g.status_code == 200
        assert g.json()["descrizione"] == "updated"
        # DELETE
        d = session.delete(f"{BASE_URL}/spells/{sid}")
        assert d.status_code == 204
        # GET -> 404
        g2 = session.get(f"{BASE_URL}/spells/{sid}")
        assert g2.status_code == 404
