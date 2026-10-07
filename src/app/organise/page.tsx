"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { WorkspaceNotifications } from "@/components/workspace-notifications";
import { WorkspaceRefunds } from "@/components/workspace-refunds";
import { WorkspaceAdmission } from "@/components/workspace-admission";
import { EventDrafts } from "@/components/event-drafts";
import { Plus, Users, Settings2, ArrowRight, X, Building2 } from "lucide-react";

type Workspace = { id: string; name: string; slug: string; status: string; role: string };
type Member = { user_id: string; display_name: string; role: string };
const headers = { "Content-Type": "application/json", "X-Gather-Request": "1" };
export default function Organise() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState("profile");
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [draftLocked, setDraftLocked] = useState(false);
  const roleName = (role: string) => role === "check_in" ? "Check-in" : role.charAt(0).toUpperCase() + role.slice(1);
  const workspace = workspaces.find(item => item.id === selected);
  const canManage = workspace?.role === "owner" && workspace.status !== "suspended";
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/workspaces", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 401) { router.replace("/login?next=/organise"); return; }
      if (!response.ok) throw new Error();
      const items: Workspace[] = await response.json();
      setWorkspaces(items); setLoaded(true);
      setSelected(previous => items.some(item => item.id === previous) ? previous : items[0]?.id ?? "");
    }).catch(error => { if (error.name !== "AbortError") setError("Unable to load workspaces. Please refresh to try again."); });
    return () => controller.abort();
  }, [router, revision]);
  useEffect(() => {
    if (!workspace || workspace.role !== "owner") return;
    const controller = new AbortController();
    fetch(`/api/v1/workspaces/${workspace.id}/members`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      setMembers(await response.json()); setTeamLoading(false);
    }).catch(error => { if (error.name !== "AbortError") { setTeamLoading(false); setError("Unable to load the team. Use Try again to reload it."); } });
    return () => controller.abort();
  }, [workspace, revision]);
  async function mutate(path: string, method: string, body?: object) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/workspaces${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (response.status === 401) { router.replace("/login?next=/organise"); return; }
      if (!response.ok) {
        const result = await response.json();
        throw new Error(typeof result.detail === "string" ? result.detail : "Check your details and try again.");
      }
      if (method === "POST" && path === "") { const created: Workspace = await response.json(); setMembers([]); setTeamLoading(true); setSelected(created.id); setCreating(false); }
      setRemoving(null);
      setNotice(method === "DELETE" ? "Teammate removed." : "Changes saved."); setRevision(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save changes."); }
    finally { setBusy(false); }
  }
  function tabKeys(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="tab"]'));
    if (buttons.length < 2) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : tab === "profile" ? 1 : 0;
    setTab(next === 0 ? "profile" : "team"); buttons[next].focus();
  }
  function profile(event: React.FormEvent<HTMLFormElement>, edit = false) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void mutate(edit ? `/${selected}` : "", edit ? "PATCH" : "POST", { name: data.get("name"), slug: data.get("slug") });
  }
  return <section className="page-title dashboard-page"><div className="page-heading"><div><span className="eyebrow">For people who bring people together</span><h1>Your ideas. Your people.</h1><p className="intro">A home for every team you are part of.</p></div>{loaded && <button className="primary" disabled={busy || draftLocked} onClick={() => setCreating(true)}><Plus size={17} aria-hidden />New workspace</button>}</div>
    {error && <div className="message error" role="alert">{error}<button className="text-button" onClick={() => { setError(""); setTeamLoading(true); setRevision(value => value + 1); }}>Try again</button></div>}{notice && <div className="message success" role="status">{notice}</div>}
    {!loaded ? !error && <div className="panel loading-state" role="status"><span className="loading-dot" />Loading your workspaces...</div> : <>
      {workspaces.length > 0 ? <div className="workspace-layout"><aside className="workspace-sidebar"><span className="eyebrow">Your workspaces</span><div className="workspace-list">{workspaces.map(item => <button disabled={busy || draftLocked} key={item.id} aria-pressed={selected === item.id} className={`workspace-choice ${selected === item.id ? "selected" : ""}`} onClick={() => { setMembers([]); setTeamLoading(true); setSelected(item.id); setError(""); setNotice(""); }}><span className="workspace-avatar" aria-hidden>{item.name.charAt(0).toUpperCase()}</span><span><strong>{item.name}</strong><small>{roleName(item.role)}</small></span><ArrowRight size={15} aria-hidden /></button>)}</div><p className="field-help">Your role can differ in each workspace.</p></aside>
      {workspace && <div className="workspace-content"><div className="workspace-summary"><div className="workspace-avatar large" aria-hidden>{workspace.name.charAt(0).toUpperCase()}</div><div><h2>{workspace.name}</h2><p className="muted">/{workspace.slug}</p></div><div className="workspace-badges"><span className={`badge ${workspace.status === "suspended" ? "danger" : workspace.status === "approved" ? "success" : "pending"}`}>{workspace.status}</span><span className="badge neutral">{roleName(workspace.role)}</span></div></div>
      {workspace.status === "suspended" && <div className="message error">This workspace is suspended. You can view details, but changes are paused.</div>}
      <div className="workspace-tabs" role="tablist" aria-label="Workspace sections" onKeyDown={tabKeys}><button id="profile-tab" tabIndex={tab === "profile" || workspace.role !== "owner" ? 0 : -1} role="tab" aria-selected={tab === "profile" || workspace.role !== "owner"} aria-controls="profile-panel" className={tab === "profile" ? "selected" : ""} onClick={() => setTab("profile")}><Settings2 size={16} aria-hidden />Profile</button>{workspace.role === "owner" && <button id="team-tab" tabIndex={tab === "team" ? 0 : -1} role="tab" aria-selected={tab === "team"} aria-controls="team-panel" className={tab === "team" ? "selected" : ""} onClick={() => setTab("team")}><Users size={16} aria-hidden />Team</button>}</div>
      {tab === "profile" || workspace.role !== "owner" ? <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab" className="panel"><div className="panel-heading"><h3>Workspace profile</h3><p>Give your team a name and a home.</p></div>{canManage ? <form key={workspace.id + revision} className="auth-form" onSubmit={event => profile(event, true)}><fieldset disabled={busy}><label>Workspace name<input name="name" required maxLength={160} defaultValue={workspace.name} /></label><label>Workspace slug<input name="slug" required minLength={3} maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={workspace.slug} /></label><p className="field-help">Lowercase letters, numbers and hyphens. This must be unique.</p></fieldset><div className="form-footer"><span className="field-help">Only workspace owners can edit these details.</span><button className="primary" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button></div></form> : <dl className="detail-list"><div><dt>Workspace name</dt><dd>{workspace.name}</dd></div><div><dt>Workspace slug</dt><dd>{workspace.slug}</dd></div><div><dt>Your access</dt><dd>{workspace.status === "suspended" ? "Changes are paused while this workspace is suspended." : "The owner manages workspace details and team membership."}</dd></div></dl>}</div> : <div id="team-panel" role="tabpanel" aria-labelledby="team-tab" className="panel"><div className="panel-heading"><h3>Your team</h3><p>Choose the right access for each teammate.</p></div>{teamLoading ? <p role="status">Loading team...</p> : <ul className="team-list">{members.map(member => <li key={member.user_id}><span className="member-avatar" aria-hidden>{member.display_name.charAt(0).toUpperCase()}</span><div className="member-name"><strong>{member.display_name}</strong><small>{roleName(member.role)}</small></div>{member.role !== "owner" && canManage ? <><select aria-label={`Role for ${member.display_name}`} value={member.role} disabled={busy} onChange={event => void mutate(`/${selected}/members/${member.user_id}`, "PATCH", { role: event.target.value })}><option value="editor">Editor</option><option value="check_in">Check-in</option></select><button className="text-button danger-text" disabled={busy} onClick={() => setRemoving(member)}>Remove</button></> : <span className="badge neutral">{roleName(member.role)}</span>}</li>)}</ul>}
      {canManage && <form className="auth-form add-member" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void mutate(`/${selected}/members`, "POST", { user_id: data.get("user_id"), role: data.get("role") }); }}><h3>Add a teammate</h3><p className="muted">Ask them to share their account ID from the Account page. Adding them gives access immediately.</p><fieldset disabled={busy}><label>Teammate account account ID<input name="user_id" required pattern="[0-9a-fA-F-]{36}" placeholder="Paste their account ID" /></label><label>Workspace role<select name="role"><option value="editor">Editor</option><option value="check_in">Check-in</option></select></label><p className="field-help">Editors will prepare events. Check-in staff will admit attendees. Neither role can manage this team.</p></fieldset><button className="primary" disabled={busy}><Plus size={16} aria-hidden />Add teammate</button></form>}</div>}
      {["owner", "editor"].includes(workspace.role) && <EventDrafts key={workspace.id} workspaceId={workspace.id} workspaceName={workspace.name} workspaceStatus={workspace.status} canPublish={workspace.role === "owner"} onLockChange={setDraftLocked} />}
      {workspace.role === "owner" && <WorkspaceRefunds key={workspace.id + "-refunds"} workspaceId={workspace.id} />}
      {["owner", "check_in"].includes(workspace.role) && <WorkspaceAdmission key={workspace.id + "-admission"} workspaceId={workspace.id} owner={workspace.role === "owner"} suspended={workspace.status === "suspended"} />}
      {workspace.role === "owner" && <WorkspaceNotifications key={workspace.id + "-notifications"} workspaceId={workspace.id} suspended={workspace.status === "suspended"} />}
      <div className="info-note"><Building2 size={20} aria-hidden /><p>Owners and editors can prepare private event drafts. Configure tickets and media, then publish once your workspace is approved.</p></div>
      </div>}</div> : <div className="panel workspace-empty"><div className="empty-icon"><Users size={30} aria-hidden /></div><h2>Every good event starts with a team.</h2><p>Create your first workspace. You will be its owner and can add editors and check-in staff.</p><button className="primary" onClick={() => setCreating(true)}><Plus size={17} aria-hidden />Create your first workspace</button></div>}
    </>}
    {creating && <Modal titleId="create-heading" busy={busy} onClose={() => setCreating(false)}><button className="dialog-close icon-button" aria-label="Close new workspace" disabled={busy} onClick={() => setCreating(false)}><X size={20} /></button><span className="eyebrow">A home for your team</span><h2 id="create-heading">Create a workspace.</h2><p className="muted">You will start as the owner. New workspaces are marked pending.</p><form className="auth-form" onSubmit={event => profile(event)}><fieldset disabled={busy}><label>Workspace name<input name="name" autoFocus required maxLength={160} placeholder="Your team or organisation" /></label><label>Unique slug<input name="slug" required minLength={3} maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="your-workspace" /></label><p className="field-help">Lowercase letters, numbers and hyphens.</p></fieldset>{error && <div className="message error" role="alert">{error}</div>}<div className="form-footer"><button type="button" className="secondary" disabled={busy} onClick={() => setCreating(false)}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Creating..." : "Create workspace"}</button></div></form></Modal>}
    {removing && <Modal titleId="remove-heading" busy={busy} onClose={() => setRemoving(null)}><h2 id="remove-heading">Remove {removing.display_name}?</h2><p>They will lose access to {workspace?.name}. You can add them again later.</p>{error && <div className="message error" role="alert">{error}</div>}<div className="form-footer"><button className="secondary" autoFocus disabled={busy} onClick={() => setRemoving(null)}>Keep teammate</button><button className="danger-button" disabled={busy} onClick={() => void mutate(`/${selected}/members/${removing.user_id}`, "DELETE")}>{busy ? "Removing..." : "Remove teammate"}</button></div></Modal>}
  </section>;
}

