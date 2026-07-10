import json
import logging
import os
import re
import uuid
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="GrimorioApp API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------- Models ----------------
class Spell(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome_italiano: str
    livello: str
    tempo_di_lancio: str
    gittata: str
    componenti: str
    durata: str
    descrizione: str
    # Parsed metadata
    livello_num: int  # 0 for cantrip (Trucchetto), otherwise 1-9, -1 unknown
    scuola: str
    classi: List[str]


class SpellUpdate(BaseModel):
    livello: Optional[str] = None
    tempo_di_lancio: Optional[str] = None
    gittata: Optional[str] = None
    componenti: Optional[str] = None
    durata: Optional[str] = None
    descrizione: Optional[str] = None


# ---------------- Parsing helpers ----------------
SCHOOL_KEYWORDS = [
    "Abiurazione",
    "Ammaliamento",
    "Divinazione",
    "Evocazione",
    "Illusione",
    "Invocazione",
    "Necromanzia",
    "Trasmutazione",
]

_level_re = re.compile(r"(\d+)°\s*livello", re.IGNORECASE)
_classes_re = re.compile(r"\(([^)]+)\)")


def parse_livello(livello_str: str) -> tuple[int, str, List[str]]:
    """Parse strings like:
    'Divinazione di 2° livello (mago, stregone, warlock)'
    'Trucchetto di Ammaliamento (bardo)'
    Returns (livello_num, scuola, classi).
    """
    s = livello_str or ""
    # School
    scuola = ""
    for sk in SCHOOL_KEYWORDS:
        if sk.lower() in s.lower():
            scuola = sk
            break

    # Level number
    livello_num = -1
    if "trucchetto" in s.lower():
        livello_num = 0
    else:
        m = _level_re.search(s)
        if m:
            try:
                livello_num = int(m.group(1))
            except ValueError:
                livello_num = -1

    # Classes inside parentheses
    classi: List[str] = []
    m2 = _classes_re.search(s)
    if m2:
        raw = m2.group(1)
        classi = [c.strip().lower() for c in raw.split(",") if c.strip()]

    return livello_num, scuola, classi


# ---------------- Seed ----------------
async def seed_spells_if_empty():
    # We re-seed only if collection is empty OR count differs from source file (initial load).
    seed_file = ROOT_DIR / "incantesimi_2024.json"
    if seed_file.exists():
        with seed_file.open("r", encoding="utf-8") as f:
            source_count = len(json.load(f))
    else:
        source_count = 0

    count = await db.spells.count_documents({})
    # Only re-seed if source has more spells than we have (initial load or additions)
    # AND no user edits exist (user_edited flag)
    if count > 0:
        user_edited = await db.spells.count_documents({"user_edited": True})
        if count >= source_count or user_edited > 0:
            logger.info(
                f"Spells collection has {count} docs (source={source_count}, edited={user_edited}). Skipping re-seed."
            )
            return
        # Drop and re-seed to pick up new spells added to the source file
        logger.info(f"Re-seeding: collection has {count}, source has {source_count}.")
        await db.spells.drop()

    seed_file = ROOT_DIR / "incantesimi_2024.json"
    if not seed_file.exists():
        logger.warning("incantesimi_2024.json not found, skipping seed.")
        return

    with seed_file.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    docs = []
    for item in raw:
        livello_num, scuola, classi = parse_livello(item.get("livello", ""))
        docs.append(
            {
                "id": str(uuid.uuid4()),
                "nome_italiano": item.get("nome_italiano", "").strip(),
                "livello": item.get("livello", ""),
                "tempo_di_lancio": item.get("tempo_di_lancio", ""),
                "gittata": item.get("gittata", ""),
                "componenti": item.get("componenti", ""),
                "durata": item.get("durata", ""),
                "descrizione": item.get("descrizione", ""),
                "livello_num": livello_num,
                "scuola": scuola,
                "classi": classi,
            }
        )

    if docs:
        await db.spells.insert_many(docs)
        # Create indexes for search
        await db.spells.create_index("nome_italiano")
        await db.spells.create_index("scuola")
        await db.spells.create_index("livello_num")
        await db.spells.create_index("classi")
        logger.info(f"Seeded {len(docs)} spells.")


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "GrimorioApp API", "status": "ok"}


@api_router.get("/spells", response_model=List[Spell])
async def list_spells(
    q: Optional[str] = Query(None, description="Search by name (contains)"),
    livello: Optional[int] = Query(None, description="Filter by level (0-9)"),
    scuola: Optional[str] = Query(None, description="Filter by school"),
    classe: Optional[str] = Query(None, description="Filter by class (lowercase)"),
    limit: int = Query(500, ge=1, le=1000),
):
    filt: dict = {}
    if q:
        # Case-insensitive contains match on name
        filt["nome_italiano"] = {"$regex": re.escape(q), "$options": "i"}
    if livello is not None:
        filt["livello_num"] = livello
    if scuola:
        filt["scuola"] = {"$regex": f"^{re.escape(scuola)}$", "$options": "i"}
    if classe:
        filt["classi"] = classe.lower()

    cursor = db.spells.find(filt, {"_id": 0}).sort("nome_italiano", 1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [Spell(**d) for d in docs]


@api_router.get("/spells/meta")
async def spells_meta():
    """Returns available filter values: levels, schools, classes."""
    scuole = await db.spells.distinct("scuola")
    classi = await db.spells.distinct("classi")
    livelli = await db.spells.distinct("livello_num")
    return {
        "scuole": sorted([s for s in scuole if s]),
        "classi": sorted([c for c in classi if c]),
        "livelli": sorted([lv for lv in livelli if lv is not None and lv >= 0]),
    }


@api_router.get("/spells/{spell_id}", response_model=Spell)
async def get_spell(spell_id: str):
    doc = await db.spells.find_one({"id": spell_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Spell not found")
    return Spell(**doc)


@api_router.patch("/spells/{spell_id}", response_model=Spell)
async def update_spell(spell_id: str, update: SpellUpdate):
    doc = await db.spells.find_one({"id": spell_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Spell not found")

    changes = {k: v for k, v in update.dict().items() if v is not None}
    if not changes:
        return Spell(**doc)

    # If livello changed, re-parse metadata
    if "livello" in changes:
        livello_num, scuola, classi = parse_livello(changes["livello"])
        changes["livello_num"] = livello_num
        changes["scuola"] = scuola
        changes["classi"] = classi

    changes["user_edited"] = True
    await db.spells.update_one({"id": spell_id}, {"$set": changes})
    updated = await db.spells.find_one({"id": spell_id}, {"_id": 0})
    return Spell(**updated)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        await seed_spells_if_empty()
    except Exception as e:
        logger.exception(f"Seed failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
