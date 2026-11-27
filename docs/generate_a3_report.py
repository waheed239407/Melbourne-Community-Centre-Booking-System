"""Build the BISY3008 A3 Word report from the team's local assessment files.

Run: py -m pip install python-docx
Then place this script beside the Task 3 implementation report and screenshot appendix.
Run: py generate_a3_report.py
Alternatively pass --report and --screenshots with their actual paths.
"""
from pathlib import Path
import argparse
import re
from io import BytesIO
from docx import Document
from docx.shared import Mm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn

parser = argparse.ArgumentParser()
parser.add_argument("--report", type=Path)
parser.add_argument("--screenshots", type=Path)
parser.add_argument("--output", type=Path, default=Path("BISY3008_A3_Final_Project_Report_and_User_Manual.docx"))
args = parser.parse_args()
def locate(explicit, pattern):
    if explicit:
        return explicit
    matches = sorted(Path.cwd().glob(pattern))
    return matches[-1] if matches else None

report = locate(args.report, "*Implementation Report*.docx")
screenshots = locate(args.screenshots, "*Annotated Screenshot Evidence*.docx")
d = Document()
sec = d.sections[0]
sec.page_width, sec.page_height = Mm(210), Mm(297)
sec.top_margin = sec.bottom_margin = Mm(25.4)
sec.left_margin = sec.right_margin = Mm(19.05)
for style_name, size, bold in [("Normal",12,False),("Title",18,True),("Heading 1",14,True),("Heading 2",12,True),("Caption",12,False)]:
    st = d.styles[style_name]
    st.font.name = "Arial"
    st.font.size = Pt(size)
    st.font.bold = bold
    st.font.italic = False
    st.font.color.rgb = RGBColor(0,0,0)
    st.paragraph_format.line_spacing = 1.5
    st.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    st.paragraph_format.space_after = Pt(6)
    if style_name in ("Title","Heading 1","Heading 2"):
        st.paragraph_format.keep_with_next = True
body_text = []
def p(t, style=None):
    body_text.append(t)
    return d.add_paragraph(t,style)
def h(t): return p(t,"Heading 1")
def sh(t): return p(t,"Heading 2")
def table(headers, rows):
    t=d.add_table(rows=1, cols=len(headers))
    t.style="Table Grid"
    t.alignment=WD_TABLE_ALIGNMENT.CENTER
    for cell,value in zip(t.rows[0].cells,headers):
        cell.text=value
        for run in cell.paragraphs[0].runs: run.bold=True
    for row in rows:
        for cell,value in zip(t.add_row().cells,row): cell.text=value
    for row in t.rows:
        for cell in row.cells:
            for para in cell.paragraphs:
                para.alignment=WD_ALIGN_PARAGRAPH.LEFT
                para.paragraph_format.line_spacing=1.5
                para.paragraph_format.space_after=Pt(3)
                for run in para.runs:
                    run.font.name="Arial"
                    run.font.size=Pt(12)
                    run.font.color.rgb=RGBColor(0,0,0)
    body_text.extend(headers)
    body_text.extend(str(v) for row in rows for v in row)
    return t

# The supplied screenshot appendix associates its embedded images with E01 to E14.
evidence={}
if screenshots and screenshots.exists():
    src=Document(screenshots)
    current=None
    for para in src.element.body.iter(qn("w:p")):
        text="".join(x.text or "" for x in para.iter(qn("w:t")))
        match=re.match(r"^\s*(E\d{2})\.\s",text)
        if match: current=match.group(1)
        for blip in para.iter(qn("a:blip")):
            rid=blip.get(qn("r:embed"))
            if rid and current and current not in evidence:
                part=src.part.related_parts.get(rid)
                if part and hasattr(part,"blob"): evidence[current]=part.blob
missing=[]
def figure(code, caption):
    cap=p("Figure "+caption+" ("+code+").","Caption")
    cap.paragraph_format.keep_with_next=True
    if code in evidence:
        img=d.add_paragraph()
        img.alignment=WD_ALIGN_PARAGRAPH.CENTER
        img.add_run().add_picture(BytesIO(evidence[code]),width=Mm(160))
    else:
        missing.append(code)
        p("[Insert original team screenshot "+code+" from the Task 3 evidence appendix]")

p("BISY3008 A3 Part C: Final Project Showcase","Title")
p("Melbourne Community Centre Booking System (MCCBS)")
p("Australian Institute of Higher Education | Group report and user manual")
# Read student identifiers only from the user's local file. They are not stored in this script.
if report and report.exists():
    source=Document(report)
    members=[]
    for t in source.tables:
        for row in t.rows:
            vals=[c.text.strip() for c in row.cells]
            if len(vals)>=2 and re.fullmatch(r"\d{6}",vals[1]):
                members.append((vals[0],vals[1]))
    if members:
        table(["Student","Student ID"],members)

h("1. User requirements and project description")
p("MCCBS helps Melbourne residents find community spaces, request bookings, track decisions and cancel eligible bookings. Staff review requests and prevent overlapping approvals. Verified residents can also submit free community events for moderation. The academic system separates resident and staff permissions and stores records in PostgreSQL. The documented checkpoint supports eight of twelve functional requirements. Facility filtering, some room administration, external email and report exports remain partial (MCCBS project team 2026a).")

h("2. System architecture")
p("React provides the interface, Express processes API requests and PostgreSQL stores users, rooms, bookings and events. The API validates inputs and access permissions before database changes. Approval checks availability again to reduce booking conflicts. This separation supports testing and maintenance (React n.d., Express n.d.).")
p("[PLACEHOLDER: Insert Draw.io Diagram 1 - Three-tier system architecture here]")

