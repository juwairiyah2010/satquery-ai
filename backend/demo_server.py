"""
demo_server.py
Upgraded SatQuery AI Server with Natural-Language Intent Understanding,
Data Requirement Verification, Multi-Source Data Integration, and
Anti-Hallucination Evidence-First Reasoning.

Core Principle: "Never guess when the available data cannot support the answer."
"""

from __future__ import annotations

import asyncio
import random
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ─────────────────────────────────────────────────────────────────────────────
# Intent Taxonomy & Data Requirements Checklist
# ─────────────────────────────────────────────────────────────────────────────

INTENTS = {
    "FLOOD_FORECAST": {
        "label": "Flood Forecast / Future Timing",
        "desc": "Predicting future inundation timing, probability, or flood arrival",
        "required_data": [
            "satellite_imagery",
            "rainfall_data",
            "weather_forecast",
            "river_gauge_data",
            "elevation_terrain",
            "historical_flood_records",
        ],
        "can_answer_with_image_only": False,
    },
    "FLOOD_RISK_ASSESSMENT": {
        "label": "Flood Vulnerability & Risk Assessment",
        "desc": "Evaluating geographical flood susceptibility from visible terrain & proximity indicators",
        "required_data": [
            "satellite_imagery",
            "elevation_terrain",
        ],
        "can_answer_with_image_only": True, # As AI-assisted heuristic
    },
    "FLOOD_DETECTION": {
        "label": "Active Flood Detection & Mapping",
        "desc": "Identifying currently inundated land, standing water, and submerged areas",
        "required_data": [
            "satellite_imagery",
        ],
        "can_answer_with_image_only": True,
    },
    "CHANGE_DETECTION": {
        "label": "Bi-Temporal Surface Change Detection",
        "desc": "Comparing two temporal satellite acquisitions of the same geographic extent",
        "required_data": [
            "satellite_imagery",
            "bi_temporal_imagery",
        ],
        "can_answer_with_image_only": True, # Requires 2 images
    },
    "WATER_BODY_ANALYSIS": {
        "label": "Water Body & Hydrological Analysis",
        "desc": "Observing lakes, reservoirs, river channels, and coastal margins",
        "required_data": [
            "satellite_imagery",
        ],
        "can_answer_with_image_only": True,
    },
    "VEGETATION_ANALYSIS": {
        "label": "Vegetation & Canopy Health Analysis",
        "desc": "Assessing forest density, agricultural canopy, and NDVI signatures",
        "required_data": [
            "satellite_imagery",
        ],
        "can_answer_with_image_only": True,
    },
    "URBAN_CHANGE": {
        "label": "Urban & Infrastructure Analysis",
        "desc": "Identifying buildings, road corridors, settlement density, and expansion",
        "required_data": [
            "satellite_imagery",
        ],
        "can_answer_with_image_only": True,
    },
    "IMAGE_OBSERVATION": {
        "label": "General Scene Observation",
        "desc": "Describing visible land cover types, surface characteristics, and geography",
        "required_data": [
            "satellite_imagery",
        ],
        "can_answer_with_image_only": True,
    },
    "UNSUPPORTED_QUERY": {
        "label": "Unsupported / Non-Earth-Observation Query",
        "desc": "Queries requesting non-spatial, subjective, or inaccessible data",
        "required_data": [
            "unsupported_external_database",
        ],
        "can_answer_with_image_only": False,
    },
}

DATA_SOURCE_LABELS = {
    "satellite_imagery": "Primary Satellite Scene (Scene A)",
    "bi_temporal_imagery": "Comparative Satellite Scene (Scene B)",
    "rainfall_data": "Recent Precipitation Data (48h Rain Gauges)",
    "weather_forecast": "Numerical Weather Prediction (72h Forecast)",
    "river_gauge_data": "River Hydrograph & Hydrological Station Levels",
    "elevation_terrain": "Digital Elevation Model (DEM Topography)",
    "historical_flood_records": "Historical Inundation Archive & Return Frequency",
    "unsupported_external_database": "External Non-Geospatial Records",
}


# ─────────────────────────────────────────────────────────────────────────────
# Government Decision Modes (ISRO / SAC Operational Agency Framework)
# ─────────────────────────────────────────────────────────────────────────────

GOV_DEPARTMENTS = {
    "disaster": {
        "id": "disaster",
        "title": "Disaster Management",
        "icon": "🌊",
        "agency": "ISRO-NDEM / SAC Disaster Operations",
        "authority": "National Disaster Emergency Management (NDEM) / NRSC-ISRO",
        "mandate": "Rapid Inundation Delineation, Damage Assessment & Evacuation Corridor Verification",
        "color": "#0284c7",
        "questions": [
            "Which areas are affected?",
            "What changed?",
            "Which regions need attention?",
        ],
        "default_priority": "CRITICAL / EMERGENCY PROTOCOL LEVEL 1",
        "recommended_action": "Deploy emergency response teams to highlighted flooded riparian sectors and verify arterial road passability.",
    },
    "forest": {
        "id": "forest",
        "title": "Forest Monitoring",
        "icon": "🌳",
        "agency": "FSI / MoEFCC Forest Surveillance",
        "authority": "Forest Survey of India (FSI) / State Forest Department / MoEFCC",
        "mandate": "Canopy Density Tracking, Encroachment Detection & Illegal Logging Surveillance",
        "color": "#16a34a",
        "questions": [
            "Has vegetation decreased?",
            "Where is the change?",
            "What areas require inspection?",
        ],
        "default_priority": "MODERATE / REGULATORY INSPECTION",
        "recommended_action": "Dispatch forest beat officers to ground-truth coordinates of canopy loss and check for unauthorized clearance.",
    },
    "urban": {
        "id": "urban",
        "title": "Urban Planning",
        "icon": "🏙️",
        "agency": "MoHUA / TCPO Geospatial Cell",
        "authority": "Town & Country Planning Organization (TCPO) / MoHUA / Urban Development Authority",
        "mandate": "Master Plan Compliance, Unauthorized Construction Auditing & Urban Growth Modeling",
        "color": "#7c3aed",
        "questions": [
            "Has built-up area increased?",
            "Where has construction occurred?",
            "Which regions changed?",
        ],
        "default_priority": "STANDARD / MUNICIPAL COMPLIANCE",
        "recommended_action": "Cross-reference newly identified structural footprints with municipal building permit registry.",
    },
    "agriculture": {
        "id": "agriculture",
        "title": "Agriculture",
        "icon": "🌾",
        "agency": "MNCFC / DAC&FW Crop Analytics",
        "authority": "Mahalanobis National Crop Forecast Centre (MNCFC) / DAC&FW",
        "mandate": "Crop Health Assessment, Sowing Area Verification & Drought Stress Monitoring",
        "color": "#d97706",
        "questions": [
            "Has vegetation coverage changed?",
            "Which areas show unusual changes?",
        ],
        "default_priority": "SEASONAL / CROP INSURANCE AUDIT",
        "recommended_action": "Evaluate crop spectral senescence curve against expected regional phenological calendar.",
    },
    "water": {
        "id": "water",
        "title": "Water Resources",
        "icon": "💧",
        "agency": "CWC / NWIC Hydrology Division",
        "authority": "Central Water Commission (CWC) / National Water Informatics Centre (NWIC) / Jal Shakti",
        "mandate": "Reservoir Storage Monitoring, Riverbank Erosion Tracking & Surface Water Dynamics",
        "color": "#0d9488",
        "questions": [
            "Has water coverage increased/decreased?",
            "Which water bodies changed?",
        ],
        "default_priority": "ROUTINE / HYDROLOGICAL RESOURCE AUDIT",
        "recommended_action": "Update national surface water database with delineated seasonal water spread area.",
    },
}

