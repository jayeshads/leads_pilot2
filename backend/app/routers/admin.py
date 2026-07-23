"""
Admin CRM — configuration and operations surface for LeadPilot admins.

Everything here requires profiles.role == 'admin' (see app/auth.py
require_admin). This is the backend for frontend/src/pages/admin/{MetaConfig,
Plans,KnowledgeBase,Users,Billing,Support}.tsx.

Every mutating endpoint still writes an audit log entry (see
admin_store.write_audit_log) for accountability, even though there's no
longer a dedicated Audit Logs viewer page — that data lives in the
ai_admin_audit_log table if it's ever needed directly.
"""
import io
import os
import secrets
import string
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from pypdf import PdfReader

from app import config
from app.auth import CurrentUser, get_current_user, require_admin
from app.db import admin_store, user_store
from app.services import crypto_service, supabase_admin_service
from app.services.chunking import chunk_text
from app.services.supabase_admin_service import SupabaseAdminError

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _audit(request: Request, user: CurrentUser, action: str, target_type: str = None,
           target_id: str = None, metadata: dict = None):
    admin_store.write_audit_log(
        actor_id=user.id, actor_email=user.email, actor_role=user.role,
        action=action, target_type=target_type, target_id=target_id,
        ip_address=request.client.host if request.client else None, metadata=metadata,
    )


# ===========================================================================
# Meta app-level configuration
# ===========================================================================

class MetaConfigIn(BaseModel):
    app_id: str = ""
    app_secret: Optional[str] = None
    verify_token: str = ""
    webhook_secret: Optional[str] = None
    business_manager_id: str = ""
    default_pixel_id: str = ""


def _meta_config_out(row: dict) -> dict:
    if not row:
        return {
            "app_id": "", "verify_token": "", "business_manager_id": "", "default_pixel_id": "",
            "app_secret_configured": False, "app_secret_masked": "",
            "webhook_secret_configured": False, "webhook_secret_masked": "",
        }
    app_secret_enc = row.pop("app_secret_encrypted", "")
    webhook_secret_enc = row.pop("webhook_secret_encrypted", "")
    row["app_secret_configured"] = bool(app_secret_enc)
    row["webhook_secret_configured"] = bool(webhook_secret_enc)
    row["app_secret_masked"] = crypto_service.mask_secret(crypto_service.decrypt_secret(app_secret_enc)) if app_secret_enc else ""
    row["webhook_secret_masked"] = crypto_service.mask_secret(crypto_service.decrypt_secret(webhook_secret_enc)) if webhook_secret_enc else ""
    return row


@router.get("/meta-config")
def get_meta_config():
    return _meta_config_out(admin_store.get_meta_config())


@router.put("/meta-config")
def save_meta_config(payload: MetaConfigIn, request: Request, user: CurrentUser = Depends(get_current_user)):
    app_secret_enc = None
    if payload.app_secret is not None and not crypto_service.looks_masked(payload.app_secret):
        app_secret_enc = crypto_service.encrypt_secret(payload.app_secret)
    webhook_secret_enc = None
    if payload.webhook_secret is not None and not crypto_service.looks_masked(payload.webhook_secret):
        webhook_secret_enc = crypto_service.encrypt_secret(payload.webhook_secret)

    row = admin_store.upsert_meta_config(
        payload.app_id, app_secret_enc, payload.verify_token, webhook_secret_enc,
        payload.business_manager_id, payload.default_pixel_id,
    )
    _audit(request, user, "Updated Meta App configuration", "meta_config", "default")
    return _meta_config_out(row)


# ===========================================================================
# Admin-managed Knowledge Base (playbooks/SOPs)
#
# Distinct from each business's own RAG KB (app/services/rag_service.py,
# POST /knowledgebase/upload) — this is admin-curated reference material.
# Per scope: parses + chunks the document and tracks status/versioning, but
# does NOT embed it into a vector store yet. chunk_count here is a real count
# from the same chunker rag_service uses (app/services/chunking.py), not a
# random placeholder number — embeddings are the next phase.
# ===========================================================================

