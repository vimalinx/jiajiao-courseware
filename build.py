# -*- coding: utf-8 -*-
"""课件预览站构建脚本（持久化版本）
用法：python3 build.py   —— 在 站点/ 下生成 pdf/ pptx/ index.html
再 git push 即更新线上站点。
"""
import os, html, json, urllib.parse, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.abspath(os.path.join(ROOT, "..", "课件", "标准课件"))
PDFDIR = os.path.join(ROOT, "pdf")
PPTXDIR = os.path.join(ROOT, "pptx")
os.makedirs(PDFDIR, exist_ok=True); os.makedirs(PPTXDIR, exist_ok=True)

# 1) 收集 26 套 PPTX 并转 PDF
decks = []
for d in sorted(os.listdir(SRC)):
    dp = os.path.join(SRC, d)
    if not os.path.isdir(dp): continue
    pptx = [f for f in os.listdir(dp) if f.endswith(".pptx")]
    if not pptx: continue
    name = pptx[0][:-5]
    decks.append((d, name, os.path.join(dp, pptx[0])))
for _, _, p in decks:
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", PDFDIR, p], capture_output=True)
ok = sum(1 for _, n, _ in decks if os.path.exists(os.path.join(PDFDIR, n + ".pdf")))
print(f"pdf ok: {ok}")
for _, name, p in decks:
    shutil.copy(p, os.path.join(PPTXDIR, name + ".pptx"))

# 2) 地区数据
R = {}
def reg(**kw): R[kw.pop("name")] = kw
D = {"v": "人教版"}
for name in ["天津","河北","河南","山西","内蒙古","辽宁","吉林","黑龙江","安徽","福建","江西","湖北","湖南","广西","海南","重庆","贵州","云南","西藏","甘肃","青海","宁夏","新疆"]:
    reg(name=name, **D)
reg(name="北京", v="人教版为主，部分区用北京版", e="北京版/外研版为主")
reg(name="上海", v="沪编版（五四制）", e="沪教版/上外版", special="上海全市五四学制、教材自成体系（沪编课本经国家审核），物化生内容并入综合科学类课本", grade_note="上海年级称预备年级（六）、初一（七）、初二（八）、初三（九）")
reg(name="江苏", v="苏科版", e="译林版", p="苏科版", c="沪教版", b="苏教版", g="人教版", hs="高中数学苏教版、英语译林版为主")
reg(name="浙江", v="浙教版", e="人教版/外研版", special="浙江初中设综合《科学》（浙教版），物理·化学·生物并入科学；《历史与社会》含地理内容")
reg(name="广东", v="人教版", e="人教版/外研版", p="沪科粤教版", c="科粤版", hs="高中物理粤教版为主")
reg(name="山东", v="人教版/青岛版（地市有差异）", e="人教版（五四制地市用鲁教版）", p="人教版（五四制地市用鲁科版）", c="人教版（五四制地市用鲁教版）", w54="青岛、烟台、威海等地市部分实行五四学制", hs="高中人教A版/鲁科版为主")
reg(name="四川", v="人教版/北师大版（地市有差异）", e="人教版/科普版（原仁爱版）")
reg(name="陕西", v="人教版/北师大版", e="人教版/外研版")

# 3) 分区
SECTIONAL = [(n, dsc) for n, dsc in [
    ("语文·节级精细讲解课件","统编版，含阅读/写作/文言/名著逐节讲解"),
    ("数学·节级精细讲解课件","19 章节组全讲解，例题经脚本逐题验算"),
    ("英语·节级精细讲解课件","话题/语法/技能逐节 + 语法时间轴图"),
    ("物理·节级精细讲解课件","85 节 + 43 张装置/电路/光路图"),
    ("化学·节级精细讲解课件","34 节 + 26 张装置/微观/流程图"),
    ("生物学·节级精细讲解课件","59 节 + 31 张结构/流程/遗传图"),
    ("历史·节级精细讲解课件","时间轴与专题结构图"),
    ("道德与法治·节级精细讲解课件","法治/国情结构导图"),
    ("地理·节级精细讲解课件","气候/统计/读图 38 张")]]