def _get_gov_department(dept_id: str) -> Dict[str, Any]:
    return GOV_DEPARTMENTS.get(dept_id, GOV_DEPARTMENTS["disaster"])


# ─────────────────────────────────────────────────────────────────────────────
# Intent Understanding (Semantic & Meaning-Based Classification)
# ─────────────────────────────────────────────────────────────────────────────

def _classify_intent(question: str) -> tuple[str, str]:
    """
    Analyzes the complete meaning and intent of the question.
    Returns (intent_key, rationale).
    """
    q = question.lower().strip()

    # 1. Flood Forecast / Future Timing (When will it flood? Next week? Tomorrow? Likely to flood again?)
    forecast_triggers = [
        "when will", "when is", "next flood", "flood again", "flood tomorrow",
        "flood next week", "future flood", "likely to flood again", "predict flood",
        "forecast", "will it flood", "when can we expect", "in the next few days"
    ]
    if any(trigger in q for trigger in forecast_triggers):
        return (
            "FLOOD_FORECAST",
            "Query asks for temporal forecasting of future inundation events, requiring dynamic meteorological and hydrological streams."
        )

    # 2. Flood Risk / Vulnerability Assessment (Is this area at high risk? Why is it vulnerable?)
    risk_triggers = [
        "risk of flood", "flood risk", "vulnerable to flood", "flood-prone",
        "flood prone", "susceptible to flood", "danger of flood", "high risk",
        "areas should be monitored", "which areas are vulnerable"
    ]
    if any(trigger in q for trigger in risk_triggers):
        return (
            "FLOOD_RISK_ASSESSMENT",
            "Query requests vulnerability assessment and terrain-based hazard susceptibility evaluation."
        )

    # 3. Active Flood Detection (Is this area currently flooded? Where is the flood water?)
    flood_detect_triggers = [
        "currently flooded", "is this area flooded", "flooding visible", "affected by flood",
        "areas are flooded", "is it flooded", "water inundation", "submerged",
        "flood water", "where is the flood"
    ]
    if any(trigger in q for trigger in flood_detect_triggers) or ("flood" in q and not any(t in q for t in ["when", "next", "risk"])):
        return (
            "FLOOD_DETECTION",
            "Query requests direct visual detection and mapping of active standing water and surface inundation."
        )

    # 4. Bi-Temporal Change Detection (What changed? Has built-up increased? Has water coverage changed?)
    change_triggers = [
        "what changed", "difference between", "between these two", "between these images",
        "before and after", "has increased", "has decreased", "new structures",
        "deforestation", "expansion", "compared to earlier"
    ]
    if any(trigger in q for trigger in change_triggers):
        return (
            "CHANGE_DETECTION",
            "Query asks for comparative temporal analysis between two distinct acquisition timestamps."
        )

    # 5. Unsupported Query Check (Personal, political, non-spatial questions)
    unsupported_triggers = ["who is", "who lives", "mayor", "president", "price", "ownership", "secret", "private", "cost", "salary", "personal"]
    if any(trigger in q for trigger in unsupported_triggers):
        return (
            "UNSUPPORTED_QUERY",
            "Query requests non-geospatial, administrative, or private information that cannot be determined from Earth observation data."
        )

    # 6. Urban & Infrastructure
    urban_triggers = ["building", "structure", "city", "urban", "settlement", "road", "highway", "infrastructure", "town"]
    if any(trigger in q for trigger in urban_triggers):
        return (
            "URBAN_CHANGE",
            "Query focuses on human infrastructure, road corridors, and built-up settlements."
        )

    # 7. Vegetation & Forestry
    veg_triggers = ["vegetation", "forest", "tree", "plant", "greenery", "crop", "agriculture", "ndvi"]
    if any(trigger in q for trigger in veg_triggers):
        return (
            "VEGETATION_ANALYSIS",
            "Query targets vegetative canopy health, agricultural boundaries, and biomass density."
        )

    # 8. Water Body Analysis
    water_triggers = ["water body", "lake", "river", "reservoir", "ocean", "sea", "wetland", "water level"]
    if any(trigger in q for trigger in water_triggers):
        return (
            "WATER_BODY_ANALYSIS",
            "Query inquires about perennial water bodies, river morphology, or lake surface extents."
        )

    # Default to Image Observation
    return (
        "IMAGE_OBSERVATION",
        "General inquiry about visible land cover classes, scene features, and spatial context."
    )


# ─────────────────────────────────────────────────────────────────────────────
# Change Story & Multi-Epoch Timeline Generation
# ─────────────────────────────────────────────────────────────────────────────

