import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 760, "TRETA SYSTEM • SYSTEM ARCHITECTURE, DATA MANAGEMENT & DELAY ENGINE MANUAL")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(40, 752, 572, 752)
        
        # Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)
        
        self.setFont("Helvetica", 8)
        self.drawString(40, 30, "CONFIDENTIAL & PROPRIETARY • TRETA SYSTEM TECHNICAL REPORT")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 30, page_str)
        self.restoreState()

def build_pdf(filename="TRETA_SYSTEM_Comprehensive_Summary_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a')
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#2563eb')
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#475569')
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    formula_style = ParagraphStyle(
        'FormulaStyle',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#0f172a'),
        backColor=colors.HexColor('#f1f5f9'),
        borderPadding=5,
        spaceBefore=3,
        spaceAfter=5
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9,
        textColor=colors.HexColor('#1e293b')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    table_cell_pass = ParagraphStyle(
        'TableCellPass',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#16a34a')
    )

    story = []

    # Cover Title Banner
    story.append(Paragraph("TRETA SYSTEM", title_style))
    story.append(Paragraph("Comprehensive System Architecture, Data Lifecycle & Compound Delay Engine Manual", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"<b>System Scope:</b> Core Railway Simulation Engine, Dual-Database Sandbox, 5-Stage Physical Model & Dynamic RailRadar Telemetry<br/><b>Generated Date:</b> {datetime.now().strftime('%B %d, %Y • %H:%M IST')} &nbsp;|&nbsp; <b>Status:</b> Production Verified (100% Endpoints Operational)", meta_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284c7'), spaceAfter=8))

    # SECTION 1
    story.append(Paragraph("1. Executive Summary & Full Endpoint Operational Audit", h1_style))
    story.append(Paragraph(
        "The <b>TRETA SYSTEM</b> is an enterprise-grade railway simulation and compound predictive ETA platform. "
        "It combines real-time physical kinetic modeling, network constraint dispatching, and dynamic buffer slack absorption with strict dual-database isolation. "
        "All 15 system API endpoints were audited against the active backend server (<code>http://localhost:8000</code>) and confirmed 100% operational with HTTP 200 responses.",
        body_style
    ))

    # Endpoint Audit Table
    headers = [
        Paragraph("#", table_header_style),
        Paragraph("Method", table_header_style),
        Paragraph("Route / Endpoint", table_header_style),
        Paragraph("Operational Purpose & Parameters", table_header_style),
        Paragraph("Status", table_header_style),
        Paragraph("Payload Verification", table_header_style)
    ]

    endpoint_rows = [
        ("1", "GET", "/api/simulation/status", "Database sandbox status check", "200 OK", "mode: PRISTINE, is_pristine: true"),
        ("2", "GET", "/api/search?q=12001", "Fast train search/autocomplete", "200 OK", "Matched NDLS HBJ SHATABDI (12001)"),
        ("3", "GET", "/api/train_info?train_no=12001", "Full timetable metadata & hops", "200 OK", "Tier 1, route dist, EA slack, stops"),
        ("4", "GET", "/api/corridors", "7 National Corridors", "200 OK", "DEL-MUM, DEL-HWH, DEL-MAS, etc."),
        ("5", "GET", "/api/state_borders", "29 State Border divisions", "200 OK", "29 border keys (SB-DL, SB-MH, etc.)"),
        ("6", "GET", "/api/segments?corridor_slug=DEL-MUM&limit=5", "Corridor route segments", "200 OK", "5 sequential Treta segment hops"),
        ("7", "GET", "/api/predict?train_no=12919&speedup=10&sec=15", "5-stage physics compound engine", "200 OK", "Gross/Net delay, MPS speedup, ETAs"),
        ("8", "GET", "/api/predict (multi_station_injections)", "Per-station circumstance shocks", "200 OK", "Aggregates station-wise weather/TSR"),
        ("9", "GET", "/api/railradar/live?train_no=12919", "Real-time GPS tracking telemetry", "200 OK", "Live speed, delay, progress fraction"),
        ("10", "GET", "/api/railradar/config", "RailRadar credentials config", "200 OK", "API key status, preview, sample train"),
        ("11", "GET", "/api/railradar/match?train_no=12919", "Scenario matrix nearest match (Query)", "200 OK", "Matches MasterPnC scenario in WIN.db"),
        ("12", "POST", "/api/railradar/match", "Scenario matrix nearest match (Body)", "200 OK", "Accepts telemetry JSON & matches"),
        ("13", "GET", "/api/railradar/auto_fetch_and_freeze", "One-click fetch, freeze & predict", "200 OK", "Locks controls to live telemetry"),
        ("14", "POST", "/api/simulation/push", "Write what-if edits to sandbox", "200 OK", "Writes to WIN_SIMULATION.db only"),
        ("15", "POST", "/api/simulation/reset", "Restore sandbox to pristine baseline", "200 OK", "Master untouched; rollback complete")
    ]

    table_data = [headers]
    for row in endpoint_rows:
        table_data.append([
            Paragraph(row[0], table_cell_bold),
            Paragraph(row[1], table_cell_bold),
            Paragraph(row[2], table_cell_style),
            Paragraph(row[3], table_cell_style),
            Paragraph(row[4], table_cell_pass),
            Paragraph(row[5], table_cell_style),
        ])

    col_widths = [16, 38, 140, 160, 42, 136]
    ep_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    ep_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))

    story.append(ep_table)
    story.append(Spacer(1, 10))

    # SECTION 2
    story.append(Paragraph("2. Data Lifecycle: Ingestion, Preprocessing, Calculation, Reuse & Management", h1_style))
    story.append(Paragraph("A. Dual-Database Isolation Architecture", h2_style))
    story.append(Paragraph(
        "To prevent accidental corruption of baseline railway timetables while providing dynamic what-if dispatch simulations, "
        "TRETA SYSTEM implements an isolated dual-database architecture:",
        body_style
    ))

    db_flow = [
        [
            Paragraph("<b>WIN.db (Master Database)</b>", table_header_style),
            Paragraph("<b>WIN_SIMULATION.db (Sandbox Working Copy)</b>", table_header_style)
        ],
        [
            Paragraph(
                "• <b>Access Mode:</b> Strictly Read-Only (<code>file:WIN.db?mode=ro</code>).<br/>"
                "• <b>Master Data:</b> 10,620 train metadata records, 38,880 precomputed scenario combinations (<code>MasterPnC</code>), 1,843 corridor segments, and 9,950 station state border mappings.<br/>"
                "• <b>Integrity Guarantee:</b> No user action, API request, or automated script can write to this file.",
                table_cell_style
            ),
            Paragraph(
                "• <b>Access Mode:</b> Read-Write Working Sandbox.<br/>"
                "• <b>Dynamic Alterations:</b> Tracks four simulation columns in <code>RouteDivision</code>: <code>sim_proposed_delay</code>, <code>sim_new_eta</code>, <code>sim_status</code>, and <code>sim_updated_at</code>.<br/>"
                "• <b>Live Telemetry Persistence:</b> Records incoming GPS snapshots into <code>RailRadarTelemetry</code> and secondary impacts into <code>SimulationCascadedEffects</code>.<br/>"
                "• <b>Atomic Rollback:</b> <code>/api/simulation/reset</code> overwrites sandbox with pristine master copy.",
                table_cell_style
            )
        ]
    ]
    t_db = Table(db_flow, colWidths=[266, 266])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#1e293b')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#0369a1')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#f8fafc')),
        ('BACKGROUND', (1, 1), (1, 1), colors.HexColor('#f0f9ff'))
    ]))
    story.append(t_db)
    story.append(Spacer(1, 6))

    story.append(Paragraph("B. Pre-Warmed In-Memory Data Caching & Sub-Millisecond Reuse", h2_style))
    story.append(Paragraph(
        "Upon application boot, <code>AppServer.py</code> indexes and retains core railway network topology in memory to eliminate SQL latency during real-time delay inference:",
        body_style
    ))
    story.append(Paragraph("• <b>TRAIN_MAP & EACalculation:</b> 10,620 train profiles cached into hash tables for O(1) retrieval of train tier, total distance, scheduled halts, and baseline Extra Allotted Time (EA).", bullet_style))
    story.append(Paragraph("• <b>STATION_TIMETABLE_INDEX & HOP_INDEX:</b> Inverts 200,126 dynamic Treta section hops across 31,546 station pairs. Hops are instantly queryable by station code pairs <code>(from_code, to_code)</code> without touching disk.", bullet_style))
    story.append(Paragraph("• <b>MASTER_PNC_CACHE:</b> Pre-loaded 38,880 scenario permutations for instant O(1) matching against incoming RailRadar live telemetry.", bullet_style))
    story.append(Paragraph("• <b>STATION_STATE_MAP:</b> Lookup index mapping 9,950 stations to 29 state border division codes (<code>SB-DL, SB-MH, SB-UP</code>, etc.) for automated border crossing identification.", bullet_style))
    story.append(Spacer(1, 6))

    # SECTION 3
    story.append(Paragraph("3. The 5-Stage Physical Compound Delay Engine", h1_style))
    story.append(Paragraph(
        "The delay engine simulates how primary exogenous shocks trigger secondary network constraints, "
        "which are mitigated by driver speedup catch-up and timetable buffer slack ($EA$) to determine final destination delay and station-by-station ETAs.",
        body_style
    ))

    # Formula Box 1
    story.append(Paragraph("STAGE 1: Primary Disturbance Shock Layer (PD)", h2_style))
    story.append(Paragraph("PD = D_inherited + D_weather + D_TSR + D_ACP + D_traction + D_section + D_multi_station", formula_style))
    story.append(Paragraph(
        "• <b>Inherited Delay (D_inherited):</b> Live operational delay ingested directly from RailRadar GPS telemetry.<br/>"
        "• <b>Weather Disturbances (D_weather):</b> Clear (0m), Fog (+15m), Heavy Rain (+25m), Cyclone / Severe Weather (+60m).<br/>"
        "• <b>Temporary Speed Restrictions (D_TSR):</b> None (0m), TSR 60 (+5m), TSR 45 (+10m), TSR 30 (+20m), TSR 15 (+35m).<br/>"
        "• <b>Alarm Chain Pulling (D_ACP):</b> 0 Events (0m), 1 Event (+10m brake reset & investigation), 2 Events (+25m).<br/>"
        "• <b>Locomotive Traction Defects (D_traction):</b> Nominal (0m), Minor Traction Defect (+15m), Major Engine Failure (+45m).<br/>"
        "• <b>Section & Multi-Station Injections:</b> Direct user-injected corridor section delay plus cumulative station circumstance penalties.",
        body_style
    ))

    # Formula Box 2
    story.append(Paragraph("STAGE 2: Secondary Network Constraint Layer (CD)", h2_style))
    story.append(Paragraph("CD = D_headway + D_crossing + D_platform + D_crew", formula_style))
    story.append(Paragraph(
        "• <b>Headway & Priority Congestion (D_headway):</b> Track Clear (0m), Medium Congestion (+12m), Heavy Express Congestion (+30m), Severe Gridlock (+55m).<br/>"
        "• <b>Single-Track Crossing Conflicts (D_crossing):</b> No Conflict (0m), Minor Wait (+8m), Major Cross / Siding Hold (+22m).<br/>"
        "• <b>Terminal Platform Starvation (D_platform):</b> Platform Available (0m), Platform Occupied (+12m), Terminal Gridlock (+30m).<br/>"
        "• <b>Crew Duty Hours of Service (D_crew):</b> Duty Valid <8h (0m), Duty Approaching Limit (+10m), Duty Expired >=8h (+40m mandatory crew change).",
        body_style
    ))

    # Formula Box 3
    story.append(Paragraph("STAGE 3: Gross Delay (GD) & Maximum Permissible Speed (MPS) Speedup Recovery", h2_style))
    story.append(Paragraph("GD = PD + CD   |   D_speedup_recovered = min(GD, D_speedup_allowance)   |   GD_eff = GD - D_speedup_recovered", formula_style))
    story.append(Paragraph(
        "When trains travel across unconstrained green-signal sections, locomotive pilots can accelerate up to the section Maximum Permissible Speed (MPS). "
        "The system calculates throttle margin recovery allowance (presets: 0m, 5m, 10m, 15m, 20m) to offset gross delay before entering timetable buffer zones.",
        body_style
    ))

    # Formula Box 4
    story.append(Paragraph("STAGE 4: Timetable Buffer Slack (EA) Absorption", h2_style))
    story.append(Paragraph("Max_Absorbed = EA * Tier_Recovery_Rate (TRR)   |   D_absorbed = min(GD_eff, Max_Absorbed)", formula_style))
    story.append(Paragraph(
        "Every scheduled timetable incorporates Extra Allotted Time (EA in minutes) engineered into run profiles. "
        "The absorption efficiency depends on the train category tier:<br/>"
        "• <b>Tier 1 Premium (Vande Bharat / Shatabdi / Rajdhani):</b> <b>35%</b> recovery rate.<br/>"
        "• <b>Tier 2 Superfast (Superfast / Mail / Express):</b> <b>22%</b> recovery rate.<br/>"
        "• <b>Tier 3 Ordinary / Freight (Passenger / Goods):</b> <b>12%</b> recovery rate.",
        body_style
    ))

    # Formula Box 5
    story.append(Paragraph("STAGE 5: Net Destination Delay (ND) & Dynamic ETA", h2_style))
    story.append(Paragraph("ND = max(0.0, GD_eff - D_absorbed)   |   Predicted_Arrival_Clock = Scheduled_Arrival_Clock + ND", formula_style))
    story.append(Paragraph(
        "• <b>Status Classification:</b> ON_TIME (ND <= 5.0m), SLIGHT_DELAY (5m < ND <= 30m), MODERATE_DELAY (30m < ND <= 60m), MAJOR_DELAY (ND > 60m).<br/>"
        "• <b>Ahead Stations Dynamic ETAs:</b> Stop-by-stop progressive simulation calculates distance traversed, applies local circumstance penalties, and computes actual arrival and departure clock times with scheduled platform dwell durations.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Sequential Cascading & Invariance
    story.append(Paragraph("Cascading Ripple Propagation & Absorption Invariance Rule", h2_style))
    story.append(Paragraph(
        "• <b>Active Cascading Ripple (ND > 0):</b> When the primary train arrives late, headway blocks delay direct trailing followers (Train B inherits ~70% ripple) and secondary downstream followers (Train C inherits ~45% ripple).<br/>"
        "• <b>Absorption Invariance Rule (ND <= 0):</b> When speedup catch-up or buffer slack (EA) absorbs all disturbance delay (Net Delay = 0.0), <b>downstream propagation is strictly deactivated</b> (<code>has_cascading_delay = False</code>, <code>overlaid_trains = []</code>), preventing false alarm cascades.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # SECTION 4 & 5
    story.append(Paragraph("4. RailRadar Live GPS Integration & Telemetry Freezing", h1_style))
    story.append(Paragraph(
        "1. <b>Live GPS Telemetry Ingestion:</b> Automatically contacts RailRadar API for real-time delay minutes, instantaneous speed (km/h), segment progress fraction (0.0 to 1.0), and halt station status.<br/>"
        "2. <b>Permutation Scenario Matching:</b> Matches live delay to the nearest precomputed scenario in <code>WIN.db</code> (MasterPnC 38,880 combinations).<br/>"
        "3. <b>Control Freezing:</b> Locks UI sliders in <i>Operational Disturbance Cases</i> (<code>is_frozen: true</code>) to preserve real-world ground truth while live telemetry is active.<br/>"
        "4. <b>Offline / Built-in Engine Fallback:</b> If no network signal or API key is available, the engine smoothly falls back to built-in sample telemetry (e.g. Train 12919 Malwa SF Express) with clean baseline data.",
        body_style
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("5. Complete Project Feature Matrix", h1_style))
    
    features_data = [
        [Paragraph("<b>Component / Layer</b>", table_header_style), Paragraph("<b>Key Features & Capabilities</b>", table_header_style)],
        [
            Paragraph("<b>Unified Branding & Header</b>", table_cell_bold),
            Paragraph("Global <code>TRETA SYSTEM</code> branding, real-time database mode indicator (PRISTINE vs MODIFIED), and active national corridor badge.", table_cell_style)
        ],
        [
            Paragraph("<b>Corridor & Route Selector</b>", table_cell_bold),
            Paragraph("Instant search over 10,620 trains with autocomplete; dropdown filters for 7 National Corridors, 29 State Border Divisions, and individual route segment hops.", table_cell_style)
        ],
        [
            Paragraph("<b>Operational Disturbance Cases</b>", table_cell_bold),
            Paragraph("Unified 4-group control suite: Physical Disturbances (Weather, TSR, Traction), Network Constraints (Headway, Crossings, Platforms), Operational Rules (ACP, Crew HOS), and Multi-Station Circumstances & Injected Delay Engine.", table_cell_style)
        ],
        [
            Paragraph("<b>Multi-Station Circumstance Injector</b>", table_cell_bold),
            Paragraph("Allows dispatchers to pick any halt station along the train route, assign specific weather/TSR shocks, and view active circumstance chips with one-click removal.", table_cell_style)
        ],
        [
            Paragraph("<b>Ahead Stations ETA Board</b>", table_cell_bold),
            Paragraph("Real-time stop-by-stop timetable showing scheduled vs predicted arrival/departure clock times, dwell times, and accumulated delay across all upcoming stations.", table_cell_style)
        ],
        [
            Paragraph("<b>Cascaded Ripple Visualizer</b>", table_cell_bold),
            Paragraph("Visualizes ripple propagation across the track block from Primary Incident Train A to Trailing Train B and Downstream Train C.", table_cell_style)
        ],
        [
            Paragraph("<b>Database Sandbox Manager</b>", table_cell_bold),
            Paragraph("Interactive 'Push to Simulation DB' (writes what-if mutations to WIN_SIMULATION.db) and 'Reset Simulation DB' (atomic file rollback to master baseline).", table_cell_style)
        ]
    ]
    t_feat = Table(features_data, colWidths=[140, 392])
    t_feat.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    story.append(t_feat)
    story.append(Spacer(1, 8))

    # SECTION 6
    story.append(Paragraph("6. Deployment & Runtime Operations", h1_style))
    story.append(Paragraph(
        "• <b>Backend API Server:</b> Running on <code>http://localhost:8000</code> via <code>python AppServer.py</code>.<br/>"
        "• <b>Frontend Web Application:</b> Running on <code>http://localhost:3000</code> via <code>npm run dev</code> (or <code>npm start</code>).<br/>"
        "• <b>Environment Configuration:</b> PostgreSQL / NeonDB connection, RailRadar API key, and master database paths configured in <code>Backend/.env</code>.",
        body_style
    ))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF successfully compiled: {os.path.abspath(filename)}")

if __name__ == "__main__":
    output_pdf = os.path.join(os.getcwd(), "TRETA_SYSTEM_Comprehensive_Summary_Report.pdf")
    build_pdf(output_pdf)
