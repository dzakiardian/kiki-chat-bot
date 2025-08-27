const out = document.getElementById("out");
const input = document.getElementById("pesan");
const btn = document.getElementById("kirim");

function addMsg(text, cls) {
    const p = document.createElement("div");
    p.className = `msg ${cls}`;
    p.textContent = text;
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
}

async function tanya(q) {
    addMsg(`[Kamu] > ${q}`, "user");
    const wait = "sedang mengetik...";
    const temp = document.createElement("div");
    temp.className = "msg ai";
    temp.textContent = wait;
    out.appendChild(temp);
    out.scrollTop = out.scrollHeight;

    const res = await fetch("/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            question: q
        })
    });
    const data = await res.json();
    temp.textContent = `[AI] > ${data.answer}`;
}

btn.addEventListener("click", () => {
    const q = input.value.trim();
    if (!q) return;
    tanya(q);
    input.value = "";
    input.focus();
});

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
});