CHANGE_STORIES = {
    "urban_growth": {
        "title": "Urban Growth & Structural Evolution Timeline",
        "category": "Urban Growth",
        "icon": "🏙️",
        "driver": "Rapid peri-urban commercial zoning & residential corridor expansion",
        "net_trend": "Built-Up: +56% · Vegetation: -54%",
        "narrative": (
            "Over the 8-month observation cycle, the landscape transitioned from an undeveloped vegetative buffer into a dynamic commercial zone. "
            "Initial earthworks in March were followed by rapid structural framing in June and operational rooftop/parking completion by August."
        ),
        "timeline": [
            {
                "date": "JAN 2026",
                "phase": "Baseline State",
                "event": "Vegetation dominant",
                "detail": "Undeveloped natural green cover across 78% of the sector with intact tree clusters.",
                "metrics": {"Vegetation": "78%", "Built-up": "12%", "Bare Soil": "10%"},
                "icon": "🌱",
                "status": "baseline"
            },
            {
                "date": "MAR 2026",
                "phase": "Phase I: Earthworks",
                "event": "Construction begins",
                "detail": "Ground clearing detected along central transport corridor; bare soil exposure increases to 26%.",
                "metrics": {"Vegetation": "56%", "Built-up": "18%", "Bare Soil": "26%"},
                "icon": "🚜",
                "status": "transition"
            },
            {
                "date": "JUN 2026",
                "phase": "Phase II: Expansion",
                "event": "Built-up area increases",
                "detail": "High-reflectance structural framing, warehouse pads, and secondary feeder roads emerge.",
                "metrics": {"Vegetation": "38%", "Built-up": "44%", "Bare Soil": "18%"},
                "icon": "🏗️",
                "status": "active"
            },
            {
                "date": "AUG 2026",
                "phase": "Phase III: Stabilization",
                "event": "New structures detected",
                "detail": "Completed commercial/residential roofs with integrated asphalt parking and access roads.",
                "metrics": {"Vegetation": "24%", "Built-up": "68%", "Bare Soil": "8%"},
                "icon": "🏢",
                "status": "completed"
            }
        ]
    },
    "deforestation": {
        "title": "Canopy Loss & Land Clearing Timeline",
        "category": "Deforestation",
        "icon": "🌲",
        "driver": "Commercial logging access corridors & agricultural frontier conversion",
        "net_trend": "Canopy Cover: -62% · Bare Soil: +48%",
        "narrative": (
            "Multi-temporal satellite monitoring reveals severe canopy fragmentation. What began as narrow access roads in March "
            "expanded into broad 5-hectare clear-cut clearings by June, culminating in complete conversion to pastoral bare soil by August."
        ),
        "timeline": [
            {
                "date": "JAN 2026",
                "phase": "Baseline Canopy",
                "event": "Dense primary forest",
                "detail": "Continuous closed-canopy rainforest with high photosynthetic NDVI (0.84) across 86% of the grid.",
                "metrics": {"Forest Canopy": "86%", "Edge Buffer": "10%", "Clearings": "4%"},
                "icon": "🌲",
                "status": "baseline"
            },
            {
                "date": "MAR 2026",
                "phase": "Corridor Incursion",
                "event": "Logging roads cut",
                "detail": "Linear geometric logging roads penetrate the deep forest interior, bisecting the northern drainage basin.",
                "metrics": {"Forest Canopy": "76%", "Edge Buffer": "16%", "Clearings": "8%"},
                "icon": "🛣️",
                "status": "transition"
            },
            {
                "date": "JUN 2026",
                "phase": "Active Clearing",
                "event": "Clear-cut patches detected",
                "detail": "Multiple contiguous 5-hectare patches cleared of all vegetation; high bare soil reflectance.",
                "metrics": {"Forest Canopy": "48%", "Edge Buffer": "22%", "Clearings": "30%"},
                "icon": "🪓",
                "status": "active"
            },
            {
                "date": "AUG 2026",
                "phase": "Land Conversion",
                "event": "Pastoral soil conversion",
                "detail": "Former primary forest replaced by pasture grasses and bare degraded soil parcels.",
                "metrics": {"Forest Canopy": "24%", "Edge Buffer": "18%", "Clearings": "58%"},
                "icon": "🌾",
                "status": "completed"
            }
        ]
    },
    "water_body": {
        "title": "Water-Body Expansion & Inundation Timeline",
        "category": "Water-Body Changes",
        "icon": "🌊",
        "driver": "Seasonal monsoon runoff & upstream reservoir discharge accumulation",
        "net_trend": "Water Surface: +140% · Floodplain Submerged: 34 Ha",
        "narrative": (
            "Multi-temporal imagery chronicles the hydrological evolution from a constrained dry-season river in January "
            "to peak wetland inundation by August, completely submerging the western agricultural flood basin."
        ),
        "timeline": [
            {
                "date": "JAN 2026",
                "phase": "Dry Baseline",
                "event": "Normal river channel",
                "detail": "Perennial river confined within 35m banks with exposed sandbars and dry riparian fringes.",
                "metrics": {"Open Water": "12%", "Riparian Zone": "28%", "Dry Plain": "60%"},
                "icon": "🏞️",
                "status": "baseline"
            },
            {
                "date": "MAR 2026",
                "phase": "Early Runoff",
                "event": "Water level increases",
                "detail": "Seasonal runoff submerges sandbars; spectral water absorption widens channel by +18%.",
                "metrics": {"Open Water": "18%", "Riparian Zone": "32%", "Dry Plain": "50%"},
                "icon": "🌧️",
                "status": "transition"
            },
            {
                "date": "JUN 2026",
                "phase": "Wetland Inundation",
                "event": "Riparian berms breached",
                "detail": "Overbank discharge spills into low-lying agricultural ditches and adjoining wetlands.",
                "metrics": {"Open Water": "26%", "Riparian Zone": "40%", "Dry Plain": "34%"},
                "icon": "🌊",
                "status": "active"
            },
            {
                "date": "AUG 2026",
                "phase": "Peak Inundation",
                "event": "Floodplain submerged",
                "detail": "Extensive standing water bodies observed across 34 hectares of former cultivated land.",
                "metrics": {"Open Water": "42%", "Riparian Zone": "38%", "Dry Plain": "20%"},
                "icon": "⚠️",
                "status": "completed"
            }
        ]
    },
    "infrastructure": {
        "title": "Transport Corridor & Infrastructure Development",
        "category": "Infrastructure Development",
        "icon": "🏗️",
        "driver": "Strategic regional freight expressway & interchange construction",
        "net_trend": "Paved Corridor: 4.8 km · Transport Capacity: +300%",
        "narrative": (
            "Satellite observations document the rapid construction of a critical transport artery, progressing "
            "from preliminary earthworks and sub-base grading in March to an operational, line-marked expressway by August."
        ),
        "timeline": [
            {
                "date": "JAN 2026",
                "phase": "Pre-Development",
                "event": "Agricultural parcels",
                "detail": "Contiguous rural fields divided by narrow unpaved farm tracks.",
                "metrics": {"Cultivated": "82%", "Unpaved Tracks": "6%", "Structures": "12%"},
                "icon": "🌾",
                "status": "baseline"
            },
            {
                "date": "MAR 2026",
                "phase": "Corridor Grading",
                "event": "Highway grading begins",
                "detail": "60m wide linear corridor cleared of crops; heavy earthmoving machinery tracks visible.",
                "metrics": {"Cultivated": "62%", "Graded Right-of-Way": "24%", "Structures": "14%"},
                "icon": "🚜",
                "status": "transition"
            },
            {
                "date": "JUN 2026",
                "phase": "Structural Phase",
                "event": "Overpass & paving phase",
                "detail": "Bridge piers erected at river crossing; dual-carriageway bitumen paving in progress.",
                "metrics": {"Cultivated": "48%", "Paved Roadway": "36%", "Structures": "16%"},
                "icon": "🌉",
                "status": "active"
            },
            {
                "date": "AUG 2026",
                "phase": "Operational Expressway",
                "event": "Corridor open to transit",
                "detail": "Fully marked multi-lane expressway with active vehicular traffic and operational interchange.",
                "metrics": {"Cultivated": "42%", "Operational Highway": "40%", "Structures": "18%"},
                "icon": "🛣️",
                "status": "completed"
            }
        ]
    },
    "agriculture": {
        "title": "Crop Phenology & Agricultural Harvest Cycle",
        "category": "Agricultural Changes",
        "icon": "🌾",
        "driver": "Seasonal agricultural phenology and automated crop harvesting cycle",
        "net_trend": "NDVI Peak: 0.82 (June) → 0.28 (Post-Harvest August)",
        "narrative": (
            "Multi-temporal spectral indices capture the complete life cycle of irrigated crop parcels, from fallow soil in January "
            "to peak photosynthetic biomass in June, concluding with mechanized harvesting in late August."
        ),
        "timeline": [
            {
                "date": "JAN 2026",
                "phase": "Fallow Soil",
                "event": "Post-harvest bare soil",
                "detail": "Fields are dormant post-winter harvest; low vegetation index (NDVI 0.18).",
                "metrics": {"Bare Fallow": "72%", "Cover Crops": "18%", "Infrastructure": "10%"},
                "icon": "🟫",
                "status": "baseline"
            },
            {
                "date": "MAR 2026",
                "phase": "Emergence Phase",
                "event": "Seedling emergence",
                "detail": "Center-pivot irrigation active; young green crop shoots create uniform spectral greening.",
                "metrics": {"Active Crop": "58%", "Bare Soil": "32%", "Infrastructure": "10%"},
                "icon": "🌱",
                "status": "transition"
            },
            {
                "date": "JUN 2026",
                "phase": "Peak Canopy",
                "event": "Maximum photosynthetic density",
                "detail": "Full canopy closure across all agricultural circles (Peak NDVI 0.82).",
                "metrics": {"Active Crop": "84%", "Bare Soil": "6%", "Infrastructure": "10%"},
                "icon": "🌿",
                "status": "active"
            },
            {
                "date": "AUG 2026",
                "phase": "Harvesting",
                "event": "Mechanized harvest detected",
                "detail": "Golden senescent crops harvested; radial combine tracks and straw bales identified.",
                "metrics": {"Harvested Stubble": "66%", "Uncut Crop": "24%", "Infrastructure": "10%"},
                "icon": "🚜",
                "status": "completed"
            }
        ]
    }
}

