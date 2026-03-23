#!/usr/bin/env python3
"""
Convert an IBM Cloud account report .mdl file (Python pickle) to JSON.

The .mdl files are trusted first-party output from IBM's reporting tool.
They contain serialized SoftLayer API responses as Python dicts/lists,
with one custom class (SoftLayerListResult, a list subclass).

Usage:
    python3 scripts/mdl-to-json.py <input.mdl> [output.json] [--full]

If output is omitted, writes to <input_basename>.json in the same directory.
By default, strips deeply nested hardware trees to keep output small (~50MB).
Use --full to include all nested data (warning: can produce multi-GB output).
"""

import json
import pickle  # noqa: S403 - trusted first-party .mdl files from IBM reporting tool
import sys
import types
from collections import Counter
from datetime import timedelta, datetime
from pathlib import Path

# --- Mock the SoftLayer module hierarchy ---
# The pickle references SoftLayer.transports.transport.SoftLayerListResult
# which is just a list subclass. We mock it so pickle.load() succeeds.

_sl = types.ModuleType("SoftLayer")
_sl.__path__ = [""]
sys.modules["SoftLayer"] = _sl

_sl_trans = types.ModuleType("SoftLayer.transports")
_sl_trans.__path__ = [""]
sys.modules["SoftLayer.transports"] = _sl_trans
_sl.transports = _sl_trans

_sl_transport = types.ModuleType("SoftLayer.transports.transport")
sys.modules["SoftLayer.transports.transport"] = _sl_transport
_sl_trans.transport = _sl_transport


class SoftLayerListResult(list):
    """Stand-in for the SoftLayer SDK's list subclass."""
    pass


_sl_transport.SoftLayerListResult = SoftLayerListResult

# --- Type suffix to app resource key mapping ---
TYPE_MAP = {
    "baremetal": "bareMetal",
    "virtualguest": "virtualServers",
    "storage": "fileStorage",
    "vlan": "vlans",
    "gateway": "gateways",
    "router": "routers",
    "virtualhost": "virtualHosts",
    "transitGateway": "classicTransitGateways",
    "transitGatewayDevice": "transitGatewayDevices",
    "transitGatewayConnection": "classicTransitGatewayConnections",
    "directLinkTenant": "directLinkGateways",
    "directLinkRouter": "directLinkRouters",
    "directLinkVlan": "directLinkVlans",
    "applicationDeliveryController": "loadBalancers",
}


# Fields to keep per resource type in flat mode.
# These are the fields the app actually uses for display.
FLAT_FIELDS = {
    "bareMetal": {
        "id", "hostname", "domain", "fullyQualifiedDomainName",
        "createDate", "provisionDate", "datacenter", "DatacenterName",
        "processorCoreAmount", "processorPhysicalCoreAmount", "memoryCapacity",
        "motherboard", "operatingSystemReferenceCode", "hardwareFunctionDescription",
        "OS", "PublicIP", "PrivateIP", "PublicVLAN", "PublicVLANid",
        "PrivateVLAN", "PrivateVLANid", "PublicRouter", "PrivateRouter",
        "ID", "TypeAttribute", "location", "notes",
    },
    "gateways": {
        "id", "accountId", "name", "networkSpace", "statusId",
        "createDate", "modifyDate", "groupNumber",
        "privateIpAddressId", "publicIpAddressId",
        "privateVlanId", "publicVlanId", "publicIpv6AddressId",
        "insideVlans", "members", "status", "privateIpAddress", "publicIpAddress",
        "DatacenterName", "location", "ID", "TypeAttribute",
    },
    "virtualServers": {
        "id", "hostname", "domain", "fullyQualifiedDomainName",
        "createDate", "provisionDate", "datacenter", "DatacenterName",
        "maxCpu", "maxCpuUnits", "maxMemory", "localDiskFlag",
        "dedicatedAccountHostOnlyFlag", "operatingSystemReferenceCode",
        "OS", "PublicIP", "PrivateIP", "PublicVLAN", "PublicVLANid",
        "PrivateVLAN", "PrivateVLANid", "PublicRouter", "PrivateRouter",
        "ID", "TypeAttribute", "location", "status", "notes",
        "host", "blockDevices",
    },
}


