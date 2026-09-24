const $ = id => document.getElementById(id);
const KEY = "jobSearchTasks";
let tasks = [], editingId = null;

function load(){ try{ tasks = JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ tasks = []; } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(tasks)); }catch(e){} }
const today = () => new Date().toISOString().slice(0,10);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl = u => /^https?:\/\//i.test(u) ? u : "";

// fill category filter from the form's options
[...$("category").options].forEach(o => $("fCategory").add(new Option(o.value, o.value)));

$("form").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    title: $("title").value.trim(), company: $("company").value.trim(),
    category: $("category").value, due: $("due").value, priority: $("priority").value,
    link: $("link").value.trim(), notes: $("notes").value.trim()
  };
  if(!data.title) return;
  if(editingId){
    tasks = tasks.map(t => t.id === editingId ? {...t, ...data} : t);
  } else {
    tasks.unshift({id: Date.now(), done:false, created: Date.now(), ...data});
  }
  save(); resetForm(); render();
});

function resetForm(){
  editingId = null; $("form").reset();
  $("submitBtn").textContent = "Add task"; $("cancelBtn").hidden = true;
}
$("cancelBtn").onclick = resetForm;

function startEdit(id){
  const t = tasks.find(x => x.id === id); if(!t) return;
  editingId = id;
  ["title","company","category","due","priority","link","notes"].forEach(k => $(k).value = t[k] || "");
  $("submitBtn").textContent = "Save changes"; $("cancelBtn").hidden = false;
  $("title").focus(); window.scrollTo({top:0, behavior:"smooth"});
}

$("list").addEventListener("click", e => {
  const li = e.target.closest("li.task"); if(!li) return;
  const id = Number(li.dataset.id);
  if(e.target.matches(".del")){ tasks = tasks.filter(t => t.id !== id); save(); render(); }
  if(e.target.matches(".edit")) startEdit(id);
});
$("list").addEventListener("change", e => {
  if(!e.target.matches("input[type=checkbox]")) return;
  const id = Number(e.target.closest("li").dataset.id);
  tasks = tasks.map(t => t.id === id ? {...t, done:e.target.checked} : t);
  save(); render();
});
$("clearDone").onclick = () => {
  if(tasks.some(t => t.done) && confirm("Remove all completed tasks?")){ tasks = tasks.filter(t => !t.done); save(); render(); }
};
["search","fCategory","fStatus","sort"].forEach(id => $(id).addEventListener("input", render));

function render(){
  const q = $("search").value.toLowerCase(), fc = $("fCategory").value, fs = $("fStatus").value;
  const rank = {High:0, Medium:1, Low:2};
  let view = tasks.filter(t =>
    (!q || (t.title + " " + t.company).toLowerCase().includes(q)) &&
    (!fc || t.category === fc) &&
    (!fs || (fs === "done") === t.done));
  const s = $("sort").value;
  view.sort((a,b) =>
    s === "priority" ? rank[a.priority] - rank[b.priority] :
    s === "new" ? b.created - a.created :
    (a.due || "9999").localeCompare(b.due || "9999"));

  $("list").innerHTML = view.length ? view.map(t => {
    const late = t.due && !t.done && t.due < today();
    const url = safeUrl(t.link);
    return `<li class="task ${t.done ? "done" : ""}" data-id="${t.id}">
      <input type="checkbox" ${t.done ? "checked" : ""} aria-label="Mark complete">
      <div>
        <div class="title">${esc(t.title)}${t.company ? " – " + esc(t.company) : ""}</div>
        <div class="meta">
          <span class="tag">${esc(t.category)}</span>
          <span class="tag ${esc(t.priority)}">${esc(t.priority)}</span>
          ${t.due ? `<span class="${late ? "overdue" : ""}">${late ? "Overdue: " : "Due "}${esc(t.due)}</span>` : ""}
          ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">Job link</a>` : ""}
        </div>
        ${t.notes ? `<div class="notes">${esc(t.notes)}</div>` : ""}
      </div>
      <div class="actions"><button class="edit">Edit</button><button class="del">Delete</button></div>
    </li>`;
  }).join("") : `<li class="empty">${tasks.length ? "No tasks match your filters." : "No tasks yet. Add your first application or follow-up above."}</li>`;

  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $("sTotal").textContent = tasks.length; $("sDone").textContent = done;
  $("sDue").textContent = tasks.filter(t => !t.done && t.due && t.due <= today()).length;
  $("sPct").textContent = pct + "%"; $("bar").style.width = pct + "%";
}

load(); render();