KB_STORAGE_PATH = os.path.join(config.STORAGE_PATH, "admin_kb")


def _extract_text(filename: str, raw: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(raw))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            raise HTTPException(400, f"Could not read PDF: {e}")
    if lower.endswith(".docx"):
        try:
            import docx  # python-docx; see note in completion report if not installed
            document = docx.Document(io.BytesIO(raw))
            return "\n".join(p.text for p in document.paragraphs)
        except ImportError:
            raise HTTPException(
                503,
                "DOCX support requires the 'python-docx' package, which isn't installed "
                "in this environment yet. Upload as PDF/TXT/MD for now, or add "
                "python-docx to backend/requirements.txt.",
            )
        except Exception as e:
            raise HTTPException(400, f"Could not read DOCX: {e}")
    # .txt / .md / anything else: treat as plain text
    try:
        return raw.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(400, f"Could not read file as text: {e}")


@router.get("/knowledge-base")
def list_kb_documents(category: Optional[str] = None, search: Optional[str] = None):
    return admin_store.list_kb_documents(category=category, search=search)


@router.get("/knowledge-base/{doc_id}")
def get_kb_document(doc_id: str):
    doc = admin_store.get_kb_document(doc_id)
    if not doc:
        raise HTTPException(404, f"No such document: {doc_id}")
    return doc


@router.get("/knowledge-base/{doc_id}/versions")
def get_kb_document_versions(doc_id: str):
    if not admin_store.get_kb_document(doc_id):
        raise HTTPException(404, f"No such document: {doc_id}")
    return admin_store.list_kb_document_versions(doc_id)


@router.get("/knowledge-base/{doc_id}/preview")
def preview_kb_document(doc_id: str):
    """Returns extracted plain text (first 5000 chars) for in-admin preview,
    rather than serving the raw file — keeps this endpoint simple and safe
    regardless of original file type."""
    doc = admin_store.get_kb_document(doc_id)
    if not doc:
        raise HTTPException(404, f"No such document: {doc_id}")
    if not os.path.exists(doc["file_path"]):
        raise HTTPException(404, "Stored file is missing from disk.")
    with open(doc["file_path"], "rb") as f:
        raw = f.read()
    text = _extract_text(doc["original_filename"], raw)
    return {"id": doc_id, "preview": text[:5000], "truncated": len(text) > 5000}


@router.post("/knowledge-base/upload")
async def upload_kb_document(request: Request, name: str = Form(...), category: str = Form("General"),
                              file: UploadFile = File(...), user: CurrentUser = Depends(get_current_user)):
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Uploaded file is empty.")
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(400, "File exceeds the 20MB limit.")

    os.makedirs(KB_STORAGE_PATH, exist_ok=True)
    stored_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(KB_STORAGE_PATH, stored_name)
    with open(file_path, "wb") as f:
        f.write(raw)

    try:
        text = _extract_text(file.filename, raw)
        chunks = chunk_text(text, chunk_size=config.DEFAULT_CHUNK_SIZE, overlap=config.DEFAULT_CHUNK_OVERLAP) if text.strip() else []
        doc = admin_store.create_kb_document(
            name=name, category=category, file_path=file_path, original_filename=file.filename,
            content_type=file.content_type, size_bytes=len(raw), chunk_count=len(chunks), uploaded_by=user.id,
        )
    except HTTPException as e:
        # Parsing failed — keep the doc record so the admin can see/retry, marked failed.
        doc = admin_store.create_kb_document(
            name=name, category=category, file_path=file_path, original_filename=file.filename,
            content_type=file.content_type, size_bytes=len(raw), chunk_count=0, uploaded_by=user.id,
        )
        admin_store.set_kb_document_status(doc["id"], "failed", e.detail)
        doc = admin_store.get_kb_document(doc["id"])

    _audit(request, user, f"Uploaded knowledge base document: {name}", "kb_document", doc["id"])
    return doc


