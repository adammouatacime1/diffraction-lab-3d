"""Create ../design-kit.zip from sources, docs and references (Python 3 standard library)."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
archive = root.parent / "design-kit.zip"
excluded = {"node_modules", "dist", "test-results", ".git", "__pycache__"}
files = sorted(
    path for path in root.rglob("*")
    if path.is_file()
    and not excluded.intersection(path.relative_to(root).parts)
    and path.name != ".DS_Store"
    and path.suffix not in {".log", ".tsbuildinfo", ".pyc", ".zip"}
)
with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as output:
    for path in files:
        output.write(path, str(Path("design-kit") / path.relative_to(root)))
with ZipFile(archive) as output:
    assert output.testzip() is None
    assert len(output.namelist()) == len(files)
print(f"{archive.name}: {len(files)} files, {archive.stat().st_size} bytes")