h("3. Project management model")
p("The project follows an iterative, Agile-style approach informed by Scrum inspection and adaptation (Schwaber and Sutherland 2020). The team planned work around requirements, integration, interface improvements and verification. GitHub Issues track tasks and acceptance checks. Feature branches, pull requests and CI provide development evidence (GitHub n.d.). CORS, demo credentials and an incomplete classroom schema were addressed through configuration correction, reseeding and the complete Task 2 schema.")

h("4. RACI matrix")
p("Proposed responsibilities for team confirmation. R: responsible, A: accountable, C: consulted, I: informed.")
table(["Workstream","AS","MT","AG","WK","AA"],[
["Requirements and report","A/R","C","C","C","I"],
["Database and API","C","A/R","R","C","I"],
["Accounts and booking","C","R","A/R","C","I"],
["Frontend and integration","I","C","C","A/R","C"],
["Testing and evidence","C","R","R","C","A/R"],
["Final package review","R","C","C","A/R","R"]])
p("AS: Asiful, MT: Maruf, AG: Abdul Rahman, WK: Waheed, AA: Arnob.")

h("5. Installation requirements")
p("Windows 10 or 11, Node.js 20 or later (supported LTS recommended), npm, PostgreSQL 18 with pgAdmin, Chrome or Edge, and network access for package installation. Keep ports 5432, 3001 and 5173 available.")

h("6. Installation procedure")
p("1. Download the active branch ZIP, extract it and open the project folder.")
p("2. In pgAdmin create an empty database named mccbs_task3. Open its Query Tool, load database/schema.sql and execute once. Do not reapply to an existing populated database.")
p("3. In backend, run copy .env.example .env. Edit PGPASSWORD, JWT_SECRET (at least 32 random characters), DEMO_PASSWORD (at least 10 characters), and CORS_ORIGIN=http://127.0.0.1:5173. Retain PGDATABASE=mccbs_task3 and PORT=3001.")
p("4. In backend, run npm install, npm run seed, npm test and npm start in sequence. Keep the terminal open.")
p("5. In a second terminal, open frontend, run npm install and npm run dev. Browse to http://127.0.0.1:5173.")
p("6. Confirm http://localhost:3001/api/health reports database connected. Never distribute .env or passwords.")

h("7. User manual")
sh("7.1 Account access and room search")
p("Select Create Account, enter details, then verify the six-digit code before signing in. Without SMTP, the code appears only in the local development terminal. Select Find a space, choose a future date, start and end times, and capacity, then select Search rooms.")
figure("E08","1. Account verification")
figure("E02","2. Room availability search")
sh("7.2 Booking and staff approval")
p("Select Request booking, confirm the details and submit. My bookings shows Pending. Sign in as staff, open Staff and approve or reject the request. Return to the resident account to view the decision or cancel an eligible booking.")
p("[PLACEHOLDER: Insert Draw.io Diagram 2 - Booking lifecycle here]")
figure("E04","3. Pending booking")
figure("E05","4. Staff decision controls")
figure("E13","5. Cancelled booking")
sh("7.3 Community events")
p("Choose Community events, select Promote your event for free, enter the event details and submit. Staff review the pending event. Approved events appear on the public noticeboard.")
figure("E11","6. Published community event")

h("8. Meeting minutes")
p("The supplied Week 5 and 6 record contains the following scheduled meetings and reconstructed topics. Actual attendance, decisions and individual allocations require team confirmation.")
table(["Date (2026)","Recorded topic"],[
["14 Nov","Architecture and database"],
["17 Nov","Accounts and API"],
["19 Nov","Booking and staff workflows"],
["22 Nov","Responsive UI and events"],
["24 Nov","Testing and submission"]])
p("All sessions were scheduled for 8:00 to 10:00 PM. Waheed's internal final check was reported by the team. Full minutes accompany the report.")

h("9. Collaboration evidence and quality assurance")
p("The live issue register includes core implementation (#7), database verification (#8), walkthrough (#9), contributions (#10) and interface improvements (#11). PR #13 and the evidence register document changes and acceptance checks. The 25 November checkpoint reported 25 unit, 18 API, six verification and five Chromium tests passing. Independent review and member-specific commit evidence remain outstanding. Complete a fresh installation, final regression tests and outstanding client requirements before the showcase (MCCBS project team 2026b).")
p("Repository: https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System")
p("Issues: https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/issues")
p("PR: https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/pull/13")
p("Task 2 board commit: https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/commit/078c6ecd1090304891267f1488a36fc462de3741")

h("References")
for ref in [
"Express n.d., Express web framework, viewed 27 November 2026, https://expressjs.com/.",
"GitHub n.d., About issues, viewed 27 November 2026, https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues.",
"MCCBS project team 2026a, Portfolio Task 3 implementation report and screenshot evidence, Australian Institute of Higher Education, 25 November, unpublished assessment documents.",
"MCCBS project team 2026b, Task 3 submission evidence register, GitHub, viewed 27 November 2026, https://github.com/waheed239407/Melbourne-Community-Centre-Booking-System/blob/ui/ux-overhaul/docs/task3-submission-evidence-register.md.",
"React n.d., Quick start, viewed 27 November 2026, https://react.dev/learn.",
"Schwaber, K and Sutherland, J 2020, The Scrum Guide, viewed 27 November 2026, https://scrumguides.org/scrum-guide.html."
]: p(ref)
alltext="\n".join(body_text)
assert "\u2014" not in alltext and chr(59) not in alltext, "Forbidden punctuation detected"
print("Text word count including references and tables:",len(alltext.split()))
d.save(args.output)
print("Created:",args.output.resolve())
if missing: print("Missing screenshot IDs:",", ".join(missing))
if not report: print("Original implementation report not found. Add team names and student IDs manually.")
print("Insert the supplied Draw.io diagrams and verify final client requirements and team records before submission.")