KNOW = [(n, "") for n in ["语文·初中知识讲解课件","数学·初中知识讲解课件","英语·初中知识讲解课件","物理·初中知识讲解课件","化学·初中知识讲解课件","生物学·初中知识讲解课件","历史·初中知识讲解课件","道德与法治·初中知识讲解课件","地理·初中知识讲解课件"]]
V1 = [(n, "") for n in ["人教版初中数学七年级上册","人教版初中数学七年级下册","人教版初中数学八年级上册","人教版初中数学八年级下册","人教版初中数学九年级上册","北师大版数学九年级上册","人教A版数学必修第一册","人教A版数学必修第二册"]]

def card(item):
    name, desc = item[0], item[1]
    e = urllib.parse.quote(name)
    dsc = f'<div class="d">{html.escape(desc)}</div>' if desc else ""
    return (f'<div class="card"><div class="t">{html.escape(name)}</div>{dsc}'
            f'<div class="actions"><a class="btn preview" href="pdf/{e}.pdf" target="_blank" rel="noopener">在线预览 (PDF)</a>'
            f'<a class="btn" href="pptx/{e}.pptx">下载 PPTX</a></div></div>')
def grid(items): return '<div class="grid">' + "".join(card(i) for i in items) + "</div>"

sec1 = "<h2>九科 · 节级精细讲解课件（每章每节全覆盖）</h2><p class='sub'>每节四页组：导入讲解 → 例题分步（教师带练）→ 独立练习（答案隔离）→ 学科图示；练习答案在教师手册，不在放映页</p>" + grid(SECTIONAL)
sec2 = "<h2>九科 · 知识体系讲解课件</h2><p class='sub'>每学科一册的体系总览版</p>" + grid(KNOW)
sec3 = "<h2>数学 · 全册提纲课件（8 册，2026 年秋在用教材）</h2><p class='sub'>人教版初中六册 / 北师大版九上 / 人教A版必修一二</p>" + grid(V1)

PROVS = list(R.keys())
prov_opts = "".join(f"<option>{p}</option>" for p in PROVS)
grade_opts = "".join(f'<option value="{v}">{t}</option>' for v, t in [
    ("m7","初中 七年级（初一）"),("m8","初中 八年级（初二）"),("m9","初中 九年级（初三）"),
    ("h10","高中 高一"),("h11","高中 高二"),("h12","高中 高三"),
    ("p1","小学 一年级"),("p2","小学 二年级"),("p3","小学 三年级"),
    ("p4","小学 四年级"),("p5","小学 五年级"),("p6","小学 六年级")])
rdata_js = json.dumps(R, ensure_ascii=False)

