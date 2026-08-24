"""
trace_logger.py
Builds the execution trace JSON returned alongside every query response.
This gives the frontend the "how I got this answer" story.
"""
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
import time


@dataclass
class TraceStep:
    step: str
    detail: str
    status: str = "ok"  # "ok" | "warn" | "error"
    duration_ms: Optional[float] = None


@dataclass
class QueryTrace:
    task_type: str
    model_used: str
    steps: List[TraceStep] = field(default_factory=list)
    _start_ts: float = field(default_factory=time.time, repr=False, compare=False)

    def add_step(self, step: str, detail: str, status: str = "ok", duration_ms: float = None):
        self.steps.append(TraceStep(step=step, detail=detail, status=status, duration_ms=duration_ms))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_type": self.task_type,
            "model_used": self.model_used,
            "total_elapsed_ms": round((time.time() - self._start_ts) * 1000, 1),
            "steps": [asdict(s) for s in self.steps],
        }


def build_trace(task_type: str, model_used: str) -> QueryTrace:
    """Factory to create a fresh QueryTrace for a request."""
    return QueryTrace(task_type=task_type, model_used=model_used)