@router.put("/knowledge-base/{doc_id}/replace")
async def replace_kb_document(doc_id: str, request: Request, file: UploadFile = File(...),
                               user: CurrentUser = Depends(get_current_user)):
    doc = admin_store.get_kb_document(doc_id)
    if not doc:
        raise HTTPException(404, f"No such document: {doc_id}")
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Uploaded file is empty.")

    os.makedirs(KB_STORAGE_PATH, exist_ok=True)
    stored_name = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(KB_STORAGE_PATH, stored_name)
    with open(file_path, "wb") as f:
        f.write(raw)

    text = _extract_text(file.filename, raw)
    chunks = chunk_text(text, chunk_size=config.DEFAULT_CHUNK_SIZE, overlap=config.DEFAULT_CHUNK_OVERLAP) if text.strip() else []
    updated = admin_store.replace_kb_document(
        doc_id, file_path, file.filename, file.content_type, len(raw), len(chunks), user.id
    )
    _audit(request, user, f"Replaced knowledge base document: {doc['name']} (now v{updated['version']})",
           "kb_document", doc_id)
    return updated


@router.post("/knowledge-base/{doc_id}/rollback/{version}")
def rollback_kb_document(doc_id: str, version: int, request: Request, user: CurrentUser = Depends(get_current_user)):
    updated = admin_store.rollback_kb_document(doc_id, version)
    if not updated:
        raise HTTPException(404, "No such document/version.")
    _audit(request, user, f"Rolled back knowledge base document {doc_id} to v{version}", "kb_document", doc_id)
    return updated


@router.post("/knowledge-base/{doc_id}/toggle")
def toggle_kb_document(doc_id: str, request: Request, user: CurrentUser = Depends(get_current_user)):
    doc = admin_store.get_kb_document(doc_id)
    if not doc:
        raise HTTPException(404, f"No such document: {doc_id}")
    updated = admin_store.set_kb_document_enabled(doc_id, not doc["enabled"])
    _audit(request, user, f"{'Enabled' if updated['enabled'] else 'Disabled'} knowledge base document: {doc['name']}",
           "kb_document", doc_id)
    return updated


@router.delete("/knowledge-base/{doc_id}")
def delete_kb_document(doc_id: str, request: Request, user: CurrentUser = Depends(get_current_user)):
    doc = admin_store.get_kb_document(doc_id)
    if not doc:
        raise HTTPException(404, f"No such document: {doc_id}")
    admin_store.delete_kb_document(doc_id)
    try:
        if os.path.exists(doc["file_path"]):
            os.remove(doc["file_path"])
    except OSError:
        pass  # best-effort disk cleanup; DB record is already gone
    _audit(request, user, f"Deleted knowledge base document: {doc['name']}", "kb_document", doc_id)
    return {"deleted": True}


# ===========================================================================
# Users
# ===========================================================================
# Full account management for LeadPilot's own users — as opposed to the
# "Admins" section below it, which only assigns a CRM sub-role to accounts
# that already have profiles.role='admin'. This is the "Create New User" /
# "Create New Admin" / block / freeze funds surface. Reads/writes go through
# app/db/user_store.py, straight to the dashboard's own `profiles` table
# (not an ai_-prefixed shadow copy — see that module's docstring).
#
# Note on the ticket's "expose password" ask: not implemented, and can't be
# — Supabase (like any reasonable auth system) stores only a salted hash of
# the password and never exposes it through any API, admin or otherwise.
# "Reset password" below is the closest safe equivalent: it issues a new
# one-time password the admin can hand to the user.

