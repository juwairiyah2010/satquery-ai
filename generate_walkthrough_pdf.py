"""
generate_walkthrough_pdf.py
Generates a comprehensive, publication-quality executive PDF walkthrough of all SatQuery AI features.
"""
import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette (Space / Government Tech Theme)
    c_primary = colors.HexColor("#0f172a")     # Deep Slate
    c_teal = colors.HexColor("#0d9488")        # Satellite Teal
    c_blue = colors.HexColor("#0284c7")        # Ocean Blue
    c_amber = colors.HexColor("#d97706")       # Warning Amber
    c_green = colors.HexColor("#16a34a")       # Success Green
    c_bg_light = colors.HexColor("#f8fafc")    # Light Box
    c_border = colors.HexColor("#e2e8f0")      # Border Dim
    c_text = colors.HexColor("#334155")        # Body Text
    c_muted = colors.HexColor("#64748b")       # Subtext

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_teal,
        alignment=TA_CENTER
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_muted,
        alignment=TA_CENTER
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_teal,
        spaceBefore=8,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_text,
        alignment=TA_LEFT,
        spaceAfter=5
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_text,
        leftIndent=12,
        spaceAfter=3
    )
    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#065f46")
    )
    table_hdr_style = ParagraphStyle(
        'TblHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    table_cell_style = ParagraphStyle(
        'TblCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_text
    )

    story = []

    # ═════════════════════════════════════════════════════════════════════════
    # COVER / HEADER BANNER
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 10))
    story.append(Paragraph("🛰️ SATQUERY AI", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("COMPREHENSIVE PLATFORM WALKTHROUGH & ARCHITECTURE REPORT", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Grounded Earth Observation Intelligence · Multi-Modal Sensor Fusion · Anti-Hallucination Core", meta_style))
    story.append(Paragraph("<b>Version:</b> 0.4.0-Production &nbsp;|&nbsp; <b>Authority:</b> ISRO/SAC & Remote Sensing Decision Suite &nbsp;|&nbsp; <b>Date:</b> August 2026", meta_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_teal, spaceAfter=14))

    # Executive Summary Box
    exec_summary_html = "<b>EXECUTIVE MISSION STATEMENT:</b> SatQuery AI is a space-data intelligence platform designed to eliminate model hallucination in Earth Observation. Operating strictly under the core directive: <i>'Never guess when the available data cannot support the answer'</i>, the system dynamically assesses input modalities, validates external telemetry requirements, delineates physical ground-truth disaster sectors, and generates official decision-ready briefings for government departments."
    exec_box = Table([[Paragraph(exec_summary_html, callout_style)]], colWidths=[540])
    exec_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#a7f3d0")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(exec_box)
    story.append(Spacer(1, 12))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 1: SATELLITE IMAGE UPLOAD & SENSOR INTELLIGENCE
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Multi-Modal Satellite Ingestion & Modality Intelligence", h1_style))
    story.append(Paragraph("The platform supports single-scene and dual-scene comparative acquisitions across major spaceborne sensor formats:", body_style))
    story.append(Paragraph("• <b>Supported Formats:</b> GeoTIFF (.tif/.tiff), PNG, JPEG with preservation of multi-spectral bands.", bullet_style))
    story.append(Paragraph("• <b>Scene A & Scene B Dual Slots:</b> Clearly demarcates baseline reference imagery (Scene A) from post-event acquisitions (Scene B).", bullet_style))
    story.append(Paragraph("• <b>Automatic Modality Intelligence:</b> Eliminates manual sensor selection by analyzing pixel variance and spectral saturation to automatically identify <i>Optical / Multi-Spectral</i> vs. <i>SAR Radar Imagery</i> (Sentinel-1 C-Band).", bullet_style))
    story.append(Paragraph("• <b>Image Relationship Engine:</b> Automatically detects whether dual uploads represent a <i>Bi-Temporal Pair</i> (same sensor, different time), a <i>Cross-Modal Pair</i> (Optical + SAR), or flags a <i>Geographic Mismatch</i>.", bullet_style))
    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 2: ANTI-HALLUCINATION & EVIDENCE-FIRST REASONING
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Anti-Hallucination & Quad-Tier Evidence Categorization", h1_style))
    story.append(Paragraph("Traditional Vision-Language Models often hallucinate speculative answers when asked unanswerable questions (e.g. predicting future flood arrival from a single static photograph). SatQuery AI strictly categorizes all output into four rigorous tiers:", body_style))
    
    evidence_table_data = [
        [Paragraph("Category", table_hdr_style), Paragraph("Definition", table_hdr_style), Paragraph("Platform Behavioral Rule", table_hdr_style)],
        [
            Paragraph("<b>1. Observed</b>", table_cell_style),
            Paragraph("Direct physical evidence verifiable in image pixels (e.g. water bodies, building rooftops).", table_cell_style),
            Paragraph("Stated with high confidence as physical fact.", table_cell_style)
        ],
        [
            Paragraph("<b>2. Inferred</b>", table_cell_style),
            Paragraph("Contextual assessments derived from physical proximity, terrain gradients, and heuristics.", table_cell_style),
            Paragraph("Explicitly labeled as AI inference / probabilistic estimate.", table_cell_style)
        ],
        [
            Paragraph("<b>3. Predicted</b>", table_cell_style),
            Paragraph("Future projections requiring multi-source temporal feeds (rainfall, river gauges).", table_cell_style),
            Paragraph("<b>BLOCKED</b> if required telemetry feeds are missing.", table_cell_style)
        ],
        [
            Paragraph("<b>4. Missing Data</b>", table_cell_style),
            Paragraph("Explanations detailing precisely why the query cannot be answered with current inputs.", table_cell_style),
            Paragraph("Recommends exact sensor / telemetry feeds needed.", table_cell_style)
        ],
    ]
    t_ev = Table(evidence_table_data, colWidths=[90, 230, 220])
    t_ev.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_ev)
    story.append(Spacer(1, 10))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 3: "DO I HAVE ENOUGH EVIDENCE?" CHECKLIST
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. 'Do I Have Enough Evidence?' 5-Point Data Verification", h1_style))
    story.append(Paragraph("Before executing any analytical workflow, SatQuery AI checks a 5-point data requirement matrix:", body_style))
    story.append(Paragraph("1. <b>Satellite Imagery Available:</b> Validates raster dimensions, bands, and resolution.", bullet_style))
    story.append(Paragraph("2. <b>Temporal Pair Status:</b> Verifies if comparative questions have both Before and After scenes.", bullet_style))
    story.append(Paragraph("3. <b>Multi-Source Auxiliary Telemetry:</b> Checks rainfall gauges, DEM elevation, and meteorological forecasts.", bullet_style))
    story.append(Paragraph("4. <b>Spatial Coverage Compatibility:</b> Verifies geographic overlap between scenes.", bullet_style))
    story.append(Paragraph("5. <b>False-Positive Exclusion Calibration:</b> Ensures baseline permanent water bodies (rivers/reservoirs) are not misclassified as active disaster inundation.", bullet_style))
    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 4: DISASTER-AREA DETECTION & VISUAL REGION GROUNDING
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. Disaster-Area Detection & Interactive Visual Grounding", h1_style))
    story.append(Paragraph("The visual grounding engine transforms raw classification into physical, inspectable geographic overlays:", body_style))
    story.append(Paragraph("• <b>Interactive Overlays:</b> Renders semi-transparent vector polygon boundaries and bounding boxes directly on top of satellite imagery without altering raw pixels.", bullet_style))
    story.append(Paragraph("• <b>Region Delineation:</b> Identifies distinct affected sectors (Region 01, Region 02, Region 03) with calculated square kilometer footprints and percentage of region of interest (ROI).", bullet_style))
    story.append(Paragraph("• <b>'Why Was This Area Marked?' Inspector:</b> Clickable pins provide deep evidence rationale, explaining specular radar backscatter attenuation (< -18 dB), modified NDWI spectral drops, or delta-NBR burn scar signatures.", bullet_style))
    story.append(Paragraph("• <b>Multi-Disaster Support:</b> Specialist models for Flood & Inundation, Forest Fire / Wildfire Burn Scars, Landslide Slope Failure, and Cyclone Debris.", bullet_style))
    story.append(Paragraph("• <b>Bi-Temporal Delta & Swipe:</b> Interactive Before (T0) vs After (T1) comparative view for instantaneous visual change verification.", bullet_style))
    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 5: CROSS-MODAL AGREEMENT & CHANGE STORYTELLING
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Cross-Modal Consensus & Multi-Temporal Change Stories", h1_style))
    story.append(Paragraph("• <b>Cross-Modal Agreement (Optical + SAR):</b> When both optical and radar scenes are provided, SatQuery computes an agreement consensus score (e.g. <i>92% High Agreement</i>). Disagreements caused by optical cloud cover or radar terrain shadows are explicitly flagged rather than concealed.", bullet_style))
    story.append(Paragraph("• <b>Chronological Change Story:</b> Replaces simple 'Before/After' outputs with an evolutionary narrative timeline tracking land cover transitions across 5 domains (Urban Growth, Deforestation, Water-Body Shifts, Infrastructure, Agriculture).", bullet_style))
    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 6: GOVERNMENT DECISION SUITE (ISRO / SAC MODES)
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. Government Decision Mode (Multi-Agency Operational Suite)", h1_style))
    story.append(Paragraph("Dedicated operational frameworks tailored for Indian space and disaster management authorities:", body_style))
    
    dept_table_data = [
        [Paragraph("Agency / Sector", table_hdr_style), Paragraph("Authority", table_hdr_style), Paragraph("Primary Operational Inquiries", table_hdr_style)],
        [
            Paragraph("🌊 <b>Disaster Management</b>", table_cell_style),
            Paragraph("NDEM / NRSC-ISRO", table_cell_style),
            Paragraph("Which areas are inundated? Where has flood spread? Submerged transit corridors.", table_cell_style)
        ],
        [
            Paragraph("🌳 <b>Forest Monitoring</b>", table_cell_style),
            Paragraph("Forest Survey of India", table_cell_style),
            Paragraph("Has canopy density decreased? Where are active burn scars / deforestation zones?", table_cell_style)
        ],
        [
            Paragraph("🏙️ <b>Urban Planning</b>", table_cell_style),
            Paragraph("MoHUA / Smart Cities", table_cell_style),
            Paragraph("Has built-up area expanded? Where has new construction encroached on green belts?", table_cell_style)
        ],
        [
            Paragraph("🌾 <b>Agriculture</b>", table_cell_style),
            Paragraph("Mahalanobis Crop Centre", table_cell_style),
            Paragraph("Has crop vigor changed? Which parcels exhibit drought or waterlogging stress?", table_cell_style)
        ],
        [
            Paragraph("💧 <b>Water Resources</b>", table_cell_style),
            Paragraph("Central Water Commission", table_cell_style),
            Paragraph("Has surface water coverage expanded/contracted? Reservoir storage volume estimates.", table_cell_style)
        ]
    ]
    t_dept = Table(dept_table_data, colWidths=[130, 130, 280])
    t_dept.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_teal),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_light]),
    ]))
    story.append(t_dept)
    story.append(Spacer(1, 10))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 7: PRODUCTION AUTHENTICATION & WORKSPACE ISOLATION
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("7. Production-Grade Authentication & Workspace Isolation", h1_style))
    story.append(Paragraph("A secure, enterprise-grade access control and user workspace isolation engine:", body_style))
    story.append(Paragraph("• <b>Security Architecture:</b> Passwords hashed with <b>Bcrypt (12 rounds)</b>; zero plaintext passwords. Stateless <b>JWT sessions (HS256)</b> with Bearer token authentication.", bullet_style))
    story.append(Paragraph("• <b>Strict User Isolation:</b> Relational SQLite/PostgreSQL schema tying analyses and reports to <code>user_id</code>. User A can never access or query User B's historical records (enforced via 404 guards).", bullet_style))
    story.append(Paragraph("• <b>Workspace Features:</b> Interactive registration with live 5-point password strength meter, email verification, password reset tokens, personal dashboard metrics, searchable history repository, and profile management with danger zone account deletion.", bullet_style))
    story.append(Paragraph("• <b>Hybrid Offline Resilience:</b> Automatic client-side fallback storage engine ensuring seamless registration, login, analysis, and report generation even on standalone Vercel preview deployments.", bullet_style))
    story.append(Spacer(1, 8))

    # ═════════════════════════════════════════════════════════════════════════
    # SECTION 8: DECISION REPORT GENERATOR & DEPLOYMENT
    # ═════════════════════════════════════════════════════════════════════════
    story.append(Paragraph("8. Official Decision Briefing Generator & Vercel Deployment", h1_style))
    story.append(Paragraph("• <b>Decision-Ready Briefing Export:</b> Generates official government briefings titled <code>SatQuery AI — Satellite Disaster Assessment</code> formatted with reference IDs, classification banners (FOR OFFICIAL USE ONLY), evidence audits, and print-ready PDF styling.", bullet_style))
    story.append(Paragraph("• <b>Cloud & Vercel Deployment:</b> Fully configured with <code>vercel.json</code> SPA routing rewrites (preventing 404s on refreshes) and pushed to GitHub (<code>https://github.com/juwairiyah2010/satquery-ai</code>).", bullet_style))
    story.append(Spacer(1, 14))

    # Footer Signoff
    story.append(HRFlowable(width="100%", thickness=1, color=c_border, spaceAfter=8))
    signoff_text = "<b>SatQuery AI Platform Architecture Report</b> · Verified & Generated via Autonomous Space-Data Engineering Core · Confirmed Zero-Hallucination Grounding"
    story.append(Paragraph(signoff_text, meta_style))

    doc.build(story)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "SatQuery_AI_Complete_Walkthrough_Report.pdf"
    build_pdf(out_path)
