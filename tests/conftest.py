import pytest
from fastapi.testclient import TestClient
from copy import deepcopy
from pathlib import Path
import importlib.util


# Load the application module directly from src/app.py
spec = importlib.util.spec_from_file_location(
    "app_module",
    Path(__file__).parent.parent / "src" / "app.py",
)
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)


@pytest.fixture
def client():
    return TestClient(app_module.app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset the in-memory `activities` dict around each test."""
    original = deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(deepcopy(original))