class UserCreateIn(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str = ""
    role: str = "client"  # "client" or "admin"


class UserStatusIn(BaseModel):
    status: str  # "active" or "blocked"


class FundsFrozenIn(BaseModel):
    frozen: bool


@router.get("/users")
def list_users():
    return user_store.list_users()


@router.get("/users/{user_id}")
def get_user_detail(user_id: str):
    detail = user_store.get_user_detail(user_id)
    if not detail:
        raise HTTPException(404, "No such user.")
    return detail


@router.post("/users")
def create_user(payload: UserCreateIn, request: Request, user: CurrentUser = Depends(get_current_user)):
    if payload.role not in ("client", "admin"):
        raise HTTPException(422, "role must be 'client' or 'admin'")
    if len(payload.password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters.")
    if user_store.find_by_email(payload.email):
        raise HTTPException(409, f"A user with email {payload.email} already exists.")

    try:
        auth_user = supabase_admin_service.create_user(
            payload.email, payload.password, payload.full_name, payload.phone
        )
    except SupabaseAdminError as e:
        raise HTTPException(502, str(e))

    new_id = auth_user.get("id")
    if payload.role == "admin" and new_id:
        user_store.set_role(new_id, "admin")

    _audit(request, user, f"Created new {payload.role} account: {payload.email}", "user", new_id)
    return user_store.get_user(new_id) if new_id else {"created": True}


@router.put("/users/{user_id}/status")
def set_user_status(user_id: str, payload: UserStatusIn, request: Request,
                     user: CurrentUser = Depends(get_current_user)):
    if payload.status not in ("active", "blocked"):
        raise HTTPException(422, "status must be 'active' or 'blocked'")
    if user_id == user.id and payload.status == "blocked":
        raise HTTPException(400, "You cannot block your own account.")
    row = user_store.set_user_status(user_id, payload.status)
    if not row:
        raise HTTPException(404, "No such user.")
    action = "Blocked" if payload.status == "blocked" else "Unblocked"
    _audit(request, user, f"{action} user {row.get('email')}", "user", user_id)
    return row


@router.put("/users/{user_id}/funds-frozen")
def set_user_funds_frozen(user_id: str, payload: FundsFrozenIn, request: Request,
                           user: CurrentUser = Depends(get_current_user)):
    row = user_store.set_funds_frozen(user_id, payload.frozen)
    if not row:
        raise HTTPException(404, "No such user.")
    action = "Froze" if payload.frozen else "Unfroze"
    _audit(request, user, f"{action} funds for user {row.get('email')}", "user", user_id)
    return row


@router.post("/users/{user_id}/reset-password")
def reset_user_password(user_id: str, request: Request, user: CurrentUser = Depends(get_current_user)):
    """Issues a new random password for the user and returns it once — the
    admin is expected to relay it to the user through a secure channel.
    It is never stored or logged."""
    target = user_store.get_user(user_id)
    if not target:
        raise HTTPException(404, "No such user.")
    alphabet = string.ascii_letters + string.digits
    new_password = "".join(secrets.choice(alphabet) for _ in range(14))
    try:
        supabase_admin_service.set_user_password(user_id, new_password)
    except SupabaseAdminError as e:
        raise HTTPException(502, str(e))
    _audit(request, user, f"Reset password for user {target.get('email')}", "user", user_id)
    return {"email": target.get("email"), "new_password": new_password}


# ===========================================================================
# Plans
# ===========================================================================

class PlanIn(BaseModel):
    name: str
    price_monthly: int
    campaign_limit: int
    leads_limit: int
    features: list[str] = []
    active: bool = True


@router.get("/plans")
def list_plans():
    return admin_store.list_plans()


@router.post("/plans")
def create_plan(payload: PlanIn, request: Request, user: CurrentUser = Depends(get_current_user)):
    row = admin_store.create_plan(payload.name, payload.price_monthly, payload.campaign_limit,
                                   payload.leads_limit, payload.features)
    _audit(request, user, f"Created plan: {payload.name}", "plan", row["id"])
    return row


@router.put("/plans/{plan_id}")
def update_plan(plan_id: str, payload: PlanIn, request: Request, user: CurrentUser = Depends(get_current_user)):
    row = admin_store.update_plan(plan_id, payload.name, payload.price_monthly, payload.campaign_limit,
                                   payload.leads_limit, payload.features, payload.active)
    if not row:
        raise HTTPException(404, f"No such plan: {plan_id}")
    _audit(request, user, f"Updated plan: {payload.name}", "plan", plan_id)
    return row


@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: str, request: Request, user: CurrentUser = Depends(get_current_user)):
    admin_store.delete_plan(plan_id)
    _audit(request, user, f"Deleted plan {plan_id}", "plan", plan_id)
    return {"deleted": True}



