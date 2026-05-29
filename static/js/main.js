/* ASISST SIMS — main.js (Final — Separate Student/Admin Login Pages) */
(function () {
  "use strict";

  /* ── PARTICLES ─────────────────────────────────── */
  var pw = document.getElementById("pWrap");
  for (var i = 0; i < 12; i++) {
    var p = document.createElement("div");
    p.className = "particle";
    var sz = 3 + Math.random() * 5;
    p.style.cssText = "width:"+sz+"px;height:"+sz+"px;left:"+(Math.random()*100)+"%;" +
      "top:"+(Math.random()*100)+"%;animation-duration:"+(12+Math.random()*18)+"s;" +
      "animation-delay:"+(-Math.random()*18)+"s;opacity:"+(0.05+Math.random()*0.12)+";";
    pw.appendChild(p);
  }

  /* ── STATE ─────────────────────────────────────── */
  var state = { role: null, username: null };

  /* ── UTILITIES ─────────────────────────────────── */
  function $(id) { return document.getElementById(id); }

  function showPage(id) {
    document.querySelectorAll(".page").forEach(function(p){ p.classList.remove("active"); });
    var pg = $(id);
    if (pg) pg.classList.add("active");
  }

  var _nt = null;
  function notif(msg, type) {
    type = type || "ok";
    var n = $("notif");
    n.className = "notif " + type + " show";
    n.innerHTML = (type==="ok" ? "✓ " : type==="err" ? "✗ " : "ℹ ") + msg;
    if (_nt) clearTimeout(_nt);
    _nt = setTimeout(function(){ n.className = "notif"; }, 4000);
  }

  function showErr(id, msg){ var e=$(id); if(e){ e.textContent=msg; e.className="err-msg show"; } }
  function hideErr(id)     { var e=$(id); if(e) e.className="err-msg"; }
  function showOk(id, msg) { var e=$(id); if(e){ e.textContent=msg; e.className="msg-ok show"; } }
  function hideOk(id)      { var e=$(id); if(e) e.className="msg-ok"; }

  function formatDt(s) {
    if (!s || s==="null" || s==="None") return "Never";
    try {
      var clean = s.replace(" ","T");
      if (!clean.includes("Z") && !clean.includes("+")) clean += "Z";
      var d = new Date(clean);
      return isNaN(d) ? s : d.toLocaleString("en-IN",{
        day:"2-digit", month:"short", year:"numeric",
        hour:"2-digit", minute:"2-digit"
      });
    } catch(e){ return s; }
  }

  function api(url, opts) {
    opts = opts || {};
    if (!opts.headers) opts.headers = {};
    if (!(opts.body instanceof FormData))
      opts.headers["Content-Type"] = "application/json";
    return fetch(url, opts).then(function(r){
      if (r.status === 401){ logout(); return {error:"Unauthorized"}; }
      return r.json();
    }).catch(function(e){
      console.error("API error:", url, e);
      return {error:"Cannot connect to server. Is app.py running?"};
    });
  }

  function esc(v){
    return String(v||"")
      .replace(/&/g,"&amp;").replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  /* ── MODALS ─────────────────────────────────────── */
  function openModal(id)  { var m=$(id); if(m) m.classList.add("open");    }
  function closeModal(id) { var m=$(id); if(m) m.classList.remove("open"); }

  document.querySelectorAll("[data-close]").forEach(function(b){
    b.addEventListener("click", function(){ closeModal(b.dataset.close); });
  });
  document.querySelectorAll(".overlay").forEach(function(o){
    o.addEventListener("click", function(e){ if(e.target===o) o.classList.remove("open"); });
  });

  /* ══════════════════════════════════════════
     PAGE NAVIGATION between login screens
  ══════════════════════════════════════════ */

  /* Student login page → Admin login */
  $("go-admin-login").addEventListener("click", function(){
    showPage("pgAdminLogin");
    hideErr("a-err");
    $("a-user").value = "";
    $("a-pass").value = "";
  });

  /* Admin login page → Student login */
  $("go-student-login").addEventListener("click", function(){
    showPage("pgLogin");
    hideErr("s-err");
    $("s-user").value = "";
    $("s-pass").value = "";
  });

  /* Forgot password links */
  $("s-forgot").addEventListener("click", function(){
    $("fp-email").value = "";
    hideErr("fp-err"); hideOk("fp-ok");
    $("fp-token-box").style.display = "none";
    $("fp-back").dataset.returnPage = "pgLogin";
    showPage("pgForgot");
  });

  $("a-forgot").addEventListener("click", function(){
    $("fp-email").value = "";
    hideErr("fp-err"); hideOk("fp-ok");
    $("fp-token-box").style.display = "none";
    $("fp-back").dataset.returnPage = "pgAdminLogin";
    showPage("pgForgot");
  });

  $("fp-back").addEventListener("click", function(){
    showPage($("fp-back").dataset.returnPage || "pgLogin");
  });

  $("rt-back").addEventListener("click", function(){
    showPage("pgForgot");
  });

  /* ══════════════════════════════════════════
     LOGIN — STUDENT
  ══════════════════════════════════════════ */
  function doStudentLogin() {
    var user = $("s-user").value.trim();
    var pass = $("s-pass").value;
    hideErr("s-err");
    if (!user || !pass){ showErr("s-err","Please enter your roll number and password"); return; }
    $("s-login-btn").disabled = true;
    $("s-login-btn").textContent = "Signing in...";
    api("/api/login",{method:"POST",body:JSON.stringify({username:user,password:pass,role:"student"})})
      .then(function(d){
        $("s-login-btn").disabled = false;
        $("s-login-btn").textContent = "Login";
        if (d.success){
          state.role = d.role; state.username = d.username;
          setupDashboard(); showPage("pgDash"); switchSection("overview");
        } else {
          showErr("s-err", d.error || "Invalid username or password");
        }
      });
  }

  $("s-login-btn").addEventListener("click", doStudentLogin);
  $("s-pass").addEventListener("keypress", function(e){ if(e.key==="Enter") doStudentLogin(); });
  $("s-user").addEventListener("keypress", function(e){ if(e.key==="Enter") doStudentLogin(); });

  /* ══════════════════════════════════════════
     LOGIN — ADMIN
  ══════════════════════════════════════════ */
  function doAdminLogin() {
    var user = $("a-user").value.trim();
    var pass = $("a-pass").value;
    hideErr("a-err");
    if (!user || !pass){ showErr("a-err","Please enter your username and password"); return; }
    $("a-login-btn").disabled = true;
    $("a-login-btn").textContent = "Signing in...";
    api("/api/login",{method:"POST",body:JSON.stringify({username:user,password:pass,role:"admin"})})
      .then(function(d){
        $("a-login-btn").disabled = false;
        $("a-login-btn").textContent = "Login";
        if (d.success){
          state.role = d.role; state.username = d.username;
          setupDashboard(); showPage("pgDash"); switchSection("overview");
        } else {
          showErr("a-err", d.error || "Invalid username or password");
        }
      });
  }

  $("a-login-btn").addEventListener("click", doAdminLogin);
  $("a-pass").addEventListener("keypress", function(e){ if(e.key==="Enter") doAdminLogin(); });
  $("a-user").addEventListener("keypress", function(e){ if(e.key==="Enter") doAdminLogin(); });

  /* ══════════════════════════════════════════
     FORGOT PASSWORD
  ══════════════════════════════════════════ */
  $("fp-submit").addEventListener("click", function(){
    var email = $("fp-email").value.trim();
    if (!email){ showErr("fp-err","Please enter your email address"); return; }
    hideErr("fp-err"); hideOk("fp-ok");
    $("fp-submit").disabled = true;
    api("/api/forgot-password",{method:"POST",body:JSON.stringify({email:email})})
      .then(function(d){
        $("fp-submit").disabled = false;
        if (d.success){
          showOk("fp-ok", d.message);
          if (d.demo_token){
            $("fp-token-box").style.display = "block";
            $("fp-token").textContent = d.demo_token;
            notif("Reset token ready — copy it and use it to reset your password","info");
          }
        } else {
          showErr("fp-err", d.error || "Error sending reset token");
        }
      });
  });

  /* ══════════════════════════════════════════
     RESET PASSWORD
  ══════════════════════════════════════════ */
  $("rt-submit").addEventListener("click", function(){
    var tok = $("rt-token").value.trim();
    var pw  = $("rt-pass").value;
    var pw2 = $("rt-pass2").value;
    hideErr("rt-err"); hideOk("rt-ok");
    if (!tok)        { showErr("rt-err","Please paste your reset token"); return; }
    if (pw.length<8) { showErr("rt-err","Password must be at least 8 characters"); return; }
    if (pw !== pw2)  { showErr("rt-err","Passwords do not match"); return; }
    $("rt-submit").disabled = true;
    api("/api/reset-password",{method:"POST",body:JSON.stringify({token:tok,password:pw})})
      .then(function(d){
        $("rt-submit").disabled = false;
        if (d.success){
          showOk("rt-ok", d.message);
          notif("Password reset successfully!");
          setTimeout(function(){ showPage("pgLogin"); },2200);
        } else {
          showErr("rt-err", d.error || "Invalid or expired token");
        }
      });
  });

  /* ══════════════════════════════════════════
     LOGOUT
  ══════════════════════════════════════════ */
  function logout(){
    api("/api/logout",{method:"POST"}).then(function(){
      state.role = null; state.username = null;
      showPage("pgLogin");
      notif("Logged out successfully","info");
    });
  }
  $("logoutBtn").addEventListener("click", logout);

  /* ══════════════════════════════════════════
     SETUP DASHBOARD — Role-Based Access Control
  ══════════════════════════════════════════ */
  function setupDashboard() {
    var isAdmin   = state.role === "admin";
    var isStudent = state.role === "student";

    $("sbRole").textContent  = isAdmin ? "ADMINISTRATOR" : "STUDENT";
    $("sbName").textContent  = state.username || "User";
    $("sbURole").textContent = isAdmin ? "System Administrator" : "Student";
    $("sbAv").textContent    = (state.username || "U").charAt(0).toUpperCase();

    /* Show only the correct nav items */
    document.querySelectorAll(".nav-stu").forEach(function(el){
      el.style.display = isStudent ? "flex" : "none";
    });
    document.querySelectorAll(".nav-adm").forEach(function(el){
      el.style.display = isAdmin ? "flex" : "none";
    });
    document.querySelectorAll(".nav-lbl-adm").forEach(function(el){
      el.style.display = isAdmin ? "block" : "none";
    });

    /* Hide wrong-role content sections */
    ["sec-a-students","sec-a-marks","sec-a-attendance","sec-a-certs","sec-a-logs"].forEach(function(id){
      var el=$(id); if(el) el.style.display = isAdmin ? "" : "none";
    });
    ["sec-profile","sec-marks","sec-attendance","sec-certificates"].forEach(function(id){
      var el=$(id); if(el) el.style.display = isStudent ? "" : "none";
    });

    if ($("adminPwBox")) $("adminPwBox").style.display = isAdmin ? "block" : "none";

    var today = new Date().toISOString().slice(0,10);
    if ($("at-date")) $("at-date").value = today;
  }

  /* ══════════════════════════════════════════
     NAVIGATION
  ══════════════════════════════════════════ */
  var ADMIN_ONLY   = ["a-students","a-marks","a-attendance","a-certs","a-logs"];
  var STUDENT_ONLY = ["profile","marks","attendance","certificates"];

  var titles = {
    overview:"Dashboard Overview", profile:"My Profile", marks:"My Marks",
    attendance:"My Attendance", certificates:"My Certificates",
    "a-students":"All Students", "a-marks":"Upload Marks",
    "a-attendance":"Mark Attendance", "a-certs":"Upload Certificates",
    "a-logs":"Activity Logs", settings:"Settings"
  };

  function switchSection(sec) {
    if (state.role==="student" && ADMIN_ONLY.indexOf(sec)!==-1){
      notif("Access denied — admin only","err"); return;
    }
    if (state.role==="admin" && STUDENT_ONLY.indexOf(sec)!==-1){
      notif("This section is for students only","info"); return;
    }
    document.querySelectorAll(".nav-item").forEach(function(n){ n.classList.remove("active"); });
    var an = document.querySelector('.nav-item[data-sec="'+sec+'"]');
    if (an) an.classList.add("active");
    document.querySelectorAll(".csec").forEach(function(s){ s.classList.remove("active"); });
    var target = $("sec-"+sec);
    if (target){ target.classList.add("active"); target.style.display=""; }
    if ($("tbTitle")) $("tbTitle").textContent = titles[sec] || sec;
    var loaders = {
      overview:loadOverview, profile:loadProfile,
      marks:loadMarks, attendance:loadAttendance, certificates:loadCerts,
      "a-students":loadAdminStudents, "a-logs":loadLogs
    };
    if (loaders[sec]) loaders[sec]();
    if (window.innerWidth<=900){
      $("sidebar").classList.remove("open");
      $("sidebarOverlay").classList.remove("show");
    }
  }

  document.querySelectorAll(".nav-item[data-sec]").forEach(function(item){
    item.addEventListener("click", function(e){
      e.preventDefault(); e.stopPropagation();
      switchSection(item.getAttribute("data-sec"));
    });
  });

  $("menuBtn").addEventListener("click", function(){
    $("sidebar").classList.toggle("open");
    $("sidebarOverlay").classList.toggle("show");
  });
  $("sidebarOverlay").addEventListener("click", function(){
    $("sidebar").classList.remove("open");
    $("sidebarOverlay").classList.remove("show");
  });

  /* ══════════════════════════════════════════
     OVERVIEW
  ══════════════════════════════════════════ */
  function loadOverview(){
    if (state.role==="admin"){
      api("/api/admin/stats").then(function(d){
        $("st-students").textContent = d.total_students   || 0;
        $("st-certs").textContent    = d.certs_issued     || 0;
        $("st-logins").textContent   = d.logins_today     || 0;
        $("st-dl").textContent       = d.certs_downloaded || 0;
        $("st-att").textContent      = "—";
      });
      api("/api/admin/logs?limit=8").then(renderRecentLogs);
    } else {
      $("st-students").textContent = "—";
      $("st-logins").textContent   = "—";
      api("/api/student/attendance").then(function(d){
        $("st-att").textContent = (d.overall||0)+"%";
      });
      api("/api/student/certificates").then(function(d){
        $("st-certs").textContent = Array.isArray(d) ? d.length : "0";
      });
      $("recentLogs").innerHTML =
        '<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text3)">Activity logs are visible to administrators only.</td></tr>';
    }
  }

  function renderRecentLogs(logs){
    var tb = $("recentLogs");
    if (!logs||!logs.length){
      tb.innerHTML='<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--text3)">No recent activity.</td></tr>';
      return;
    }
    tb.innerHTML = logs.slice(0,8).map(function(l){
      return "<tr>"+
        "<td style='white-space:nowrap;font-size:.8rem'>"+formatDt(l.logged_at)+"</td>"+
        "<td>"+esc(l.username||"System")+"</td>"+
        "<td><span class='log-action'>"+esc(l.action)+"</span></td>"+
        "<td style='max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>"+esc(l.description||"")+"</td>"+
        "</tr>";
    }).join("");
  }

  /* ══════════════════════════════════════════
     STUDENT: PROFILE
  ══════════════════════════════════════════ */
  function loadProfile(){
    var box = $("profileContent");
    box.innerHTML = '<div style="text-align:center;padding:3rem"><div class="spinner"></div></div>';
    api("/api/student/profile").then(function(d){
      if (d.error){ box.innerHTML='<p style="color:#c62828;padding:2rem">'+d.error+'</p>'; return; }
      var sfx = d.year==1?"st":d.year==2?"nd":d.year==3?"rd":"th";
      box.innerHTML =
        '<div class="profile-card">'+
        '<div class="prof-av">'+esc(d.full_name.charAt(0))+'</div>'+
        '<div class="prof-info">'+
          '<div class="prof-name">'+esc(d.full_name)+'</div>'+
          '<div class="prof-roll">'+esc(d.roll_number)+' &nbsp;|&nbsp; '+esc(d.email)+'</div>'+
          '<div class="prof-tags">'+
            '<span class="tag b-b">'+esc(d.branch)+'</span>'+
            '<span class="tag b-y">'+d.year+sfx+' Year</span>'+
            '<span class="tag b-g">Sem '+d.semester+'</span>'+
          '</div>'+
          '<div class="prof-details">'+
            pd("Phone",      d.phone    ||"—")+
            pd("Date of Birth", d.dob   ||"—")+
            pd("Guardian",   d.guardian ||"—")+
            pd("Last Login", formatDt(d.last_login))+
          '</div>'+
        '</div></div>'+
        '<div class="pd" style="margin-top:1rem">'+
          '<div class="pd-l">Address</div>'+
          '<div class="pd-v">'+esc(d.address||"—")+'</div>'+
        '</div>';
    });
  }
  function pd(l,v){ return '<div class="pd"><div class="pd-l">'+l+'</div><div class="pd-v">'+esc(String(v))+'</div></div>'; }

  /* ══════════════════════════════════════════
     STUDENT: MARKS
  ══════════════════════════════════════════ */
  function loadMarks(){
    var body=$("marksBody"), sum=$("marksSummary");
    body.innerHTML='<tr><td colspan="8" style="text-align:center;padding:2rem"><div class="spinner"></div></td></tr>';
    sum.innerHTML="";
    api("/api/student/marks").then(function(d){
      if (!d.marks||!d.marks.length){
        body.innerHTML='<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text3)">No marks uploaded yet. Please contact the admin.</td></tr>';
        return;
      }
      sum.innerHTML =
        ms(d.percentage+"%","Overall %") +
        ms(d.gpa,"GPA") +
        ms(d.marks.filter(function(m){return m.pass;}).length+"/"+d.marks.length,"Passed") +
        ms(d.marks.reduce(function(a,m){return a+Number(m.total);},0)+"/"+d.marks.length*100,"Total Marks");
      body.innerHTML = d.marks.map(function(m){
        var t   = Number(m.total);
        var col = t>=75?"#2e7d32":t>=50?"#f57f17":"#c62828";
        var gb  = t>=90?"b-p":t>=75?"b-g":t>=50?"b-b":"b-y";
        return "<tr>"+
          "<td style='font-weight:700'>"+esc(m.code)+"</td>"+
          "<td>"+esc(m.name)+"</td>"+
          "<td style='color:var(--text3)'>"+esc(m.faculty||"—")+"</td>"+
          "<td style='text-align:center'>"+m.internal+"</td>"+
          "<td style='text-align:center'>"+m.external+"</td>"+
          "<td style='font-weight:800;color:"+col+";text-align:center'>"+t+"</td>"+
          "<td><span class='badge "+gb+"'>"+m.grade+"</span></td>"+
          "<td><span class='badge "+(m.pass?"b-g":"b-r")+"'>"+(m.pass?"PASS":"FAIL")+"</span></td>"+
          "</tr>";
      }).join("");
    });
  }
  function ms(v,l){ return '<div class="ms-item"><div class="ms-val">'+v+'</div><div class="ms-lbl">'+l+'</div></div>'; }

  /* ══════════════════════════════════════════
     STUDENT: ATTENDANCE
  ══════════════════════════════════════════ */
  function loadAttendance(){
    var body=$("attBody"), circles=$("attCircles");
    body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem"><div class="spinner"></div></td></tr>';
    circles.innerHTML="";
    api("/api/student/attendance").then(function(d){
      if (!d.subjects||!d.subjects.length){
        body.innerHTML='<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text3)">No attendance data yet.</td></tr>';
        return;
      }
      var cols=["#1565c0","#2e7d32","#f57f17","#4527a0","#c62828","#0288d1"];
      var R=36, C=(2*Math.PI*R).toFixed(2);
      circles.innerHTML = d.subjects.map(function(s,i){
        var pct = parseFloat(s.percentage)||0;
        var off = (C*(1-pct/100)).toFixed(2);
        var col = cols[i%cols.length];
        return '<div class="att-circ">'+
          '<div class="cp"><svg width="84" height="84" viewBox="0 0 84 84">'+
          '<circle class="cp-bg" cx="42" cy="42" r="'+R+'"/>'+
          '<circle class="cp-fill" cx="42" cy="42" r="'+R+'" stroke="'+col+'" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/>'+
          '</svg><div class="cp-txt" style="color:'+col+'">'+pct+'%</div></div>'+
          '<div class="att-sn">'+esc(s.code)+'</div></div>';
      }).join("");
      body.innerHTML = d.subjects.map(function(s){
        var pct = parseFloat(s.percentage)||0;
        return "<tr>"+
          "<td style='font-weight:700'>"+esc(s.code)+"</td>"+
          "<td>"+esc(s.name)+"</td>"+
          "<td style='text-align:center'>"+s.total_classes+"</td>"+
          "<td style='text-align:center;color:#2e7d32;font-weight:700'>"+s.present_count+"</td>"+
          "<td style='text-align:center;color:#c62828;font-weight:700'>"+s.absent_count+"</td>"+
          "<td style='font-weight:800;color:"+(pct>=75?"#2e7d32":"#c62828")+"'>"+pct+"%</td>"+
          "<td><span class='badge "+(pct>=75?"b-g":"b-r")+"'>"+(pct>=75?"Good ✓":"Low — Attention")+"</span></td>"+
          "</tr>";
      }).join("");
    });
  }

  /* ══════════════════════════════════════════
     STUDENT: CERTIFICATES
  ══════════════════════════════════════════ */
  function loadCerts(){
    var grid = $("certGrid");
    grid.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text3);grid-column:1/-1"><div class="spinner"></div><div style="margin-top:.8rem">Loading...</div></div>';
    api("/api/student/certificates").then(function(certs){
      if (!certs||!certs.length){
        grid.innerHTML='<div style="text-align:center;padding:3rem;color:var(--text3);grid-column:1/-1">📄 No certificates yet. Admin will upload them for you.</div>';
        return;
      }
      var icons={"Bonafide Certificate":"🎓","Provisional Marksheet":"📊","Character Certificate":"✅","Attendance Certificate":"📅","Migration Certificate":"🌐","Transfer Certificate":"📄","Scholarship Letter":"🏆"};
      grid.innerHTML = certs.map(function(c){
        var ico = icons[c.cert_type] || "📄";
        var dl  = c.last_downloaded
          ? "Downloaded on: "+formatDt(c.last_downloaded)
          : "Not yet downloaded";
        return '<div class="cert-card">'+
          '<div class="cert-ico">'+ico+'</div>'+
          '<div class="cert-name">'+esc(c.cert_type)+'</div>'+
          '<div class="cert-desc">Issued: '+formatDt(c.issued_at)+'</div>'+
          '<div class="cert-date">'+esc(dl)+'</div>'+
          '<a href="/api/student/certificate/download/'+c.id+'" class="btn btn-p" '+
          'style="text-decoration:none;width:100%;justify-content:center;margin-top:.5rem" '+
          'onclick="setTimeout(window.refreshCerts,1500)">⬇ Download PDF</a>'+
          '</div>';
      }).join("");
    });
  }
  window.refreshCerts = loadCerts;

  /* ══════════════════════════════════════════
     ADMIN: ALL STUDENTS
  ══════════════════════════════════════════ */
  function loadAdminStudents(){
    var q = "/api/admin/students"+
      "?branch="+encodeURIComponent($("branchFil").value||"")+
      "&year="  +encodeURIComponent($("yearFil").value||"")+
      "&search="+encodeURIComponent($("stuSearch").value||"");
    api(q).then(function(students){
      var body = $("stuBody");
      if (!students||!students.length){
        body.innerHTML='<tr><td colspan="9" style="text-align:center;padding:2.5rem;color:var(--text3)">No students found. Click &quot;+ Add Student&quot; to begin.</td></tr>';
        return;
      }
      body.innerHTML = students.map(function(s){
        return "<tr>"+
          "<td style='font-weight:800;color:var(--primary)'>"+esc(s.roll_number)+"</td>"+
          "<td style='font-weight:600'>"+esc(s.full_name)+"</td>"+
          "<td><span class='badge b-b'>"+esc(s.branch)+"</span></td>"+
          "<td style='text-align:center'>"+s.year+"</td>"+
          "<td style='text-align:center'>"+s.semester+"</td>"+
          "<td style='font-size:.8rem'>"+esc(s.email)+"</td>"+
          "<td><span class='badge "+(s.is_active?"b-g":"b-r")+"'>"+(s.is_active?"Active":"Inactive")+"</span></td>"+
          "<td style='font-size:.74rem;color:var(--text3)'>"+formatDt(s.last_login)+"</td>"+
          "<td><div style='display:flex;gap:.3rem;flex-wrap:wrap'>"+
            "<button class='btn btn-i btn-sm' data-view='"+s.id+"' title='View'>👁</button>"+
            "<button class='btn btn-y btn-sm' data-edit='"+s.id+"'"+
              " data-name='"+esc(s.full_name)+"'"+
              " data-email='"+esc(s.email)+"'"+
              " data-phone='"+esc(s.phone||"")+"'"+
              " data-branch='"+esc(s.branch)+"'"+
              " data-year='"+s.year+"'"+
              " data-sem='"+s.semester+"'"+
              " data-dob='"+esc(s.dob||"")+"'"+
              " data-guardian='"+esc(s.guardian||"")+"'"+
              " data-addr='"+esc(s.address||"")+"'"+
              " title='Edit'>✏</button>"+
            "<button class='btn btn-d btn-sm' data-del='"+s.id+"' data-roll='"+esc(s.roll_number)+"' title='Delete'>🗑</button>"+
          "</div></td>"+
          "</tr>";
      }).join("");
    });
  }

  ["stuSearch","branchFil","yearFil"].forEach(function(id){
    var el=$(id);
    if(el){ el.addEventListener("input",loadAdminStudents); el.addEventListener("change",loadAdminStudents); }
  });

  /* ── ADD STUDENT ── */
  $("addStuBtn").addEventListener("click", function(){
    ["ns-name","ns-roll","ns-email","ns-phone","ns-dob","ns-guardian","ns-addr"].forEach(function(id){
      var e=$(id); if(e) e.value="";
    });
    $("ns-pw").value="Student@123";
    $("ns-branch").value="CSE"; $("ns-year").value="1"; $("ns-sem").value="1";
    hideErr("ns-err"); hideOk("ns-ok");
    openModal("modalAddStu");
  });

  $("ns-submit").addEventListener("click", function(){
    hideErr("ns-err"); hideOk("ns-ok");
    var data = {
      full_name:   $("ns-name").value.trim(),
      roll_number: $("ns-roll").value.trim().toUpperCase(),
      email:       $("ns-email").value.trim(),
      phone:       $("ns-phone").value.trim(),
      branch:      $("ns-branch").value,
      year:        parseInt($("ns-year").value),
      semester:    parseInt($("ns-sem").value),
      password:    $("ns-pw").value || "Student@123",
      dob:         $("ns-dob").value  || null,
      guardian:    $("ns-guardian").value.trim(),
      address:     $("ns-addr").value.trim()
    };
    if (!data.full_name)   { showErr("ns-err","Full name is required"); return; }
    if (!data.roll_number) { showErr("ns-err","Roll number is required"); return; }
    if (!data.email)       { showErr("ns-err","Email is required"); return; }
    if (data.password.length < 6){ showErr("ns-err","Password must be at least 6 characters"); return; }
    $("ns-submit").disabled = true;
    api("/api/admin/students",{method:"POST",body:JSON.stringify(data)}).then(function(d){
      $("ns-submit").disabled = false;
      if (d.success){
        showOk("ns-ok","✓ "+d.message);
        notif(d.message);
        loadAdminStudents();
        setTimeout(function(){
          closeModal("modalAddStu");
          hideOk("ns-ok");
          $("cred-roll").textContent     = data.roll_number;
          $("cred-password").textContent = data.password;
          openModal("modalCredentials");
        }, 1500);
      } else {
        showErr("ns-err", d.error || "Failed to add student");
      }
    });
  });

  /* ── TABLE ROW ACTIONS ── */
  $("stuBody").addEventListener("click", function(e){
    /* EDIT */
    var editEl = e.target.closest("[data-edit]");
    if (editEl){
      $("es-id").value        = editEl.dataset.edit;
      $("es-name").value      = editEl.dataset.name;
      $("es-email").value     = editEl.dataset.email;
      $("es-phone").value     = editEl.dataset.phone;
      $("es-branch").value    = editEl.dataset.branch;
      $("es-year").value      = editEl.dataset.year;
      $("es-sem").value       = editEl.dataset.sem;
      $("es-dob").value       = editEl.dataset.dob;
      $("es-guardian").value  = editEl.dataset.guardian;
      $("es-addr").value      = editEl.dataset.addr;
      hideErr("es-err"); hideOk("es-ok");
      openModal("modalEditStu"); return;
    }
    /* DELETE */
    var delEl = e.target.closest("[data-del]");
    if (delEl){
      $("confirmMsg").textContent = "Delete student "+delEl.dataset.roll+"? This cannot be undone.";
      $("confirmOkBtn").onclick = function(){
        api("/api/admin/students/"+delEl.dataset.del,{method:"DELETE"}).then(function(d){
          if(d.success){ notif(d.message); loadAdminStudents(); closeModal("modalConfirm"); }
          else notif(d.error||"Error","err");
        });
      };
      openModal("modalConfirm"); return;
    }
    /* VIEW */
    var viewEl = e.target.closest("[data-view]");
    if (viewEl){
      var box = $("viewStuContent");
      box.innerHTML = '<div style="text-align:center;padding:2rem"><div class="spinner"></div></div>';
      openModal("modalViewStu");
      api("/api/admin/students").then(function(students){
        var s = students.find(function(x){ return String(x.id)===String(viewEl.dataset.view); });
        if (!s){ box.innerHTML="<p style='color:#c62828;padding:1rem'>Student not found</p>"; return; }
        var sfx=s.year==1?"st":s.year==2?"nd":s.year==3?"rd":"th";
        box.innerHTML =
          '<div class="profile-card">'+
          '<div class="prof-av">'+s.full_name.charAt(0)+'</div>'+
          '<div class="prof-info">'+
            '<div class="prof-name">'+esc(s.full_name)+'</div>'+
            '<div class="prof-roll">'+esc(s.roll_number)+' | '+esc(s.email)+'</div>'+
            '<div class="prof-tags">'+
              '<span class="tag b-b">'+esc(s.branch)+'</span>'+
              '<span class="tag b-y">'+s.year+sfx+' Year</span>'+
              '<span class="tag b-g">Sem '+s.semester+'</span>'+
              '<span class="tag '+(s.is_active?"b-g":"b-r")+'">'+(s.is_active?"Active":"Inactive")+'</span>'+
            '</div>'+
            '<div class="prof-details">'+
              pd("Phone",s.phone||"—")+pd("DOB",s.dob||"—")+
              pd("Guardian",s.guardian||"—")+pd("Last Login",formatDt(s.last_login))+
            '</div>'+
          '</div></div>'+
          '<div class="pd" style="margin-top:1rem"><div class="pd-l">Address</div><div class="pd-v">'+esc(s.address||"—")+'</div></div>';
      });
    }
  });

  /* ── EDIT SUBMIT ── */
  $("es-submit").addEventListener("click", function(){
    var id = $("es-id").value;
    hideErr("es-err"); hideOk("es-ok");
    var data = {
      full_name: $("es-name").value, email:    $("es-email").value,
      phone:     $("es-phone").value, branch:  $("es-branch").value,
      year:      $("es-year").value,  semester: $("es-sem").value,
      dob:       $("es-dob").value||null, guardian: $("es-guardian").value,
      address:   $("es-addr").value
    };
    api("/api/admin/students/"+id,{method:"PUT",body:JSON.stringify(data)}).then(function(d){
      if(d.success){
        showOk("es-ok",d.message); notif(d.message); loadAdminStudents();
        setTimeout(function(){ closeModal("modalEditStu"); },1800);
      } else showErr("es-err",d.error||"Error");
    });
  });

  /* ══════════════════════════════════════════
     ADMIN: UPLOAD MARKS
  ══════════════════════════════════════════ */
  $("m-submit").addEventListener("click", function(){
    hideErr("m-err"); hideOk("m-ok");
    var roll = $("m-roll").value.trim().toUpperCase();
    if (!roll){ showErr("m-err","Enter student roll number"); return; }
    api("/api/admin/students?search="+encodeURIComponent(roll)).then(function(students){
      var s = students && students.find(function(x){ return x.roll_number===roll; });
      if (!s){ showErr("m-err","Student '"+roll+"' not found"); return; }
      var data = {
        student_id:   s.id,
        subject_code: $("m-subj").value.trim().toUpperCase(),
        internal:     parseFloat($("m-int").value),
        external:     parseFloat($("m-ext").value),
        semester:     $("m-sem").value,
        academic_year:$("m-ay").value
      };
      if (!data.subject_code||isNaN(data.internal)||isNaN(data.external)){
        showErr("m-err","Please fill all fields correctly"); return;
      }
      api("/api/admin/marks",{method:"POST",body:JSON.stringify(data)}).then(function(d){
        if(d.success){ showOk("m-ok",d.message); notif(d.message); $("m-int").value=""; $("m-ext").value=""; }
        else showErr("m-err",d.error||"Error");
      });
    });
  });

  /* ══════════════════════════════════════════
     ADMIN: MARK ATTENDANCE
  ══════════════════════════════════════════ */
  $("at-submit").addEventListener("click", function(){
    hideErr("at-err"); hideOk("at-ok");
    var roll = $("at-roll").value.trim().toUpperCase();
    if (!roll){ showErr("at-err","Enter student roll number"); return; }
    api("/api/admin/students?search="+encodeURIComponent(roll)).then(function(students){
      var s = students && students.find(function(x){ return x.roll_number===roll; });
      if (!s){ showErr("at-err","Student '"+roll+"' not found"); return; }
      var data = {
        student_id:   s.id,
        subject_code: $("at-subj").value.trim().toUpperCase(),
        date:         $("at-date").value,
        status:       $("at-status").value
      };
      if (!data.subject_code||!data.date){ showErr("at-err","Fill all fields"); return; }
      api("/api/admin/attendance",{method:"POST",body:JSON.stringify(data)}).then(function(d){
        if(d.success){ showOk("at-ok",d.message); notif(d.message); }
        else showErr("at-err",d.error||"Error");
      });
    });
  });

  /* ══════════════════════════════════════════
     ADMIN: UPLOAD CERTIFICATE
  ══════════════════════════════════════════ */
  $("c-submit").addEventListener("click", function(){
    hideErr("c-err"); hideOk("c-ok");
    var roll = $("c-roll").value.trim().toUpperCase();
    var file = $("c-file").files[0];
    if (!roll){ showErr("c-err","Enter student roll number"); return; }
    if (!file){ showErr("c-err","Select a PDF file"); return; }
    api("/api/admin/students?search="+encodeURIComponent(roll)).then(function(students){
      var s = students && students.find(function(x){ return x.roll_number===roll; });
      if (!s){ showErr("c-err","Student '"+roll+"' not found"); return; }
      var fd = new FormData();
      fd.append("file",file); fd.append("student_id",s.id); fd.append("cert_type",$("c-type").value);
      $("c-submit").disabled = true;
      fetch("/api/admin/certificates",{method:"POST",body:fd})
        .then(function(r){ return r.json(); })
        .then(function(d){
          $("c-submit").disabled = false;
          if(d.success){ showOk("c-ok",d.message); notif(d.message); $("c-file").value=""; $("c-roll").value=""; }
          else showErr("c-err",d.error||"Upload error");
        });
    });
  });

  /* ══════════════════════════════════════════
     ADMIN: ACTIVITY LOGS
  ══════════════════════════════════════════ */
  function loadLogs(){
    api("/api/admin/logs?limit=100&action="+encodeURIComponent($("logFilter").value||""))
      .then(function(logs){
        var body = $("logsBody");
        if (!logs||!logs.length){
          body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text3)">No logs found.</td></tr>';
          return;
        }
        body.innerHTML = logs.map(function(l){
          return "<tr>"+
            "<td style='white-space:nowrap;font-size:.78rem'>"+formatDt(l.logged_at)+"</td>"+
            "<td style='font-weight:600'>"+esc(l.username||"System")+"</td>"+
            "<td><span class='badge "+(l.role==="admin"?"b-r":"b-b")+"'>"+esc(l.role||"—")+"</span></td>"+
            "<td><span class='log-action'>"+esc(l.action)+"</span></td>"+
            "<td style='max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem'>"+esc(l.description||"")+"</td>"+
            "<td style='font-family:monospace;font-size:.74rem;color:var(--text3)'>"+esc(l.ip_address||"—")+"</td>"+
            "</tr>";
        }).join("");
      });
  }
  $("logFilter").addEventListener("change", loadLogs);
  $("refreshLogsBtn").addEventListener("click", loadLogs);

  /* ══════════════════════════════════════════
     SETTINGS
  ══════════════════════════════════════════ */
  $("cp-submit").addEventListener("click", function(){
    hideErr("cp-err"); hideOk("cp-ok");
    var cur=$("cp-cur").value, nw=$("cp-new").value, cnf=$("cp-cnf").value;
    if (!cur||!nw){ showErr("cp-err","Please fill all fields"); return; }
    if (nw!==cnf) { showErr("cp-err","Passwords do not match"); return; }
    if (nw.length<8){ showErr("cp-err","Password must be at least 8 characters"); return; }
    api("/api/change-password",{method:"POST",body:JSON.stringify({current_password:cur,new_password:nw})})
      .then(function(d){
        if(d.success){
          showOk("cp-ok",d.message); notif(d.message);
          $("cp-cur").value=""; $("cp-new").value=""; $("cp-cnf").value="";
        } else showErr("cp-err",d.error||"Error");
      });
  });

  $("rsp-submit").addEventListener("click", function(){
    hideErr("rsp-err"); hideOk("rsp-ok");
    var roll=$("rsp-roll").value.trim().toUpperCase(), pw=$("rsp-pw").value;
    if (!roll||!pw){ showErr("rsp-err","Fill all fields"); return; }
    api("/api/admin/students?search="+encodeURIComponent(roll)).then(function(students){
      var s = students && students.find(function(x){ return x.roll_number===roll; });
      if (!s){ showErr("rsp-err","Student not found"); return; }
      api("/api/admin/reset-student-password",{method:"POST",body:JSON.stringify({student_id:s.id,password:pw})})
        .then(function(d){
          if(d.success){ showOk("rsp-ok",d.message); notif(d.message); }
          else showErr("rsp-err",d.error||"Error");
        });
    });
  });

  /* ══════════════════════════════════════════
     INIT — CHECK SESSION ON PAGE LOAD
  ══════════════════════════════════════════ */
  fetch("/api/session")
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (d.logged_in){
        state.role     = d.role;
        state.username = d.username;
        setupDashboard();
        showPage("pgDash");
        switchSection("overview");
      } else {
        showPage("pgLogin");
      }
    })
    .catch(function(){ showPage("pgLogin"); });

})();