JS = """
const RDATA = __RDATA__;
function esc(x){ const d=document.createElement("div"); d.textContent=x==null?"":String(x); return d.innerHTML; }
function fmtRow(k,v){ return "<tr><td>"+esc(k)+"</td><td>"+esc(v)+"</td></tr>"; }
function render(){
  const prov=document.getElementById("prov").value;
  const grade=document.getElementById("grade").value;
  const stage=grade[0]==="m"?"初中":(grade[0]==="h"?"高中":"小学");
  const r=RDATA[prov]||{};
  const rows=[];
  rows.push(fmtRow("学段·年级", stage+" · "+document.getElementById("grade").selectedOptions[0].text));
  if(stage==="初中"){
    rows.push(fmtRow("语文", "统编版（全国统一，人民教育出版社出版）"));
    const get=(k,label)=>{ if(r[k]) rows.push(fmtRow(label,r[k])); };
    get("v","数学"); get("e","英语"); get("p","物理"); get("c","化学"); get("b","生物学");
    rows.push(fmtRow("历史","统编版（全国统一）"));
    rows.push(fmtRow("道德与法治","统编版（全国统一）"));
    if(r.g) get("g","地理"); else rows.push(fmtRow("地理","人教版/湘教版等（七、八年级开设）"));
  } else if(stage==="高中"){
    rows.push(fmtRow("语文/思想政治/历史","统编版（全国统一）"));
    rows.push(fmtRow("数学", (r.hs? String(r.hs).replace("高中：","") : "人教A版为主")));
    rows.push(fmtRow("英语/物理/化学/生物/地理", "人教版为主，部分省份用外研/鲁科/粤教等——以学校课本为准"));
  } else {
    rows.push(fmtRow("语文/道德与法治","统编版（全国统一）"));
    rows.push(fmtRow("数学","人教/北师大/苏教/青岛/冀教/北京/西南大学等版本因省而异"));
    rows.push(fmtRow("英语","三年级起开设（人教PEP/外研/译林等版本因省而异）"));
    rows.push(fmtRow("科学","教科/苏教/粤教/湘科/人教鄂教等版本因省而异"));
  }
  if(r.special) rows.push(fmtRow("特别提醒", r.special));
  if(r.w54) rows.push(fmtRow("学制提醒", r.w54));
  if(r.grade_note) rows.push(fmtRow("年级口径", r.grade_note));
  let html = '<div class="verbox"><h3>'+esc(prov)+' · '+esc(stage)+' 在用教材版本参考</h3><table>'+rows.join("")+'</table></div>';
  let extra = "";
  if(stage==="初中"){
    const v=r.v||"人教版";
    if(v.indexOf("人教")>=0) html += '<p style="margin:0 0 8px 16px;font-size:13px;color:#6E7B85">数学分册：本站有人教版七至九年级各册课件，与你校版本一致。</p>';
    else if(v.indexOf("北师大")>=0) html += '<p style="margin:0 0 8px 16px;font-size:13px;color:#6E7B85">数学分册：本站有北师大版九年级上册课件。</p>';
    else html += '<div class="warn">提示：'+esc(prov)+'初中数学主流为'+esc(v)+'，与本站人教版分册不同。知识点一致、章节顺序有差异，可先用人教版讲解课件对照调整；对应版本可按需补制。</div>';
    extra = "";
  } else if(stage==="高中"){
    extra = (r.hs? "<p>"+esc(String(r.hs))+"（以学校课本为准）</p>" : "<p>高中统编三科全国统一；数学等人教A版为主。</p>");
    if(grade==="h12") extra += "<p>高二高三以选择性必修为主，可按需补制；现有必修课件适用于基础回归。</p>";
  } else {
    extra = "<p>小学阶段课件可按需补制；统编语文/道德与法治全国统一；数学英语科学版本因省而异。</p>";
  }
  document.getElementById("res").innerHTML = html + '<div class="verbox"><h3>课件匹配说明</h3>'+extra+'<p style="margin:8px 0 0">全部 26 套课件见下方分区列表；所有放映页均不含练习答案。</p></div>';
  window.scrollTo({top: document.getElementById("res").offsetTop - 20, behavior: "smooth"});
}
document.getElementById("prov").addEventListener("change", render);
document.getElementById("grade").addEventListener("change", render);
"""

