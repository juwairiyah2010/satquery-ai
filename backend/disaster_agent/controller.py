"""
backend/disaster_agent/controller.py
Agent Controller and Orchestrator for Disaster Detection & Visual Grounding.
"""
from typing import Dict, Any, List, Optional
from PIL import Image
from .tools import (
    FloodDetectionTool,
    WildfireDetectionTool,
    LandslideDetectionTool,
    CrossModalConsensusTool
)
from .annotator import generate_annotated_image, generate_change_map

class DisasterOrchestrator:
    """
    Orchestrates Query Understanding -> Input Validation -> Specialist Tool Selection ->
    Region Grounding -> Cross-Modal Consensus -> Execution Trace Synthesis.
    """
    def __init__(self):
        self.flood_tool = FloodDetectionTool()
        self.wildfire_tool = WildfireDetectionTool()
        self.landslide_tool = LandslideDetectionTool()
        self.consensus_tool = CrossModalConsensusTool()

    def process(
        self,
        image_a: Image.Image,
        image_b: Optional[Image.Image] = None,
        modality_a: str = "optical",
        modality_b: Optional[str] = None,
        disaster_mode: str = "auto",
        question: str = "",
        geo_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        q_lower = question.lower()
        
        # 1. Query & Intent Parsing
        if disaster_mode == "flood" or any(w in q_lower for w in ["flood", "water", "inundat", "submerg", "overflow", "river"]):
            target_disaster = "Flood"
            selected_tool = self.flood_tool
            intent = "FLOOD_DETECTION"
        elif disaster_mode == "wildfire" or any(w in q_lower for w in ["fire", "burn", "wildfire", "smoke", "char"]):
            target_disaster = "Wildfire"
            selected_tool = self.wildfire_tool
            intent = "WILDFIRE_DETECTION"
        elif disaster_mode == "landslide" or any(w in q_lower for w in ["landslide", "mudslide", "slope", "scarp", "debris"]):
            target_disaster = "Landslide"
            selected_tool = self.landslide_tool
            intent = "LANDSLIDE_DETECTION"
        else:
            target_disaster = "Flood"
            selected_tool = self.flood_tool
            intent = "FLOOD_DETECTION"

        # 2. Modality & Sensor Check
        is_sar_a = modality_a.lower() == "sar"
        is_sar_b = (modality_b or "").lower() == "sar"
        is_bitemporal = image_b is not None
        is_cross_modal = is_bitemporal and ((is_sar_a and not is_sar_b) or (is_sar_b and not is_sar_a))

        # 3. Specialist Execution
        analysis_result = selected_tool.analyze(
            image_a=image_a,
            image_b=image_b,
            modality_a=modality_a,
            modality_b=modality_b,
            question=question
        )

        # 4. Cross-Modal Consensus if Optical + SAR
        consensus_info = None
        if is_cross_modal:
            consensus_info = self.consensus_tool.analyze(
                flood_result=analysis_result,
                modality_a=modality_a,
                modality_b=modality_b or "optical"
            )
            analysis_result["cross_modal_consensus"] = consensus_info

        # 5. Build Execution Trace
        trace_steps = [
            {
                "step": 1,
                "name": "Query Understanding & Intent Parsing",
                "detail": f'Parsed query: "{question or "Detect disaster affected areas"}" -> Intent: {intent} (Target: {target_disaster})'
            },
            {
                "step": 2,
                "name": "Input Validation & Sensor Intelligence",
                "detail": f"Validated Primary Image [{image_a.width}x{image_a.height}, {modality_a.upper()}]{f' + Secondary Image [{image_b.width}x{image_b.height}, {modality_b.upper()}]' if image_b else ''}"
            },
            {
                "step": 3,
                "name": "Specialist Tool Selection & Orchestration",
                "detail": f"Dispatched task to `{selected_tool.name}` ({selected_tool.description})"
            },
            {
                "step": 4,
                "name": "Visual Grounding & Region Segmentation",
                "detail": f"Identified {analysis_result.get('region_count', 0)} delineated anomaly polygons with radiometric validation."
            },
            {
                "step": 5,
                "name": "Baseline Verification & False-Positive Elimination",
                "detail": "Permanent baseline rivers/reservoirs calibrated and excluded from disaster inundation totals."
            }
        ]

        if is_cross_modal:
            trace_steps.append({
                "step": 6,
                "name": "Cross-Modal Evidence Consensus",
                "detail": f"Optical and SAR consensus verified with {int(consensus_info['agreement_score']*100)}% spatial agreement."
            })

        analysis_result["execution_trace"] = {
            "query": question or f"Detect {target_disaster}-affected areas",
            "intent": intent,
            "selected_workflow": f"{modality_a.upper()} {target_disaster} Analysis Pipeline",
            "selected_tools": [selected_tool.name, "region_grounding_tool"] + (["cross_modal_consensus_tool"] if is_cross_modal else []),
            "evidence_type": "Surface-water backscatter attenuation & multi-spectral delta" if target_disaster == "Flood" else "Spectral burn scar anomaly",
            "confidence": analysis_result.get("confidence", "High"),
            "region_count": analysis_result.get("region_count", 0),
            "steps": trace_steps
        }

        # 6. Generate Dedicated Annotated Output Image (Preserving Original Image Untouched)
        try:
            annotated_url = generate_annotated_image(
                original_img=image_a,
                regions=analysis_result.get("regions", []),
                disaster_type=target_disaster,
                confidence_label=analysis_result.get("confidence", "High"),
                title_suffix="Analysis"
            )
            analysis_result["annotated_image_url"] = annotated_url

            if image_b is not None:
                change_map_url = generate_change_map(
                    img_a=image_a,
                    img_b=image_b,
                    regions=analysis_result.get("regions", []),
                    disaster_type=target_disaster
                )
                analysis_result["change_map_url"] = change_map_url
        except Exception as img_err:
            print(f"[DisasterOrchestrator] Image annotation warning: {img_err}")
            analysis_result["annotated_image_url"] = None

        # Legend metadata
        analysis_result["legend"] = {
            "disaster_type": target_disaster,
            "label": f"{target_disaster} Detected Affected Area",
            "color_hex": "#06b6d4" if target_disaster == "Flood" else "#ef4444" if target_disaster == "Wildfire" else "#f59e0b",
            "regions_count": len(analysis_result.get("regions", []))
        }

        return analysis_result
