from dataclasses import dataclass
import numpy.typing as npt


@dataclass
class Contour:
    segments: npt.NDArray[int]
    center: npt.NDArray[int]
    intensity: float