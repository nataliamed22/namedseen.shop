"""Builds src/admin/config.yml from tools/cms-config.src.yml.

The source file uses YAML anchors to reuse block definitions; Decap CMS
needs a flat config without helper keys, so this script resolves the
anchors, flattens nested "types" lists and drops keys starting with "_".
Run:  python3 tools/build-cms-config.py
"""
import pathlib, yaml

root = pathlib.Path(__file__).resolve().parent.parent
src = yaml.safe_load((root / "tools/cms-config.src.yml").read_text(encoding="utf-8"))

def flatten(x):
    if isinstance(x, dict):
        out = {}
        for k, v in x.items():
            if k == "types" and isinstance(v, list):
                flat = []
                for item in v:
                    flat.extend(item if isinstance(item, list) else [item])
                v = flat
            out[k] = flatten(v)
        return out
    if isinstance(x, list):
        return [flatten(i) for i in x]
    return x

cfg = {k: v for k, v in src.items() if not k.startswith("_")}
cfg = flatten(cfg)

class NoAliases(yaml.SafeDumper):
    def ignore_aliases(self, data):
        return True

header = "# Згенеровано з tools/cms-config.src.yml — редагуй той файл і запусти tools/build-cms-config.py\n"
(root / "src/admin/config.yml").write_text(
    header + yaml.dump(cfg, Dumper=NoAliases, allow_unicode=True, sort_keys=False, width=1000), encoding="utf-8"
)
print("ok:", [c["name"] for c in cfg["collections"]])
