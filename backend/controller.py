"""
controller.py
Rule-based task classifier that routes incoming queries to the appropriate
processing pipeline (VQA vs. Change Detection vs. future tasks).

No ML involved — this is purely keyword-matching heuristics so classification
is instant and explainable for the demo trace panel.
"""
import re
from typing import Tuple, List

# ---------------------------------------------------------------------------
# Keyword banks per task type
# ---------------------------------------------------------------------------

_CHANGE_DETECTION_KEYWORDS: List[str] = [
    "change", "changed", "changes",
    "before", "after",
    "compare", "comparison", "compared",
    "difference", "differ", "differs", "differences",
    "deforestation", "urbanization", "flood", "flooded",
    "detect", "detection",
    "temporal", "over time", "years ago",
    "new building", "new construction",
    "land use change",
]

_SEGMENTATION_KEYWORDS: List[str] = [
    "segment", "segmentation",
    "outline", "boundary", "boundaries",
    "mask", "annotate", "annotation",
    "delineate", "delineation",
    "polygon", "classify pixels",
]

_COUNTING_KEYWORDS: List[str] = [
    "how many", "count", "number of", "total number",
    "how much", "quantity",
]

# VQA is the fallback / default task


def classify_task(question: str) -> Tuple[str, str]:
    """
    Classify a natural-language question into a task type.

    Returns:
        task_type (str): one of "vqa", "change_detection", "segmentation", "counting"
        reason (str):    human-readable explanation used for the trace panel
    """
    q_lower = question.lower()

    # Check change detection first (most specific)
    for kw in _CHANGE_DETECTION_KEYWORDS:
        if re.search(r"\b" + re.escape(kw) + r"\b", q_lower):
            return (
                "change_detection",
                f"Keyword '{kw}' matched the change-detection rule."
            )

    # Check segmentation
    for kw in _SEGMENTATION_KEYWORDS:
        if re.search(r"\b" + re.escape(kw) + r"\b", q_lower):
            return (
                "segmentation",
                f"Keyword '{kw}' matched the segmentation rule."
            )

    # Check counting
    for kw in _COUNTING_KEYWORDS:
        if kw in q_lower:
            return (
                "counting",
                f"Phrase '{kw}' matched the object-counting rule."
            )

    # Default: visual question answering
    return (
        "vqa",
        "No special keyword matched — defaulting to visual question answering (VQA)."
    )