PAGE = """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>九科教辅 · 课件预览站</title>
<style>
:root { --bg:#F5F2EA; --text:#202D37; --primary:#285C94; --accent:#B45F47; --muted:#6E7B85; --card:#fff; --line:#DDD5C6; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font-family:"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif; }
.wrap { max-width:1080px; margin:0 auto; padding:40px 20px 80px; }
h1 { font-size:28px; margin:0 0 4px; } .note { color:var(--muted); font-size:13.5px; margin:0 0 24px; }
.dlbox { background:#fff; border:1px solid #B45F47; border-radius:12px; padding:18px 20px; margin:0 0 20px; }
.dlbox h3 { margin:0 0 8px; font-size:16px; color:var(--accent); }
.dlbox p { margin:6px 0; font-size:13.5px; }
.sel { background:var(--card); border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(40,50,60,.08); display:flex; gap:16px; flex-wrap:wrap; align-items:flex-end; margin-bottom:8px; }
.sel label { display:block; font-size:12.5px; color:var(--muted); margin-bottom:6px; }
.sel select { padding:9px 12px; border-radius:8px; border:1px solid var(--line); font-size:14.5px; min-width:200px; background:#fff; }
#res { margin-top:22px; }
.verbox { background:#fff; border-radius:12px; padding:18px 20px; box-shadow:0 2px 10px rgba(40,50,60,.08); margin-bottom:18px; }
.verbox h3 { margin:0 0 10px; font-size:16px; color:var(--primary); }
.verbox table { width:100%; border-collapse:collapse; font-size:14px; }
.verbox td { padding:7px 8px; border-top:1px solid #EEE8DA; vertical-align:top; }
.verbox td:first-child { color:var(--muted); width:110px; white-space:nowrap; }
.warn { background:#F2E3DC; border-radius:10px; padding:12px 16px; font-size:13px; margin:0 0 18px; color:#7A4A38; }
h2 { font-size:20px; margin:38px 0 4px; padding-left:12px; border-left:4px solid var(--accent); }
p.sub { color:var(--muted); font-size:13px; margin:4px 0 16px 16px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; }
.card { background:var(--card); border-radius:10px; padding:16px; box-shadow:0 2px 10px rgba(40,50,60,.08); }
.t { font-weight:700; font-size:15px; line-height:1.5; margin-bottom:6px; }
.d { color:var(--muted); font-size:12.5px; margin-bottom:10px; }
.actions { display:flex; gap:10px; flex-wrap:wrap; }
.btn { display:inline-block; padding:8px 14px; border-radius:8px; font-size:13px; text-decoration:none; background:var(--primary); color:#fff; }
.btn.preview { background:var(--accent); }
.btn:hover { opacity:.88; }
footer { margin-top:56px; color:var(--muted); font-size:12.5px; }
a { color:var(--primary); }
</style></head><body><div class="wrap">
<h1>九科教辅 · 课件预览站</h1>
<p class="note">依据《九科教辅设计与生产规范包 v1.0》制作 ｜ 更新时间 2026-09-17 ｜ 26 套课件 ｜ 练习答案在教师手册（course.json），放映页零答案</p>

<div class="dlbox">
  <h3>📦 完整课件包一键下载（v1.0）</h3>
  <p>199 章文件夹（每章 = 课件 PPTX + 教师手册（含全部答案）+ 章提纲）+ 九科体系总览版 + 参考资源索引，29 MB zip。含地区+年级选题器（下方选择即可筛版本与课件）。</p>
  <a class="btn preview" href="https://github.com/vimalinx/jiajiao-courseware/releases/tag/kcb-v1.0" target="_blank" rel="noopener">前往 Release 页下载课件包.zip</a>
  <span style="font-size:12px;color:#6E7B85;margin-left:10px">也可逐套在线预览/单套下载（下方分区）</span>
</div>

<div class="sel">
  <div><label>学生所在地区（省/直辖市）</label><select id="prov">__PROV__</select></div>
  <div><label>年级</label><select id="grade">__GRADE__</select></div>
</div>
<div id="res"></div>

__SEC1__
__SEC2__
__SEC3__

<footer>教材章节结构依 2022 年版义务教育课程标准组织；教材版本为省级主流参考，以学生课本封面为准；电子课本：<a href="https://basic.smartedu.cn/tchMaterial" target="_blank" rel="noopener">国家中小学智慧教育平台</a>。课件内容为原创教学设计（试教状态 not_trialed）。</footer>

<script>__JS__</script>
</div></body></html>"""

page = (PAGE.replace("__PROV__", prov_opts).replace("__GRADE__", grade_opts)
        .replace("__SEC1__", sec1).replace("__SEC2__", sec2).replace("__SEC3__", sec3)
        .replace("__JS__", JS).replace("__RDATA__", rdata_js))
idx = os.path.join(ROOT, "index.html")
open(idx, "w", encoding="utf-8").write(page)
print("index written:", os.path.getsize(idx), "bytes")