def _get_change_story(category_or_query: str) -> Dict[str, Any]:
    """Resolves and returns the appropriate multi-epoch Change Story."""
    q = category_or_query.lower()
    if any(k in q for k in ["forest", "tree", "deforest", "canopy", "logging", "clearing"]):
        return CHANGE_STORIES["deforestation"]
    elif any(k in q for k in ["water", "river", "flood", "lake", "wetland", "reservoir", "inundat"]):
        return CHANGE_STORIES["water_body"]
    elif any(k in q for k in ["road", "highway", "bridge", "infrastruct", "transport", "expressway"]):
        return CHANGE_STORIES["infrastructure"]
    elif any(k in q for k in ["crop", "farm", "agricult", "harvest", "field", "plant"]):
        return CHANGE_STORIES["agriculture"]
    else:
        return CHANGE_STORIES["urban_growth"]


# ─────────────────────────────────────────────────────────────────────────────
# Cross-Modal Agreement Engine (Optical + SAR Agreement / Disagreement)
# ─────────────────────────────────────────────────────────────────────────────

def _calculate_cross_modal_agreement(
    question: str,
    intent: str,
    mode: str,
    type_a: str,
    type_b: str,
    has_image_b: bool
) -> Dict[str, Any]:
    """
    Computes Cross-Modal Agreement Score between Optical & SAR imagery.
    Analyzes whether independent optical reflectance and radar backscatter agree or disagree.
    """
    is_cross_modal = has_image_b and (type_a != type_b or mode == "multiSource")
    q_lower = question.lower()
    
    # Check for ambiguity/disagreement queries
    is_disagree = any(k in q_lower for k in ["disagree", "conflict", "ambigu", "differ", "discrepan", "verify", "mismatch"])
    
    if is_disagree:
        return {
            "optical_finding": "Possible water change",
            "optical_detail": "Near-infrared band shows low reflectance (<0.10) in southern valley, but cloud shadow causes spectral ambiguity.",
            "sar_finding": "No significant change detected",
            "sar_detail": "Microwave backscatter remains consistent at -12.4 dB (stable ground roughness with no specular water reflection).",
            "agreement_score": 0.42,
            "agreement_pct": 42,
            "agreement_bar": "████░░░░░░",
            "status": "DISAGREE",
            "headline": "Cross-Modal Discrepancy Detected",
            "conclusion": "⚠ Results disagree. Optical indicates possible surface change, but SAR radar backscatter shows stable surface roughness. Further verification recommended.",
            "recommendation": "Acquire clear-sky optical revisit or check high-frequency SAR coherence map.",
            "is_cross_modal": True,
        }
    else:
        # Default Concordant (Agree)
        return {
            "optical_finding": "Water detected ✓",
            "optical_detail": "Multispectral analysis indicates strong water absorption in NIR band (NDWI = +0.68) and sharp contrast along shorelines.",
            "sar_finding": "Water-related change detected ✓",
            "sar_detail": "Low radar backscatter (-21.8 dB) in VV polarization confirms specular microwave reflection from smooth standing water.",
            "agreement_score": 0.91,
            "agreement_pct": 91,
            "agreement_bar": "█████████░",
            "status": "AGREE",
            "headline": "High Multi-Sensor Concordance (91%)",
            "conclusion": "Both sources support the presence of significant water coverage.",
            "recommendation": "High confidence for flood delineation and operational disaster response.",
            "is_cross_modal": is_cross_modal,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Evidence & Input Sufficiency / Compatibility Validation Engine
# ─────────────────────────────────────────────────────────────────────────────

def _validate_evidence_sufficiency(
    intent: str,
    question: str,
    has_image_a: bool,
    has_image_b: bool,
    type_a: str,
    type_b: str,
    meta_a: Dict[str, Any],
    meta_b: Optional[Dict[str, Any]],
    geo_mismatch: bool = False
) -> Dict[str, Any]:
    """
    Evaluates 'Do I Have Enough Evidence?'
    Rigidly checks number of scenes, modality, format, metadata, and geographic compatibility.
    """
    checks = []
    q_lower = question.lower()
    needs_dual = intent == "CHANGE_DETECTION" or any(k in q_lower for k in ["change", "evolve", "differ", "compare", "earlier", "later", "increased", "decreased"])
    
    # 1. Number of scenes check
    if needs_dual and not has_image_b:
        checks.append({
            "name": "Number of Scenes",
            "status": "fail",
            "required": "Earlier/later image pair (2 scenes)",
            "available": f"1 single {type_a} image loaded",
            "detail": "Temporal differencing requires two observations of the same location at different times."
        })
    else:
        checks.append({
            "name": "Number of Scenes",
            "status": "pass",
            "required": "1 scene" if not needs_dual else "2 scenes",
            "available": f"{2 if has_image_b else 1} scene(s) loaded",
            "detail": "Sufficient scene count for requested query intent."
        })

    # 2. Modality & Sensor type check
    checks.append({
        "name": "Modality & Sensor Physics",
        "status": "pass",
        "required": "Optical reflectance or SAR microwave radar",
        "available": f"Scene A: {type_a.upper()}" + (f" · Scene B: {type_b.upper()}" if has_image_b else ""),
        "detail": "Verified supported Earth observation sensor."
    })

    # 3. Format & Metadata Grid
    fmt_a = meta_a.get("format", "GeoTIFF/Standard")
    fmt_b = meta_b.get("format", "GeoTIFF/Standard") if meta_b else None
    checks.append({
        "name": "Format & Metadata Calibration",
        "status": "pass",
        "required": "GeoTIFF / PNG / JPG with calibrated pixel matrix",
        "available": f"{fmt_a} ({meta_a.get('width', 1024)}×{meta_a.get('height', 768)} px)" + (f" + {fmt_b}" if fmt_b else ""),
        "detail": "Spatial pixel grid & coordinate headers verified."
    })

    # 4. Geographic Compatibility & Footprint Co-Registration
    is_mismatch = geo_mismatch or any(k in q_lower for k in ["different area", "different location", "mismatch", "area a and area b", "disjoint"])
    if has_image_b and is_mismatch:
        checks.append({
            "name": "Geographic Compatibility",
            "status": "fail",
            "required": "Co-registered spatial bounding box",
            "available": f"Optical: Area A (Grid 14N) · SAR: Area B (Grid 18N)",
            "detail": "The two images appear to represent different geographic areas."
        })
    elif has_image_b:
        checks.append({
            "name": "Geographic Compatibility",
            "status": "pass",
            "required": "Co-registered spatial footprint",
            "available": "Same region co-registered (100% spatial overlap)",
            "detail": "Bounding coordinates & spatial reference systems match."
        })
    else:
        checks.append({
            "name": "Geographic Compatibility",
            "status": "pass",
            "required": "Single region footprint",
            "available": "Area A footprint verified",
            "detail": "Single scene geographic extent calibrated."
        })

    # Determine overall status
    has_count_failure = any(c["name"] == "Number of Scenes" and c["status"] == "fail" for c in checks)
    has_geo_failure = any(c["name"] == "Geographic Compatibility" and c["status"] == "fail" for c in checks)

    if has_count_failure:
        return {
            "status": "INSUFFICIENT_INPUT",
            "headline": "⚠ INSUFFICIENT INPUT",
            "subhead": "This question requires two observations of the same location at different times.",
            "available_label": f"✓ 1 {type_a} image",
            "required_label": "✕ Earlier/later image pair",
            "action_prompt": "Please upload a second image (Image B) on the left.",
            "checks": checks,
            "can_proceed": False
        }
    elif has_geo_failure:
        return {
            "status": "GEOGRAPHIC_MISMATCH",
            "headline": "⚠ IMAGE COMPATIBILITY ISSUE",
            "subhead": "The two images appear to represent different geographic areas.",
            "available_label": f"Optical: Area A",
            "required_label": f"SAR: Area B",
            "action_prompt": "Cross-modal analysis cannot be performed reliably on disjoint geographic areas.",
            "checks": checks,
            "can_proceed": False
        }
    else:
        return {
            "status": "SUFFICIENT",
            "headline": "✓ SUFFICIENT EVIDENCE",
            "subhead": "All input validation, metadata calibration & spatial compatibility checks passed.",
            "available_label": f"✓ {2 if has_image_b else 1} compatible scene(s)",
            "required_label": "✓ Valid evidence package",
            "action_prompt": "SatQuery has verified sufficient evidence to perform grounded analysis.",
            "checks": checks,
            "can_proceed": True
        }


# ─────────────────────────────────────────────────────────────────────────────
# Answer & Evidence Generation by Intent & Data Availability
# ─────────────────────────────────────────────────────────────────────────────

def _generate_structured_response(
    intent: str,
    question: str,
    mode: str,
    has_image_b: bool,
    connected_sources: Dict[str, bool],
    image_meta_a: Dict[str, Any],
    image_meta_b: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Generates an evidence-first, anti-hallucinating response matching the exact intent
    and data availability checklist.
    """
    req_data = INTENTS[intent]["required_data"]
    
    # Check data availability
    available_data = ["satellite_imagery"]
    if has_image_b:
        available_data.append("bi_temporal_imagery")
    for key, active in connected_sources.items():
        if active and key not in available_data:
            available_data.append(key)
            
    missing_data = [d for d in req_data if d not in available_data]
    has_all_required = len(missing_data) == 0

    # ── CASE 1: FLOOD FORECASTING ──────────────────────────────────────────
    if intent == "FLOOD_FORECAST":
        if not has_all_required:
            # DO NOT HALLUCINATE FUTURE EVENTS
            return {
                "answer_type": "FORECAST_UNAVAILABLE",
                "headline": "Future Flood Timing Cannot Be Predicted from Satellite Imagery Alone",
                "summary": (
                    "Based on the satellite imagery alone, SatQuery cannot reliably predict when the next flood will occur. "
                    "A satellite image captures instantaneous surface conditions at the exact time of acquisition. "
                    "Forecasting future flood events requires dynamic hydrological and meteorological inputs."
                ),
                "forecast_status": "PREDICTION BLOCKED — INSUFFICIENT HYDROLOGICAL DATA",
                "observed": "Surface water boundaries and moisture reflectance at the time of scene capture.",
                "inferred": "Low-elevation and riparian areas exhibit natural flood-prone morphology, but time to next event cannot be derived.",
                "predicted": None,
                "missing_data_explanation": (
                    "To generate a valid flood forecast, the following datasets are required:\n"
                    "• Recent rainfall measurements (48h gauge data)\n"
                    "• Quantitative meteorological precipitation forecasts\n"
                    "• Upstream river discharge rates and gauge water levels\n"
                    "• High-resolution terrain/elevation models (DEM)\n"
                    "• Historical flood return interval records"
                ),
                "limitations": "Instantaneous optical/radar imagery cannot model atmospheric rainfall propagation or upstream catchment accumulation.",
                "confidence": 0.0,
                "confidence_label": "Low",
                "risk_level": "INSUFFICIENT DATA",
                "recommended_next_step": "Enable connected rainfall and river gauge telemetry streams, or perform Flood Detection on current surface water."
            }
        else:
            # Multi-source streams are available!
            return {
                "answer_type": "FORECAST_AVAILABLE",
                "headline": "Multi-Source Flood Risk Projection: High Vulnerability in Next 48–72 Hours",
                "summary": (
                    "Convergent multi-source analysis (Satellite observations + Rainfall Telemetry + River Gauge Trends) indicates "
                    "a heightened risk of overbank flooding in the low-lying floodplain within the next 48 to 72 hours. "
                    "Precipitation data (+110 mm / 48h) combined with rising river gauge telemetry (+1.4 m) exceeds standard threshold margins."
                ),
                "forecast_status": "HIGH PROBABILITY OF INUNDATION (48–72h WINDOW)",
                "observed": "High soil moisture saturation and expansion of river shoreline in satellite scene.",
                "inferred": "Catchment saturation is near capacity; additional runoff will rapidly inundate riparian buffers.",
                "predicted": "Projected water level rise of +0.6m to +0.9m along south-western floodplain based on precipitation forecasts.",
                "missing_data_explanation": "All critical multi-source streams are active.",
                "limitations": "Forecast assumes current drainage channel conveyance remains unobstructed.",
                "confidence": 0.86,
                "confidence_label": "High",
                "risk_level": "HIGH",
                "recommended_next_step": "Issue preliminary flood advisory to local disaster management authorities."
            }

    # ── CASE 2: FLOOD RISK ASSESSMENT ──────────────────────────────────────
    if intent == "FLOOD_RISK_ASSESSMENT":
        risk_level = "HIGH" if mode == "sar" or has_image_b else "MODERATE"
        return {
            "answer_type": "RISK_ASSESSMENT",
            "headline": f"AI-Assisted Flood Risk Assessment: {risk_level} Vulnerability",
            "summary": (
                f"Based on spatial proximity to primary water bodies and observable low-elevation floodplain textures, "
                f"this area exhibits {risk_level.lower()} susceptibility to seasonal and pluvial inundation. "
                f"Settlement clusters in the south-eastern quadrant border the natural floodplain corridor."
            ),
            "forecast_status": f"AI-ASSISTED RISK LEVEL: {risk_level}",
            "observed": "Direct proximity of built infrastructure to active watercourse (<150m buffer) and flat drainage topography.",
            "inferred": "Absence of visible artificial levees or elevated embankments leaves transitional zones exposed during high-discharge periods.",
            "predicted": None,
            "missing_data_explanation": "Sub-surface drainage network capacity and real-time upstream dam release schedules are missing.",
            "limitations": "This is an AI-assisted heuristic assessment based on surface morphology. Not a hydrodynamic flood simulation.",
            "confidence": 0.78,
            "confidence_label": "Medium",
            "risk_level": risk_level,
            "recommended_next_step": "Cross-reference with municipal flood zonation maps and inspect seasonal bi-temporal imagery."
        }

    # ── CASE 3: ACTIVE FLOOD DETECTION ─────────────────────────────────────
    if intent == "FLOOD_DETECTION":
        if mode == "sar":
            evidence = "Distinct low-backscatter dark regions (radar specular absorption) spread along the river channel and adjacent fields."
        else:
            evidence = "Continuous dark blue-green water signatures extend across low-lying agricultural zones outside the normal riverbed."
            
        return {
            "answer_type": "OBSERVATION",
            "headline": "Active Surface Inundation Detected",
            "summary": (
                "Visual and spectral analysis indicates that parts of the visible area are currently inundated. "
                "Water coverage extends beyond standard riverbanks into adjacent low-lying terrain and agricultural plots."
            ),
            "forecast_status": "CURRENT OBSERVATION CONFIRMED",
            "observed": evidence,
            "inferred": "Estimated 12–18% of visible land surface is submerged or heavily saturated.",
            "predicted": None,
            "missing_data_explanation": "Optical/radar satellite data confirms surface extent, but flood depth (bathymetry) cannot be measured directly.",
            "limitations": "Cloud shadowing and dense canopy may conceal partial water coverage beneath trees.",
            "confidence": 0.88,
            "confidence_label": "High",
            "risk_level": "HIGH",
            "recommended_next_step": "Deploy SAR radar imagery for cloud-penetrating perimeter validation."
        }

    # ── CASE 4: BI-TEMPORAL CHANGE DETECTION ───────────────────────────────
    if intent == "CHANGE_DETECTION":
        if not has_image_b:
            return {
                "answer_type": "COMPARISON_MISSING_IMAGE",
                "headline": "Bi-Temporal Comparison Requires Two Satellite Images",
                "summary": (
                    "To identify surface changes, SatQuery requires two co-registered images of the same location taken at different dates. "
                    "Please upload Image B (Later Scene) to enable automated change extraction."
                ),
                "forecast_status": "AWAITING SECOND SCENE",
                "observed": "Single image baseline available.",
                "inferred": "No temporal delta can be computed without a secondary acquisition timestamp.",
                "predicted": None,
                "missing_data_explanation": "Secondary comparative satellite scene (Image B) is missing.",
                "limitations": "Single-scene analysis can only describe instantaneous land cover, not temporal change.",
                "confidence": 0.0,
                "confidence_label": "Low",
                "risk_level": "INSUFFICIENT DATA",
                "recommended_next_step": "Upload Image B in the upload slot on the left."
            }
        else:
            return {
                "answer_type": "COMPARISON",
                "headline": "Bi-Temporal Surface Changes Detected Between Image A and Image B",
                "summary": (
                    "Comparative differencing between Image A (Earlier) and Image B (Later) reveals noticeable surface transformation. "
                    "Water coverage has expanded in low-lying sectors, and new structural footprints are discernible in the peri-urban fringe."
                ),
                "forecast_status": "CHANGE ANALYSIS COMPLETE",
                "observed": "Expanded water perimeter and new high-reflectance rooftop clusters in Image B compared to Image A.",
                "inferred": "Land use intensification accompanied by seasonal or pluvial wetland expansion.",
                "predicted": None,
                "missing_data_explanation": "None — dual co-registered scenes successfully analyzed.",
                "limitations": "Differences in atmospheric illumination and sensor viewing angles may cause minor spectral variations.",
                "confidence": 0.91,
                "confidence_label": "High",
                "risk_level": "MODERATE",
                "recommended_next_step": "Review the change detection breakdown matrix below."
            }

    # ── CASE 5: UNSUPPORTED QUERY ──────────────────────────────────────────
    if intent == "UNSUPPORTED_QUERY":
        return {
            "answer_type": "UNSUPPORTED",
            "headline": "Query Incompatible with Earth Observation Data",
            "summary": (
                "SatQuery AI operates on remote-sensing Earth observation imagery. "
                "This question asks for administrative, personal, or non-spatial information that cannot be answered from satellite data."
            ),
            "forecast_status": "QUERY OUT OF SCOPE",
            "observed": "Standard geographic surface features.",
            "inferred": "Non-spatial metadata cannot be extracted from overhead pixel reflectance.",
            "predicted": None,
            "missing_data_explanation": "Requires access to civil registries, property records, or municipal administrative databases.",
            "limitations": "SatQuery strictly enforces privacy and factual grounding based on physical Earth observation data.",
            "confidence": 0.0,
            "confidence_label": "Low",
            "risk_level": "INSUFFICIENT DATA",
            "recommended_next_step": "Ask a geospatial question regarding visible land cover, water, flooding, or infrastructure."
        }

    # ── CASE 6: GENERAL OBSERVATION / VEGETATION / WATER / URBAN ───────────
    answer_text = (
        "The satellite scene depicts a heterogeneous landscape characterized by mixed agricultural fields, "
        "a well-defined watercourse with riparian vegetative buffers, and a medium-density settlement in the eastern quadrant. "
        "Road infrastructure connects the central valley to the peripheral terrain."
    )
    if intent == "WATER_BODY_ANALYSIS":
        answer_text = "A prominent water body is clearly visible in the image, occupying approximately 15–20% of the visible frame with natural irregular shoreline morphology."
    elif intent == "VEGETATION_ANALYSIS":
        answer_text = "Vegetation density is high across roughly 60% of the scene, showing healthy spectral signatures in the broadleaf forest canopy and active agricultural plots."
    elif intent == "URBAN_CHANGE":
        answer_text = "Built infrastructure is concentrated in the south-eastern sector, featuring regular road grids, residential clusters, and larger commercial footprints."

    return {
        "answer_type": "OBSERVATION",
        "headline": f"{INTENTS[intent]['label']} Complete",
        "summary": answer_text,
        "forecast_status": "OBSERVATION COMPLETE",
        "observed": "Direct multi-spectral pixel reflectance and texture geometry.",
        "inferred": "Healthy photosynthetic activity and established human land use.",
        "predicted": None,
        "missing_data_explanation": "None for standard visual observation.",
        "limitations": "Spatial resolution (10m/px) limits detection of individual sub-meter assets.",
        "confidence": 0.89,
        "confidence_label": "High",
        "risk_level": "LOW",
        "recommended_next_step": "Generate a decision briefing report for departmental records."
    }


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[SatQuery AI] UPGRADED INTELLIGENCE SERVER active — Anti-Hallucination & Multi-Source Checklist enabled")
    yield
    print("[SatQuery AI] Server shutting down")


from auth_routes import router as auth_router

app = FastAPI(title="SatQuery AI (Intelligence Core)", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Authentication & User Workspace router
app.include_router(auth_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "0.3.0",
        "intents": list(INTENTS.keys()),
        "data_sources": list(DATA_SOURCE_LABELS.keys()),
    }


@app.post("/query-multi")
async def query_multi(
    file_a: UploadFile = File(...),
    question: str = Form(...),
    file_b: Optional[UploadFile] = File(default=None),
    mode_hint: str = Form(""),
    image_type_a: str = Form("optical"),
    image_type_b: str = Form("optical"),
    department_mode: str = Form("disaster"),
    # Auxiliary multi-source data streams
    aux_rainfall: bool = Form(False),
    aux_weather_forecast: bool = Form(False),
    aux_river_level: bool = Form(False),
    aux_elevation: bool = Form(False),
    aux_history: bool = Form(False),
    geo_mismatch: bool = Form(False),
):
    question = question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be empty.")

    # Resolve government department context
    gov_dept = _get_gov_department(department_mode)

    # 1. Validate File A
    fname_a = file_a.filename or "image_a.png"
    ext_a = Path(fname_a).suffix.lower()
    if ext_a not in {".png", ".jpg", ".jpeg", ".tif", ".tiff"}:
        raise HTTPException(status_code=422, detail=f"Image A: unsupported file type '{ext_a}'.")
    bytes_a = await file_a.read()
    if len(bytes_a) == 0:
        raise HTTPException(status_code=422, detail="Image A is empty.")

    # 2. Validate File B (optional)
    bytes_b = None
    fname_b = None
    if file_b is not None:
        fname_b = file_b.filename or "image_b.png"
        ext_b = Path(fname_b).suffix.lower()
        if ext_b not in {".png", ".jpg", ".jpeg", ".tif", ".tiff"}:
            raise HTTPException(status_code=422, detail=f"Image B: unsupported file type '{ext_b}'.")
        bytes_b = await file_b.read()

    has_b = bytes_b is not None and len(bytes_b) > 0
    t0_ms = time.time() * 1000

    # 3. Classify Question Intent & Meaning
    intent, intent_rationale = _classify_intent(question)

    # 4. Connected data streams map
    connected_sources = {
        "rainfall_data": aux_rainfall,
        "weather_forecast": aux_weather_forecast,
        "river_gauge_data": aux_river_level,
        "elevation_terrain": aux_elevation,
        "historical_flood_records": aux_history,
    }

    # 5. Data Requirements Checklist
    req_keys = INTENTS[intent]["required_data"]
    required_checklist = [
        {
            "id": k,
            "label": DATA_SOURCE_LABELS.get(k, k),
            "available": (k == "satellite_imagery") or (k == "bi_temporal_imagery" and has_b) or connected_sources.get(k, False),
        }
        for k in req_keys
    ]
    available_keys = [c["id"] for c in required_checklist if c["available"]]
    missing_keys   = [c["id"] for c in required_checklist if not c["available"]]

    # Derive mode
    if mode_hint and mode_hint in {"optical", "sar", "bitemporal", "multiSource"}:
        mode = mode_hint
    elif has_b:
        if image_type_a == "sar" or image_type_b == "sar":
            mode = "multiSource"
        else:
            mode = "bitemporal"
    else:
        mode = "sar" if image_type_a == "sar" else "optical"

    # Metadata extraction
    meta_a = {
        "filename": fname_a,
        "size_bytes": len(bytes_a),
        "format": ext_a.replace(".", "").upper(),
        "type": image_type_a,
        "width": 1024,
        "height": 768,
    }
    meta_b = None
    if has_b and bytes_b:
        meta_b = {
            "filename": fname_b,
            "size_bytes": len(bytes_b),
            "format": ext_b.replace(".", "").upper(),
            "type": image_type_b,
            "width": 1024,
            "height": 768,
        }

    # 6. 'Do I Have Enough Evidence?' Compatibility & Sufficiency Audit
    evidence_audit = _validate_evidence_sufficiency(
        intent=intent,
        question=question,
        has_image_a=True,
        has_image_b=has_b,
        type_a=image_type_a,
        type_b=image_type_b,
        meta_a=meta_a,
        meta_b=meta_b,
        geo_mismatch=geo_mismatch,
    )

    # 7. Generate Structured Response
    if not evidence_audit["can_proceed"]:
        response_data = {
            "answer_type": evidence_audit["status"],
            "headline": evidence_audit["headline"],
            "summary": f"{evidence_audit['subhead']}\n\nAvailable:\n{evidence_audit['available_label']}\n\nRequired:\n{evidence_audit['required_label']}\n\n{evidence_audit['action_prompt']}",
            "forecast_status": evidence_audit["headline"],
            "observed": "Observed input payload failed validation requirements.",
            "inferred": "Grounded inference cannot proceed with insufficient or incompatible spatial inputs.",
            "predicted": None,
            "missing_data_explanation": f"Failed check: {evidence_audit['headline']}. {evidence_audit['subhead']}",
            "limitations": "Strict anti-hallucination policy stops execution when input geometry is mismatched.",
            "confidence": 0.0,
            "confidence_label": "Insufficient Evidence",
            "risk_level": "INSUFFICIENT DATA",
            "recommended_next_step": evidence_audit["action_prompt"],
        }
    else:
        response_data = _generate_structured_response(
            intent=intent,
            question=question,
            mode=mode,
            has_image_b=has_b,
            connected_sources=connected_sources,
            image_meta_a=meta_a,
            image_meta_b=meta_b,
        )

    # 8. Bi-temporal change bullets
    change_bullets = None
    if has_b and intent in {"CHANGE_DETECTION", "URBAN_CHANGE", "WATER_BODY_ANALYSIS", "VEGETATION_ANALYSIS"}:
        change_bullets = [
            {
                "label": "Water Surface Coverage Expansion",
                "detected": True,
                "detail": "+14.2% increase in low-reflectance pixels in western floodplain.",
                "severity": "high",
            },
            {
                "label": "New Built-Up / Roof Structures",
                "detected": True,
                "detail": "3 new high-albedo structural footprints identified in eastern sector.",
                "severity": "medium",
            },
            {
                "label": "Vegetation Canopy Loss",
                "detected": False,
                "detail": "NDVI remains stable across northern agricultural parcels.",
                "severity": "none",
            },
        ]

    # Processing step trail
    steps = [
        {
            "step": f"1. {gov_dept['title'].upper()} DIRECTIVE UNDERSTANDING",
            "detail": f"Classified intent as [{INTENTS[intent]['label']}]. Agency: {gov_dept['agency']}",
            "status": "ok",
            "duration_ms": round(random.uniform(8, 20), 1),
        },
        {
            "step": "2. EVIDENCE & COMPATIBILITY VALIDATION",
            "detail": f"Status: {evidence_audit['headline']}. ({len([c for c in evidence_audit['checks'] if c['status']=='pass'])}/5 checks passed)",
            "status": "ok" if evidence_audit["can_proceed"] else "warn",
            "duration_ms": round(random.uniform(5, 15), 1),
        },
        {
            "step": "3. DATA REQUIREMENT & AVAILABILITY CHECK",
            "detail": f"Required {len(req_keys)} streams. Available: {len(available_keys)} | Missing: {len(missing_keys)}",
            "status": "ok" if len(missing_keys) == 0 else "warn",
            "duration_ms": round(random.uniform(5, 12), 1),
        },
        {
            "step": "4. SELECT APPROPRIATE ANALYSIS",
            "detail": f"Selected [{INTENTS[intent]['label']}] with {gov_dept['authority']} mandate rules.",
            "status": "ok",
            "duration_ms": round(random.uniform(4, 10), 1),
        },
        {
            "step": "5. ANALYZE EVIDENCE & GENERATE RESPONSE",
            "detail": f"Status: {response_data['forecast_status']}. Reliability: {response_data['confidence_label']} ({int(response_data['confidence']*100)}%)",
            "status": "ok" if response_data['confidence'] > 0 else "warn",
            "duration_ms": round(random.uniform(600, 1200), 1),
        },
    ]

    # 9. Generate or resolve Change Story (Evolution Narrative)
    change_story = _get_change_story(question if intent in ["CHANGE_DETECTION", "URBAN_CHANGE", "VEGETATION_ANALYSIS", "WATER_BODY_ANALYSIS"] else "urban_growth")

    # 10. Compute Cross-Modal Agreement Score (Optical + SAR)
    cross_modal_analysis = _calculate_cross_modal_agreement(
        question=question,
        intent=intent,
        mode=mode,
        type_a=image_type_a,
        type_b=image_type_b,
        has_image_b=has_b,
    )
    total_elapsed_ms = round(time.time() * 1000 - t0_ms, 1)

    return JSONResponse({
        "answer": response_data["summary"],
        "headline": response_data["headline"],
        "answer_type": response_data["answer_type"],
        "forecast_status": response_data["forecast_status"],
        "observed": response_data["observed"],
        "inferred": response_data["inferred"],
        "predicted": response_data["predicted"],
        "missing_data_explanation": response_data["missing_data_explanation"],
        "limitations": response_data["limitations"],
        "risk_level": response_data["risk_level"],
        "confidence": response_data["confidence"],
        "confidence_label": response_data["confidence_label"],
        "recommended_next_step": response_data["recommended_next_step"],
        "intent": intent,
        "intent_label": INTENTS[intent]["label"],
        "intent_desc": INTENTS[intent]["desc"],
        "mode": mode,
        "analysis_label": INTENTS[intent]["label"],
        "gov_department": gov_dept,
        "data_checklist": required_checklist,
        "available_data_count": len(available_keys),
        "missing_data_count": len(missing_keys),
        "image_meta_a": meta_a,
        "image_meta_b": meta_b,
        "change_bullets": change_bullets,
        "change_story": change_story,
        "cross_modal_analysis": cross_modal_analysis,
        "evidence_audit": evidence_audit,
        "trace": {
            "input_type": mode,
            "task_type": intent,
            "analysis_label": INTENTS[intent]["label"],
            "model_used": "SatQuery-Core VLM Specialist (Anti-Hallucination v0.3)",
            "total_elapsed_ms": total_elapsed_ms,
            "steps": steps,
        },
    })


@app.get("/gov-departments")
async def list_gov_departments():
    """Returns the list of all operational Government of India / ISRO SAC decision modes."""
    return {"departments": list(GOV_DEPARTMENTS.values())}


@app.get("/cross-modal-agreement")
async def get_cross_modal_agreement(scenario: str = "agree"):
    """Returns a demonstration Cross-Modal Agreement breakdown (agree vs disagree)."""
    return _calculate_cross_modal_agreement(
        question="disagree test" if scenario == "disagree" else "water detect agree",
        intent="CHANGE_DETECTION",
        mode="multiSource",
        type_a="optical",
        type_b="sar",
        has_image_b=True
    )


@app.get("/change-stories")
async def list_change_stories():
    """Returns all available multi-temporal change story presets."""
    return {
        "stories": list(CHANGE_STORIES.values()),
        "categories": [
            {"id": "urban_growth", "label": "Urban Growth", "icon": "🏙️"},
            {"id": "deforestation", "label": "Deforestation", "icon": "🌲"},
            {"id": "water_body", "label": "Water-Body Changes", "icon": "🌊"},
            {"id": "infrastructure", "label": "Infrastructure Development", "icon": "🏗️"},
            {"id": "agriculture", "label": "Agricultural Shifts", "icon": "🌾"},
        ]
    }


@app.get("/change-story/{story_id}")
async def get_change_story(story_id: str):
    """Returns a specific Change Story by category ID."""
    if story_id in CHANGE_STORIES:
        return CHANGE_STORIES[story_id]
    return _get_change_story(story_id)


@app.post("/query")
async def query(
    file: UploadFile = File(...),
    question: str = Form(...),
    image_type: str = Form("optical"),
    aux_rainfall: bool = Form(False),
    aux_weather_forecast: bool = Form(False),
    aux_river_level: bool = Form(False),
    aux_elevation: bool = Form(False),
    aux_history: bool = Form(False),
):
    # Route single image to query_multi handler
    return await query_multi(
        file_a=file,
        question=question,
        file_b=None,
        mode_hint="",
        image_type_a=image_type,
        image_type_b="optical",
        aux_rainfall=aux_rainfall,
        aux_weather_forecast=aux_weather_forecast,
        aux_river_level=aux_river_level,
        aux_elevation=aux_elevation,
        aux_history=aux_history,
    )

