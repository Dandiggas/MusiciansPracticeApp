"""CI must discover function-based API tests as well as Django TestCases."""
import shlex
import subprocess
import sys
from pathlib import Path

import pytest
import yaml


@pytest.mark.parametrize("workflow", ["test.yml", "test-and-deploy.yml"])
def test_backend_workflow_discovers_session_api_tests(workflow):
    root = Path(__file__).resolve().parents[2]
    config = yaml.safe_load((root / ".github" / "workflows" / workflow).read_text())
    steps = config["jobs"]["test-backend"]["steps"]
    test_step = next(step for step in steps if "test" in step.get("name", "").lower())
    command = shlex.split(test_step["run"])
    command[0] = sys.executable
    result = subprocess.run(
        [*command, "--collect-only", "session/tests/test_tracks_api.py"],
        cwd=root, capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "test_tracks_api.py::" in result.stdout