def make_json_safe(obj, depth=0, max_depth=50):
    """Recursively convert Python objects to JSON-serializable types."""
    if depth > max_depth:
        return str(obj)

    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    if isinstance(obj, timedelta):
        return str(obj)
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="replace")
    if isinstance(obj, (list, SoftLayerListResult)):
        return [make_json_safe(item, depth + 1, max_depth) for item in obj]
    if isinstance(obj, dict):
        return {str(k): make_json_safe(v, depth + 1, max_depth) for k, v in obj.items()}
    # Fallback
    return str(obj)


def flatten_resource(resource: dict, resource_key: str) -> dict:
    """Keep only the fields the app needs, stripping deep nested trees."""
    allowed = FLAT_FIELDS.get(resource_key)
    if not allowed:
        # For types without a specific field list, keep scalar fields only
        result = {}
        for k, v in resource.items():
            if isinstance(v, (str, int, float, bool, type(None))):
                result[k] = make_json_safe(v)
            elif isinstance(v, dict) and k in ("datacenter", "location", "status"):
                # Keep small dicts that provide datacenter/location info
                result[k] = make_json_safe(v, max_depth=3)
        return result

    result = {}
    for k, v in resource.items():
        if k in allowed:
            if isinstance(v, (str, int, float, bool, type(None))):
                result[k] = make_json_safe(v)
            elif isinstance(v, dict):
                # Keep nested dicts but limit depth
                result[k] = make_json_safe(v, max_depth=3)
            elif isinstance(v, (list, SoftLayerListResult)):
                # Keep lists but limit depth
                result[k] = make_json_safe(v, max_depth=3)
    return result


def convert_mdl(input_path: str, output_path: str | None = None, flat: bool = True):
    input_file = Path(input_path)
    if not input_file.exists():
        print(f"Error: {input_file} not found", file=sys.stderr)
        sys.exit(1)

    if output_path is None:
        output_path = str(input_file.with_suffix(".json"))

    print(f"Loading {input_file} ({input_file.stat().st_size / 1024 / 1024:.1f} MB)...")
    sys.setrecursionlimit(50000)

    with open(input_file, "rb") as f:
        # Trusted first-party file from IBM reporting tool, not arbitrary user input
        data = pickle.load(f)  # noqa: S301

    # Build output structure
    output = {}

    # Account info
    if "account" in data and isinstance(data["account"], dict):
        output["account"] = make_json_safe(data["account"])

    # Group inventory by TypeAttribute
    if "inventory" in data and isinstance(data["inventory"], dict):
        grouped = {}
        type_counts = Counter()

        for key, resource in data["inventory"].items():
            if not isinstance(resource, dict):
                continue

            type_attr = resource.get("TypeAttribute", "")
            if not type_attr:
                # Fallback: extract from key suffix
                parts = key.rsplit("_", 1)
                type_attr = parts[1] if len(parts) == 2 else "unknown"

            resource_key = TYPE_MAP.get(type_attr, type_attr)
            if resource_key not in grouped:
                grouped[resource_key] = []

            if flat:
                grouped[resource_key].append(flatten_resource(resource, resource_key))
            else:
                grouped[resource_key].append(make_json_safe(resource))
            type_counts[resource_key] += 1

        output.update(grouped)

    # Additional top-level collections
    for key in ("tickets", "certificates", "zones", "storageLimits"):
        if key in data and isinstance(data[key], (list, dict)):
            safe = make_json_safe(data[key])
            if safe:  # Skip empty collections
                output[key] = safe

    # Metadata
    if "ibmConfidential" in data:
        output["_ibmConfidential"] = data["ibmConfidential"]
    if "duration" in data:
        output["_collectionDuration"] = str(data["duration"])

    # Write JSON
    print(f"Writing {output_path}...")
    with open(output_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    output_size = Path(output_path).stat().st_size / 1024 / 1024

    # Print summary
    print(f"\nConversion complete: {output_size:.1f} MB")
    print(f"\nResource counts:")
    for key in sorted(output.keys()):
        if key.startswith("_"):
            continue
        val = output[key]
        if isinstance(val, list):
            print(f"  {key}: {len(val)}")
        elif isinstance(val, dict) and key == "account":
            print(f"  {key}: {len(val)} fields")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__.strip())
        sys.exit(1)

    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    use_full = "--full" in sys.argv

    convert_mdl(
        args[0],
        args[1] if len(args) > 1 else None,
        flat=not use_full,
    )
